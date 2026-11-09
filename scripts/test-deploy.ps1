param([string]$OutputRoot = (Join-Path $env:TEMP "aijianli-deploy-tests-$([Guid]::NewGuid().ToString('N'))"))

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
Import-Module (Join-Path $PSScriptRoot "deploy-tools.psm1") -Force
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
$null = New-Item -ItemType Directory -Path $OutputRoot -Force
$OriginalLocation = Get-Location
$Passed = 0

function Assert-Deploy {
    param([bool]$Condition, [string]$Description)
    if (-not $Condition) { throw "FAILED: $Description" }
    $script:Passed++
    Write-Host "PASS: $Description"
}

function Write-Fixture {
    param([string]$Path, [string]$Content)
    $null = New-Item -ItemType Directory -Path (Split-Path $Path -Parent) -Force
    Set-Content -LiteralPath $Path -Value $Content -Encoding ASCII
}

$Fixture = Join-Path $OutputRoot "project"
$Cache = Join-Path $OutputRoot "cache"
$Logs = Join-Path $OutputRoot "logs"
$null = New-Item -ItemType Directory -Path (Join-Path $Fixture "scripts") -Force
Copy-Item -LiteralPath (Join-Path $ProjectRoot "deploy.ps1") -Destination $Fixture
Copy-Item -LiteralPath (Join-Path $ProjectRoot "deploy.sh") -Destination $Fixture
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "deploy-tools.psm1") -Destination (Join-Path $Fixture "scripts")
Write-Fixture (Join-Path $Fixture "package.json") '{"name":"deploy-fixture","private":true}'
Write-Fixture (Join-Path $Fixture "pnpm-lock.yaml") 'lockfileVersion: 9'
Write-Fixture (Join-Path $Fixture "public/libs/pdfjs/pdf.js") 'PDF asset'
Write-Fixture (Join-Path $Fixture "prisma/schema.prisma") 'fixture'
Write-Fixture (Join-Path $Fixture ".env") 'SECRET=fixture-only'
& git -C $Fixture init -q
& git -C $Fixture add package.json
& git -C $Fixture -c user.name=DeployTests -c user.email=deploy-tests@example.invalid commit -qm fixture
if ($LASTEXITCODE -ne 0) { throw "Cannot initialize fixture repository" }

$global:DeployTestNetworkCalls = [Collections.Generic.List[object]]::new()
$global:DeployTestBuildFails = $false
$global:DeployTestUploadFails = $false
$global:DeployTestBuildCalls = 0
$global:DeployTestCacheRestored = $false
$OriginalPackagePath = $env:PACKAGE_PATH
$OriginalTargetDir = $env:TARGET_DIR
$OriginalPackageSha256 = $env:PACKAGE_SHA256
function global:ssh {
    $global:DeployTestNetworkCalls.Add(@($args))
    $global:LASTEXITCODE = 0
}
function global:scp {
    $global:DeployTestNetworkCalls.Add(@($args))
    if ($global:DeployTestUploadFails) { $global:LASTEXITCODE = 1 } else { $global:LASTEXITCODE = 0 }
}
function global:pnpm {
    $global:DeployTestBuildCalls++
    $global:DeployTestCacheRestored = Test-Path -LiteralPath ".next/cache/webpack/client-production/cache.pack"
    if ($global:DeployTestBuildFails) { $global:LASTEXITCODE = 1; return }
    Write-Fixture (Join-Path (Get-Location) ".next/BUILD_ID") 'fixture-build'
    Write-Fixture (Join-Path (Get-Location) ".next/static/app.js") 'app bundle'
    Write-Fixture (Join-Path (Get-Location) ".next/cache/webpack/client-production/cache.pack") 'compiler cache'
    Write-Fixture (Join-Path (Get-Location) ".next/cache/swc/compiler.bin") 'swc cache'
    Write-Fixture (Join-Path (Get-Location) ".next/cache/fetch-cache/private.json") 'private response'
    $global:LASTEXITCODE = 0
}

try {
    $alternateWorktree = Join-Path $OutputRoot "alternate-worktree"
    & git -C $Fixture worktree add --quiet --detach $alternateWorktree
    if ($LASTEXITCODE -ne 0) { throw "Cannot create fixture worktree" }
    Assert-Deploy ((Get-DeployCacheIdentity $Fixture) -eq (Get-DeployCacheIdentity $alternateWorktree)) "worktrees share repository cache identity"
    $key1 = Get-DeployBuildCacheKey $Fixture
    Assert-Deploy ($key1 -eq (Get-DeployBuildCacheKey $Fixture)) "cache key is stable"
    Write-Fixture (Join-Path $Fixture ".env") 'SECRET=changed-fixture-only'
    $key2 = Get-DeployBuildCacheKey $Fixture
    Assert-Deploy ($key1 -ne $key2) "environment changes invalidate cache"
    Write-Fixture (Join-Path $Fixture "pnpm-lock.yaml") 'lockfileVersion: changed'
    Assert-Deploy ($key2 -ne (Get-DeployBuildCacheKey $Fixture)) "dependency changes invalidate cache"

    & (Join-Path $Fixture "deploy.ps1") -PackageOnly -CacheRoot $Cache -LogDirectory $Logs -ReleaseId test-first
    $report = Get-Content -Raw (Join-Path $Logs "test-first.json") | ConvertFrom-Json
    Assert-Deploy ($report.status -eq "packaged" -and -not $report.cacheHit) "first build records cache miss and package status"
    Assert-Deploy ($global:DeployTestNetworkCalls.Count -eq 0) "PackageOnly never invokes SSH or SCP"
    Assert-Deploy ($report.stages.name -contains "compress" -and $report.stages.name -contains "build") "timings include build and compression"
    Assert-Deploy ($report.packageSha256 -eq (Get-FileHash (Join-Path $Fixture "deploy.zip")).Hash.ToLowerInvariant()) "package SHA256 matches report"
    Assert-Deploy (-not (Test-Path (Join-Path $Fixture "deploy_stage"))) "staging directory is cleaned"

    $zip = [IO.Compression.ZipFile]::OpenRead((Join-Path $Fixture "deploy.zip"))
    try {
        $names = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
        Assert-Deploy ($names -contains ".next/BUILD_ID" -and $names -contains ".next/static/app.js") "ZIP includes dot directory build output"
        Assert-Deploy ($names -contains "public/libs/pdfjs/pdf.js" -and $names -contains "RELEASE") "ZIP includes runtime assets and version metadata"
        Assert-Deploy (-not ($names | Where-Object { $_ -match '^\.next/cache/|(^|/)\.env' })) "ZIP excludes compiler cache and environment files"
        $entry = $zip.Entries | Where-Object { $_.FullName.Replace('\', '/') -eq ".next/static/app.js" }
        $reader = [IO.StreamReader]::new($entry.Open())
        try { Assert-Deploy ($reader.ReadToEnd().Trim() -eq "app bundle") "ZIP preserves file contents" } finally { $reader.Dispose() }
    } finally { $zip.Dispose() }

    $remoteSource = Get-Content -Raw (Join-Path $ProjectRoot "deploy.sh")
    $extractor = [regex]::Match($remoteSource, "(?s)python3 - <<'PY'\r?\n(.*?)\r?\nPY").Groups[1].Value
    Assert-Deploy (-not [string]::IsNullOrWhiteSpace($extractor)) "remote ZIP extractor is available for compatibility test"
    $env:PACKAGE_PATH = Join-Path $Fixture "deploy.zip"
    $env:TARGET_DIR = Join-Path $OutputRoot "extracted"
    $null = New-Item -ItemType Directory -Path $env:TARGET_DIR
    $extractor | & python3 -
    Assert-Deploy ($LASTEXITCODE -eq 0 -and (Get-Content (Join-Path $env:TARGET_DIR ".next/static/app.js")) -eq "app bundle") "server Python extractor accepts generated ZIP"
    $unsafeZip = Join-Path $OutputRoot "unsafe.zip"
    $archive = [IO.Compression.ZipFile]::Open($unsafeZip, [IO.Compression.ZipArchiveMode]::Create)
    try { $null = $archive.CreateEntry("../escaped.txt") } finally { $archive.Dispose() }
    $env:PACKAGE_PATH = $unsafeZip
    # Native stderr is expected here; capture it without converting it to a terminating error.
    $ErrorActionPreference = "Continue"
    $extractor | & python3 - 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"
    Assert-Deploy ($LASTEXITCODE -ne 0 -and -not (Test-Path (Join-Path $OutputRoot "escaped.txt"))) "server extractor rejects path traversal"

    $remoteHelpers = $remoteSource.Substring(0, $remoteSource.IndexOf("capture_legacy_baseline()"))
    $helpersPath = Join-Path $OutputRoot "remote-helpers.sh"
    Write-Fixture $helpersPath ($remoteHelpers.Replace("`r`n", "`n") + "`nrun_stage verify verify_package`n")
    $env:PACKAGE_PATH = (Join-Path $Fixture "deploy.zip").Replace('\', '/')
    $env:PACKAGE_SHA256 = $report.packageSha256
    & bash $helpersPath
    Assert-Deploy ($LASTEXITCODE -eq 0) "server checksum accepts matching package"
    $env:PACKAGE_SHA256 = '0' * 64
    $ErrorActionPreference = "Continue"
    & bash $helpersPath 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"
    Assert-Deploy ($LASTEXITCODE -ne 0) "server checksum rejects corrupted or mismatched package"
    Write-Fixture $helpersPath ($remoteHelpers.Replace("`r`n", "`n") + "`nrun_stage failing-command false`nexit 0`n")
    & bash $helpersPath
    Assert-Deploy ($LASTEXITCODE -ne 0) "remote timing wrapper preserves fail-fast behavior"

    Assert-Deploy (-not (Test-Path (Join-Path $Cache "$($report.cacheKey)/fetch-cache"))) "shared cache never contains fetched data"
    Remove-DeployDirectory (Join-Path $Fixture ".next") $Fixture
    & (Join-Path $Fixture "deploy.ps1") -PackageOnly -CacheRoot $Cache -LogDirectory $Logs -ReleaseId test-warm
    $warm = Get-Content -Raw (Join-Path $Logs "test-warm.json") | ConvertFrom-Json
    Assert-Deploy ($warm.cacheHit -and $global:DeployTestCacheRestored) "isolated build restores compiler cache"

    $global:DeployTestBuildFails = $true
    $failed = $false
    try { & (Join-Path $Fixture "deploy.ps1") -PackageOnly -CacheRoot $Cache -LogDirectory $Logs -ReleaseId test-build-fail } catch { $failed = $true }
    $failure = Get-Content -Raw (Join-Path $Logs "test-build-fail.json") | ConvertFrom-Json
    Assert-Deploy ($failed -and $failure.status -eq "failed" -and ($failure.stages | Where-Object name -eq build).status -eq "failed") "failed build writes failure timings"
    Assert-Deploy (Test-Path (Join-Path $Cache "$($warm.cacheKey)/complete")) "failed build preserves previous shared cache"
    $global:DeployTestBuildFails = $false

    $buildCalls = $global:DeployTestBuildCalls
    & (Join-Path $Fixture "deploy.ps1") -PackageOnly -SkipBuild -Compression Optimal -ArchiveTool DotNet -CacheRoot $Cache -LogDirectory $Logs -ReleaseId test-skip
    Assert-Deploy ($global:DeployTestBuildCalls -eq $buildCalls) "SkipBuild does not rebuild"
    & (Join-Path $Fixture "deploy.ps1") -PackageOnly -DisableBuildCache -CacheRoot $Cache -LogDirectory $Logs -ReleaseId test-no-cache
    $noCache = Get-Content -Raw (Join-Path $Logs "test-no-cache.json") | ConvertFrom-Json
    Assert-Deploy (-not $noCache.cacheHit -and -not ($noCache.stages.name -contains "cache-restore")) "cache can be explicitly disabled"
    $buildCalls = $global:DeployTestBuildCalls
    $global:DeployTestUploadFails = $true
    $failed = $false
    try { & (Join-Path $Fixture "deploy.ps1") -SkipBuild -CacheRoot $Cache -LogDirectory $Logs -ReleaseId test-upload-fail } catch { $failed = $true }
    Assert-Deploy ($failed -and (Test-Path (Join-Path $Fixture "deploy.zip"))) "failed upload retains package for retry"
    $global:DeployTestUploadFails = $false

    $global:DeployTestNetworkCalls.Clear()
    & (Join-Path $Fixture "deploy.ps1") -RemoteOnly -PackageSha256 $warm.packageSha256 -CacheRoot $Cache -LogDirectory $Logs -ReleaseId test-remote
    $remoteCalls = ($global:DeployTestNetworkCalls | ForEach-Object { $_ -join ' ' }) -join "`n"
    Assert-Deploy ($global:DeployTestBuildCalls -eq $buildCalls -and $remoteCalls.Contains("PACKAGE_SHA256='$($warm.packageSha256)'")) "RemoteOnly skips build and passes supplied checksum"

    Remove-DeployDirectory (Join-Path $Fixture ".next") $Fixture
    $global:DeployTestNetworkCalls.Clear()
    $failed = $false
    try { & (Join-Path $Fixture "deploy.ps1") -SkipBuild -PackageOnly -CacheRoot $Cache -LogDirectory $Logs -ReleaseId test-missing-build } catch { $failed = $true }
    Assert-Deploy ($failed -and $global:DeployTestNetworkCalls.Count -eq 0) "missing production build fails before network access"
    $failed = $false
    try { Remove-DeployDirectory $OutputRoot $Fixture } catch { $failed = $true }
    Assert-Deploy $failed "cleanup rejects paths outside intended root"
    Write-Host "$Passed assertions passed. Offline artifacts: $OutputRoot"
} finally {
    $env:PACKAGE_PATH = $OriginalPackagePath
    $env:TARGET_DIR = $OriginalTargetDir
    $env:PACKAGE_SHA256 = $OriginalPackageSha256
    Set-Location $OriginalLocation
    Remove-Item Function:\ssh, Function:\scp, Function:\pnpm -ErrorAction SilentlyContinue
    Remove-Variable DeployTestNetworkCalls, DeployTestBuildFails, DeployTestUploadFails, DeployTestBuildCalls, DeployTestCacheRestored -Scope Global -ErrorAction SilentlyContinue
}
