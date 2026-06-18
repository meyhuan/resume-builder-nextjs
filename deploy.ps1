param(
    [switch]$SkipBuild,
    [switch]$RemoteOnly,
    [switch]$KeepPackage,
    [string]$HostAlias = "ajl-prod",
    [string]$ServerDir = "/home/webapp/aijianli-nextjs/resume-builder-nextjs",
    [string]$ReleaseRoot = "/home/releases/aijianli-nextjs",
    [string]$ReleaseId
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [int[]]$SuccessExitCodes = @(0)
    )

    & $FilePath @Arguments
    $exitCode = $LASTEXITCODE
    if ($SuccessExitCodes -notcontains $exitCode) {
        throw "$FilePath failed with exit code $exitCode"
    }
}

function Copy-Tree {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination,
        [string[]]$ExcludeDirectories = @()
    )

    if (-not (Test-Path -LiteralPath $Source)) {
        return
    }

    $args = @($Source, $Destination, "/E")
    if ($ExcludeDirectories.Count -gt 0) {
        $args += "/XD"
        $args += $ExcludeDirectories
    }

    Invoke-Native -FilePath "robocopy" -Arguments $args -SuccessExitCodes (0..7)
}

function Get-ReleaseId {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $sha = "local"
    try {
        $candidate = (& git rev-parse --short HEAD 2>$null).Trim()
        if ($candidate) {
            $sha = $candidate
        }
    } catch {
        $sha = "local"
    }

    return "$timestamp-$sha"
}

if (-not $ReleaseId) {
    $ReleaseId = Get-ReleaseId
}

$DeployZip = Join-Path $PSScriptRoot "deploy.zip"
$StageDir = Join-Path $PSScriptRoot "deploy_stage"
$IncomingDir = "$ReleaseRoot/.incoming"
$RemotePackage = "$IncomingDir/$ReleaseId.zip"
$RemoteDeployScript = "$ReleaseRoot/deploy.sh"

Write-Host "Next.js release id: $ReleaseId" -ForegroundColor Cyan

if ($RemoteOnly) {
    Write-Host "Remote-only mode: expecting package at $RemotePackage" -ForegroundColor Yellow
} elseif (-not $SkipBuild) {
    Write-Host "Building Next.js locally..." -ForegroundColor Cyan
    Invoke-Native -FilePath "pnpm" -Arguments @("run", "build")
    Write-Host "Build completed." -ForegroundColor Green
} else {
    Write-Host "Skip local build; deploy existing build output..." -ForegroundColor Yellow
}

try {
    if (-not $RemoteOnly) {
        Write-Host "Packaging deploy files..." -ForegroundColor Cyan

        if (Test-Path -LiteralPath $DeployZip) {
            Remove-Item -LiteralPath $DeployZip -Force
        }
        if (Test-Path -LiteralPath $StageDir) {
            Remove-Item -LiteralPath $StageDir -Recurse -Force
        }

        New-Item -ItemType Directory -Path $StageDir | Out-Null

        Copy-Tree -Source ".next" -Destination (Join-Path $StageDir ".next") -ExcludeDirectories @("cache")
        Copy-Tree -Source "public" -Destination (Join-Path $StageDir "public")
        Copy-Tree -Source "prisma" -Destination (Join-Path $StageDir "prisma")

        foreach ($file in @("package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "next.config.ts", "next.config.mjs", "next.config.js")) {
            if (Test-Path -LiteralPath $file) {
                Copy-Item -LiteralPath $file -Destination (Join-Path $StageDir $file) -Force
            }
        }

        $metadata = @"
release_id=$ReleaseId
commit=$(try { (& git rev-parse HEAD 2>$null).Trim() } catch { "unknown" })
created_at=$(Get-Date -Format o)
service=aijianli-nextjs
"@
        Set-Content -LiteralPath (Join-Path $StageDir "RELEASE") -Value $metadata -Encoding ASCII

        Compress-Archive -Path (Join-Path $StageDir "*") -DestinationPath $DeployZip -Force
        Write-Host "Package created: $DeployZip" -ForegroundColor Green

        Write-Host "Ensuring remote incoming directory exists: ${HostAlias}:${IncomingDir}" -ForegroundColor Cyan
        Invoke-Native -FilePath "ssh" -Arguments @($HostAlias, "mkdir -p '$IncomingDir'")

        Write-Host "Uploading package to $RemotePackage..." -ForegroundColor Cyan
        Invoke-Native -FilePath "scp" -Arguments @($DeployZip, "${HostAlias}:${RemotePackage}")
        Write-Host "Package uploaded." -ForegroundColor Green
    }

    Write-Host "Uploading latest deploy.sh..." -ForegroundColor Cyan
    Invoke-Native -FilePath "ssh" -Arguments @($HostAlias, "mkdir -p '$ReleaseRoot'")
    Invoke-Native -FilePath "scp" -Arguments @((Join-Path $PSScriptRoot "deploy.sh"), "${HostAlias}:${RemoteDeployScript}")
    Write-Host "deploy.sh uploaded." -ForegroundColor Green

    Write-Host "Running remote release deploy..." -ForegroundColor Cyan
    $remoteCommand = "sed -i 's/\r`$//' '$RemoteDeployScript' && chmod +x '$RemoteDeployScript' && RELEASE_ID='$ReleaseId' PACKAGE_PATH='$RemotePackage' LEGACY_DIR='$ServerDir' RELEASE_ROOT='$ReleaseRoot' bash -x '$RemoteDeployScript'"
    Invoke-Native -FilePath "ssh" -Arguments @($HostAlias, $remoteCommand)
    Write-Host "Remote deploy completed." -ForegroundColor Green
} finally {
    if (Test-Path -LiteralPath $StageDir) {
        Remove-Item -LiteralPath $StageDir -Recurse -Force
    }

    if ((-not $RemoteOnly) -and (-not $KeepPackage) -and (Test-Path -LiteralPath $DeployZip)) {
        Remove-Item -LiteralPath $DeployZip -Force
    }
}
