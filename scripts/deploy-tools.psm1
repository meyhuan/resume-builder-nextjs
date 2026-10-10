$ErrorActionPreference = "Stop"

function Remove-DeployDirectory {
    param([string]$Path, [string]$Root)
    $fullRoot = [IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    $fullPath = [IO.Path]::GetFullPath($Path)
    if (-not $fullPath.StartsWith($fullRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove directory outside $fullRoot"
    }
    if (Test-Path -LiteralPath $fullPath) {
        Remove-Item -LiteralPath $fullPath -Recurse -Force
    }
}

function New-DeployZip {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination,
        [ValidateSet("Fastest", "Optimal")][string]$Compression = "Optimal",
        [ValidateSet("Auto", "DotNet", "SevenZip")][string]$Tool = "Auto"
    )
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path -LiteralPath $Destination) {
        Remove-Item -LiteralPath $Destination -Force
    }
    $sevenZip = Get-Command 7z -ErrorAction SilentlyContinue
    if ($Tool -eq "SevenZip" -and -not $sevenZip) { throw "7-Zip is not installed" }
    if ($Tool -eq "SevenZip" -or ($Tool -eq "Auto" -and $sevenZip)) {
        $level = if ($Compression -eq "Fastest") { "-mx=1" } else { "-mx=5" }
        & $sevenZip.Source a -tzip $level -bso0 -bsp0 ([IO.Path]::GetFullPath($Destination)) (Join-Path ([IO.Path]::GetFullPath($Source)) "*")
        if ($LASTEXITCODE -ne 0) { throw "7-Zip failed with exit code $LASTEXITCODE" }
        return
    }
    [IO.Compression.ZipFile]::CreateFromDirectory(
        [IO.Path]::GetFullPath($Source),
        [IO.Path]::GetFullPath($Destination),
        [IO.Compression.CompressionLevel]::$Compression,
        $false
    )
}

function Get-DeployCacheIdentity {
    param([string]$ProjectRoot)
    $commonDir = & git -C $ProjectRoot rev-parse --git-common-dir 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Cannot determine shared repository cache directory" }
    if (-not [IO.Path]::IsPathRooted($commonDir)) {
        $commonDir = Join-Path $ProjectRoot $commonDir
    }
    $identity = [IO.Path]::GetFullPath($commonDir).ToLowerInvariant()
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($identity)))).Replace('-', '').Substring(0, 16).ToLowerInvariant()
    } finally { $sha.Dispose() }
}

function Get-DeployBuildCacheKey {
    param([string]$ProjectRoot)
    $runtime = & node -p "process.platform + '-' + process.arch + '-' + process.version"
    if ($LASTEXITCODE -ne 0) { throw "Cannot determine Node.js runtime for build cache" }
    $inputs = @("compiler-cache-v1", $runtime)
    foreach ($file in @(
        "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc",
        "next.config.ts", "next.config.js", "next.config.mjs", "tsconfig.json",
        "postcss.config.js", "postcss.config.mjs", "tailwind.config.ts", "prisma/schema.prisma",
        ".env", ".env.local", ".env.production", ".env.production.local"
    )) {
        $path = Join-Path $ProjectRoot $file
        if (Test-Path -LiteralPath $path -PathType Leaf) {
            $inputs += "$file=$((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash)"
        }
    }
    # Only hashes are retained; environment values are never written to a manifest.
    foreach ($entry in (Get-ChildItem Env: | Where-Object {
        $_.Name -match '^(NEXT_|NODE_ENV$|NODE_OPTIONS$|ALIYUN_OSS_HOSTNAME$|INDEXNOW_KEY$)'
    } | Sort-Object Name)) {
        $inputs += "$($entry.Name)=$($entry.Value)"
    }
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes(($inputs -join "`n"))))).Replace('-', '').ToLowerInvariant()
    } finally { $sha.Dispose() }
}

function Copy-DeployCompilerCache {
    param([string]$Source, [string]$Destination)
    # Never restore fetch-cache, prerendered pages, images, or dev session state.
    foreach ($name in @("webpack", "swc")) {
        $sourcePath = Join-Path $Source $name
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) { continue }
        $destinationPath = Join-Path $Destination $name
        $null = New-Item -ItemType Directory -Path $destinationPath -Force
        & robocopy $sourcePath $destinationPath /E /NFL /NDL /NJH /NJS /NP
        if ($LASTEXITCODE -gt 7) { throw "Compiler cache copy failed ($LASTEXITCODE)" }
    }
}

Export-ModuleMember -Function Remove-DeployDirectory, New-DeployZip, Get-DeployCacheIdentity, Get-DeployBuildCacheKey, Copy-DeployCompilerCache
