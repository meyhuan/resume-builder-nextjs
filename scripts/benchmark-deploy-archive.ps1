param(
    [string]$Source,
    [string]$OutputDirectory = (Join-Path $env:TEMP "aijianli-archive-benchmark-$([Guid]::NewGuid().ToString('N'))"),
    [double]$UploadMegabytesPerSecond = 0
)

$ErrorActionPreference = "Stop"
Import-Module (Join-Path $PSScriptRoot "deploy-tools.psm1") -Force
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $OutputDirectory) { throw "Choose a new benchmark output directory" }
$null = New-Item -ItemType Directory -Path $OutputDirectory

if (-not $Source) {
    $Source = Join-Path $OutputDirectory "snapshot"
    $null = New-Item -ItemType Directory -Path $Source
    foreach ($directory in @(".next", "public", "prisma")) {
        $path = Join-Path $ProjectRoot $directory
        if (-not (Test-Path -LiteralPath $path)) { throw "Missing benchmark input: $path" }
        $arguments = @($path, (Join-Path $Source $directory), "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")
        if ($directory -eq ".next") { $arguments += @("/XD", "cache") }
        & robocopy @arguments
        if ($LASTEXITCODE -gt 7) { throw "Snapshot copy failed" }
    }
    foreach ($file in @("package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "next.config.ts", "next.config.mjs", "next.config.js")) {
        $path = Join-Path $ProjectRoot $file
        if (Test-Path -LiteralPath $path) { Copy-Item -LiteralPath $path -Destination $Source }
    }
    Set-Content -LiteralPath (Join-Path $Source "RELEASE") -Value 'service=archive-benchmark-not-for-deployment' -Encoding ASCII
}
$Source = [IO.Path]::GetFullPath($Source).TrimEnd('\', '/')
$files = @(Get-ChildItem -LiteralPath $Source -Recurse -Force -File)
$sourceHashes = @{}
foreach ($file in $files) {
    $relative = $file.FullName.Substring($Source.Length + 1).Replace('\', '/')
    $sourceHashes[$relative] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
}

function Test-ArchiveContents {
    param([string]$Path)
    $archive = [IO.Compression.ZipFile]::OpenRead($Path)
    $seen = @{}
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        foreach ($entry in $archive.Entries) {
            $name = $entry.FullName.Replace('\', '/')
            if ($name.EndsWith('/')) { continue }
            if (-not $sourceHashes.ContainsKey($name) -or $seen.ContainsKey($name)) { return $false }
            $stream = $entry.Open()
            try { $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '') } finally { $stream.Dispose() }
            if ($hash -ne $sourceHashes[$name]) { return $false }
            $seen[$name] = $true
        }
        return $seen.Count -eq $sourceHashes.Count
    } finally { $sha.Dispose(); $archive.Dispose() }
}

$methods = @("dotnet-fastest", "dotnet-optimal", "compress-archive")
if (Get-Command 7z -ErrorAction SilentlyContinue) { $methods += @("7zip-fast", "7zip-optimal") }
$results = [Collections.Generic.List[object]]::new()
foreach ($method in $methods) {
    Write-Host "Benchmarking $method on $($files.Count) files..." -ForegroundColor Cyan
    $destination = Join-Path $OutputDirectory "$method.zip"
    $timer = [Diagnostics.Stopwatch]::StartNew()
    switch ($method) {
        "dotnet-fastest" { New-DeployZip $Source $destination Fastest DotNet }
        "dotnet-optimal" { New-DeployZip $Source $destination Optimal DotNet }
        "compress-archive" { Compress-Archive -Path (Join-Path $Source "*") -DestinationPath $destination }
        "7zip-fast" {
            & 7z a -tzip -mx=1 -bso0 -bsp0 $destination "$Source\*"
            if ($LASTEXITCODE -ne 0) { throw "7-Zip failed" }
        }
        "7zip-optimal" { New-DeployZip $Source $destination Optimal SevenZip }
    }
    $timer.Stop()
    $bytes = (Get-Item -LiteralPath $destination).Length
    $estimatedTotal = $null
    if ($UploadMegabytesPerSecond -gt 0) { $estimatedTotal = [Math]::Round($timer.Elapsed.TotalSeconds + $bytes / 1MB / $UploadMegabytesPerSecond, 3) }
    $result = [pscustomobject]@{
        method = $method; seconds = [Math]::Round($timer.Elapsed.TotalSeconds, 3)
        bytes = $bytes; contentsMatch = (Test-ArchiveContents $destination)
        estimatedPackAndUploadSeconds = $estimatedTotal
    }
    $results.Add($result)
    $result | Format-Table -AutoSize | Out-Host
    [ordered]@{
        source = $Source; files = $files.Count; inputBytes = ($files | Measure-Object Length -Sum).Sum
        productionBuild = (Test-Path -LiteralPath (Join-Path $Source ".next/BUILD_ID"))
        uploadMegabytesPerSecond = $UploadMegabytesPerSecond; results = @($results.ToArray())
    } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutputDirectory "benchmark.json") -Encoding UTF8
}
if ($results.contentsMatch -contains $false) { throw "At least one archive differs from the source; see benchmark.json" }
Write-Host "Benchmark report: $(Join-Path $OutputDirectory 'benchmark.json')"
