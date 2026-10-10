param(
    [switch]$SkipBuild,
    [switch]$RemoteOnly,
    [switch]$KeepPackage,
    [switch]$PackageOnly,
    [switch]$DisableBuildCache,
    [ValidateSet("Fastest", "Optimal")][string]$Compression = "Optimal",
    [ValidateSet("Auto", "DotNet", "SevenZip")][string]$ArchiveTool = "Auto",
    [string]$CacheRoot,
    [string]$LogDirectory,
    [string]$HostAlias = "ajl-prod",
    [string]$ServerDir = "/home/webapp/aijianli-nextjs/resume-builder-nextjs",
    [string]$ReleaseRoot = "/home/releases/aijianli-nextjs",
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_-]*$')][string]$ReleaseId,
    [ValidatePattern('^[a-fA-F0-9]{64}$')][string]$PackageSha256
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
Import-Module (Join-Path $PSScriptRoot "scripts/deploy-tools.psm1") -Force
if ($RemoteOnly -and $PackageOnly) { throw "RemoteOnly and PackageOnly cannot be combined" }

function Invoke-Stage {
    param([string]$Name, [scriptblock]$Action)
    $timer = [Diagnostics.Stopwatch]::StartNew()
    $stageStatus = "failed"
    Write-Host "[$Name] starting" -ForegroundColor Cyan
    try {
        & $Action
        $stageStatus = "success"
    } finally {
        $timer.Stop()
        $script:Stages.Add([pscustomobject]@{
            name = $Name; seconds = [Math]::Round($timer.Elapsed.TotalSeconds, 3); status = $stageStatus
        })
        Write-Host "[$Name] $stageStatus in $([Math]::Round($timer.Elapsed.TotalSeconds, 1))s"
    }
}

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

    $args = @($Source, $Destination, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")
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
$localRoot = Join-Path $env:LOCALAPPDATA "Aijianli/deploy/$(Get-DeployCacheIdentity $PSScriptRoot)"
if (-not $CacheRoot) { $CacheRoot = Join-Path $localRoot "cache" }
if (-not $LogDirectory) { $LogDirectory = Join-Path $localRoot "logs" }
$CacheRoot = [IO.Path]::GetFullPath($CacheRoot)
$null = New-Item -ItemType Directory -Path $LogDirectory -Force
$LogPath = Join-Path $LogDirectory "$ReleaseId.json"
$Stages = [Collections.Generic.List[object]]::new()
$TotalTimer = [Diagnostics.Stopwatch]::StartNew()
$StartedAt = (Get-Date).ToUniversalTime().ToString("o")
$Status = "failed"
$PackageBytes = $null
$CacheKey = $null
$CacheHit = $false
$CacheLock = $null
$OwnsCacheLock = $false
$StagingStarted = $false
$Commit = (& git rev-parse HEAD).Trim()
$ResolvedArchiveTool = $ArchiveTool
if ($ArchiveTool -eq "Auto") {
    $ResolvedArchiveTool = if (Get-Command 7z -ErrorAction SilentlyContinue) { "SevenZip" } else { "DotNet" }
}

Write-Host "Next.js release id: $ReleaseId" -ForegroundColor Cyan

try {
    if ($RemoteOnly) {
        Write-Host "Remote-only mode: expecting package at $RemotePackage" -ForegroundColor Yellow
    } elseif (-not $SkipBuild) {
        Write-Host "Building Next.js locally..." -ForegroundColor Cyan
        if (-not $DisableBuildCache) {
            $CacheKey = Get-DeployBuildCacheKey $PSScriptRoot
            $CacheDirectory = Join-Path $CacheRoot $CacheKey
            $CacheLock = [Threading.Mutex]::new($false, "Local\AijianliBuildCache$CacheKey")
            try { $OwnsCacheLock = $CacheLock.WaitOne(0) } catch [Threading.AbandonedMutexException] { $OwnsCacheLock = $true }
            if (-not $OwnsCacheLock) { throw "Build cache is in use; retry later or use DisableBuildCache" }
            Invoke-Stage "cache-restore" {
                if (Test-Path -LiteralPath (Join-Path $CacheDirectory "complete")) {
                    Copy-DeployCompilerCache $CacheDirectory (Join-Path $PSScriptRoot ".next/cache")
                    $script:CacheHit = $true
                }
                Write-Host "Compiler cache hit: $script:CacheHit"
            }
        }
        Invoke-Stage "build" { Invoke-Native -FilePath "pnpm" -Arguments @("run", "build") }
        if (-not $DisableBuildCache) {
            Invoke-Stage "cache-save" {
                Remove-DeployDirectory $CacheDirectory $CacheRoot
                $null = New-Item -ItemType Directory -Path $CacheDirectory -Force
                Copy-DeployCompilerCache (Join-Path $PSScriptRoot ".next/cache") $CacheDirectory
                Set-Content -LiteralPath (Join-Path $CacheDirectory "complete") -Value $CacheKey -Encoding ASCII
            }
        }
        Write-Host "Build completed." -ForegroundColor Green
    } else {
        Write-Host "Skip local build; deploy existing build output..." -ForegroundColor Yellow
    }

    if (-not $RemoteOnly) {
        if (-not (Test-Path -LiteralPath ".next/BUILD_ID" -PathType Leaf)) {
            throw "Missing .next/BUILD_ID; a successful production build is required"
        }
        Write-Host "Packaging deploy files..." -ForegroundColor Cyan
        Invoke-Stage "stage-files" {
            $script:StagingStarted = $true
            Remove-DeployDirectory $StageDir $PSScriptRoot
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
        }
        Invoke-Stage "compress" {
            Write-Host "Archive tool: $ResolvedArchiveTool; compression: $Compression"
            New-DeployZip $StageDir $DeployZip $Compression $ResolvedArchiveTool
        }
        Invoke-Stage "package-hash" {
            $script:PackageSha256 = (Get-FileHash -LiteralPath $DeployZip -Algorithm SHA256).Hash.ToLowerInvariant()
            $script:PackageBytes = (Get-Item -LiteralPath $DeployZip).Length
            Write-Host "ZIP: $script:PackageBytes bytes; SHA256: $script:PackageSha256"
        }
        Write-Host "Package created: $DeployZip" -ForegroundColor Green
        if ($PackageOnly) {
            $Status = "packaged"
        } else {
            Invoke-Stage "upload-package" {
                Write-Host "Ensuring remote incoming directory exists: ${HostAlias}:${IncomingDir}" -ForegroundColor Cyan
                Invoke-Native -FilePath "ssh" -Arguments @($HostAlias, "mkdir -p '$IncomingDir'")

                Write-Host "Uploading package to $RemotePackage..." -ForegroundColor Cyan
                Invoke-Native -FilePath "scp" -Arguments @($DeployZip, "${HostAlias}:${RemotePackage}")
                Write-Host "Package uploaded." -ForegroundColor Green
            }
        }
    }
    if (-not $PackageOnly) {
        Invoke-Stage "upload-script" {
            Write-Host "Uploading latest deploy.sh..." -ForegroundColor Cyan
            Invoke-Native -FilePath "ssh" -Arguments @($HostAlias, "mkdir -p '$ReleaseRoot'")
            Invoke-Native -FilePath "scp" -Arguments @((Join-Path $PSScriptRoot "deploy.sh"), "${HostAlias}:${RemoteDeployScript}")
            Write-Host "deploy.sh uploaded." -ForegroundColor Green
        }
        Invoke-Stage "remote-deploy" {
            Write-Host "Running remote release deploy..." -ForegroundColor Cyan
            $remoteCommand = "sed -i 's/\r`$//' '$RemoteDeployScript' && chmod +x '$RemoteDeployScript' && RELEASE_ID='$ReleaseId' PACKAGE_PATH='$RemotePackage' PACKAGE_SHA256='$PackageSha256' LEGACY_DIR='$ServerDir' RELEASE_ROOT='$ReleaseRoot' bash '$RemoteDeployScript'"
            Invoke-Native -FilePath "ssh" -Arguments @($HostAlias, $remoteCommand)
            Write-Host "Remote deploy completed." -ForegroundColor Green
        }
        $Status = "deployed"
    }
} finally {
    try {
        Invoke-Stage "local-cleanup" {
            if ($StagingStarted) { Remove-DeployDirectory $StageDir $PSScriptRoot }
            # Failed uploads and package-only artifacts remain available for retry.
            if ($Status -eq "deployed" -and -not $RemoteOnly -and -not $KeepPackage -and (Test-Path -LiteralPath $DeployZip)) {
                Remove-Item -LiteralPath $DeployZip -Force
            }
        }
    } finally {
        if ($OwnsCacheLock) { $CacheLock.ReleaseMutex() }
        if ($CacheLock) { $CacheLock.Dispose() }
        $TotalTimer.Stop()
        $report = [ordered]@{
            releaseId = $ReleaseId; commit = $(if ($RemoteOnly) { $null } else { $Commit })
            localCommit = $Commit; status = $Status; startedAt = $StartedAt
            totalSeconds = [Math]::Round($TotalTimer.Elapsed.TotalSeconds, 3)
            compression = $Compression; archiveTool = $ResolvedArchiveTool; packageBytes = $PackageBytes; packageSha256 = $PackageSha256
            cacheHit = $CacheHit; cacheKey = $CacheKey; stages = @($Stages.ToArray())
        }
        $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $LogPath -Encoding UTF8
        Write-Host "Release status: $Status; timing report: $LogPath" -ForegroundColor Cyan
        $Stages | Format-Table name, seconds, status -AutoSize | Out-Host
    }
}
