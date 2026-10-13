param(
    [Parameter(Mandatory = $true)][string]$ProductionVendorDirectory,
    [string]$OutputDirectory,
    [switch]$AllowWorkingTree
)
$ErrorActionPreference = 'Stop'
$manualRoot = Split-Path -Parent $PSScriptRoot
$manualOutput = if ($OutputDirectory) { [IO.Path]::GetFullPath($OutputDirectory) } else { Join-Path $manualRoot 'dist/hostinger' }
$manualVendor = (Resolve-Path -LiteralPath $ProductionVendorDirectory).Path
$manualInstalled = Get-Content -LiteralPath (Join-Path $manualVendor 'composer/installed.json') -Raw | ConvertFrom-Json
if ($manualInstalled.dev -or $manualInstalled.packages.Count -ne 76) { throw 'Expected 76 locked production-only vendor packages' }
$manualLock = Get-Content -LiteralPath (Join-Path $manualRoot 'backend/composer.lock') -Raw | ConvertFrom-Json
if ($manualLock.packages.Count -ne $manualInstalled.packages.Count) { throw 'Production vendor differs from composer.lock.' }
foreach ($manualPackage in $manualLock.packages) {
    $manualMatches = @($manualInstalled.packages | Where-Object { $_.name -eq $manualPackage.name })
    if ($manualMatches.Count -ne 1 -or $manualMatches[0].version -ne $manualPackage.version -or $manualMatches[0].dist.reference -ne $manualPackage.dist.reference) { throw 'Production vendor package identity/version differs from composer.lock.' }
}
if (Test-Path -LiteralPath $manualOutput) { throw 'Output exists. Preserve it and select a new unique output directory.' }
if (Test-Path -LiteralPath ($manualOutput + '.zip')) { throw 'Archive already exists; it will not be replaced.' }
if (Test-Path -LiteralPath ($manualOutput + '.zip.sha256')) { throw 'Checksum receipt already exists; it will not be replaced.' }
$manualStatus = @(& git -C $manualRoot status --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'Git status failed.' }
if ($manualStatus.Count -gt 0 -and -not $AllowWorkingTree) { throw 'Working tree is not clean. Explicit -AllowWorkingTree approval is required; included source hashes and status will be recorded.' }
$manualCommit = (& git -C $manualRoot rev-parse HEAD).Trim()
$manualTracked = @(& git -C $manualRoot ls-files --cached --others --exclude-standard backend/app backend/config backend/database/migrations backend/database/seeders backend/database/factories backend/tests backend/phpunit.xml backend/routes backend/resources backend/bootstrap/app.php backend/bootstrap/providers.php backend/public backend/artisan backend/composer.json backend/composer.lock) | Sort-Object -Unique
if ($LASTEXITCODE -ne 0) { throw 'Git file inventory failed' }
$manualTracked = @($manualTracked | Where-Object { -not $_.EndsWith('/.gitignore') -and $_ -notlike 'backend/public/assets/*' })
$manualRequired = @('backend/database/migrations/2026_10_13_130001_add_description_to_bank_service_details.php','backend/app/Http/Controllers/Admin/CmsController.php','backend/app/Http/Resources/ServiceResource.php','backend/routes/web.php','backend/tests/Feature/ProviderWorkflowTest.php')
$manualRequired += @('backend/app/Services/ProviderDeletionSafety.php','backend/app/Services/SafeDatabaseError.php','backend/app/Http/Middleware/RequestCorrelation.php','backend/config/provider_workflow.php','backend/tests/Feature/ProviderDependencyIntegrationTest.php','backend/tests/Feature/DiagnosticCorrelationTest.php')
foreach ($manualFile in $manualRequired) {
    if ($manualFile -notin $manualTracked -or -not (Test-Path -LiteralPath (Join-Path $manualRoot $manualFile) -PathType Leaf)) { throw "Required release file missing from inventory: $manualFile" }
}
$manualMigrations = @(Get-ChildItem -LiteralPath (Join-Path $manualRoot 'backend/database/migrations') -File -Filter '*.php' | ForEach-Object { 'backend/database/migrations/' + $_.Name })
if (@($manualMigrations | Where-Object { $_ -notin $manualTracked }).Count -gt 0) { throw 'Migration inventory is incomplete.' }
$manualManifestPath = Join-Path $manualRoot 'frontend/dist/.vite/manifest.json'
$manualManifest = Get-Content -LiteralPath $manualManifestPath -Raw | ConvertFrom-Json
$manualBuildRoot = [IO.Path]::GetFullPath((Join-Path $manualRoot 'frontend/dist'))
foreach ($manualEntry in $manualManifest.PSObject.Properties.Value) {
    foreach ($manualAsset in @($manualEntry.file) + @($manualEntry.css) + @($manualEntry.assets)) {
        if (!$manualAsset) { continue }
        $manualAssetPath = [IO.Path]::GetFullPath((Join-Path $manualBuildRoot $manualAsset))
        if (!$manualAssetPath.StartsWith($manualBuildRoot + [IO.Path]::DirectorySeparatorChar) -or !(Test-Path -LiteralPath $manualAssetPath -PathType Leaf)) { throw "Missing or invalid manifest asset: $manualAsset" }
    }
}
$manualSourceHashes = @{}
foreach ($manualFile in $manualTracked) { $manualSourceHashes[$manualFile] = (Get-FileHash -LiteralPath (Join-Path $manualRoot $manualFile) -Algorithm SHA256).Hash }
$manualReviewFiles = @(& git -C $manualRoot ls-files --cached --others --exclude-standard frontend/src frontend/public frontend/index.html frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/vite.config.ts scripts deployment docs) | Sort-Object -Unique
if ($LASTEXITCODE -ne 0) { throw 'Review source inventory failed.' }
foreach ($manualFile in $manualReviewFiles) { $manualSourceHashes[$manualFile] = (Get-FileHash -LiteralPath (Join-Path $manualRoot $manualFile) -Algorithm SHA256).Hash }
$manualBuildHashes = @{}
$manualBuildHashes['.vite/manifest.json'] = (Get-FileHash -LiteralPath $manualManifestPath -Algorithm SHA256).Hash
foreach ($manualFile in Get-ChildItem -LiteralPath (Join-Path $manualBuildRoot 'assets') -File -Recurse) {
    $manualBuildHashes[$manualFile.FullName.Substring($manualBuildRoot.Length + 1).Replace('\','/')] = (Get-FileHash -LiteralPath $manualFile.FullName -Algorithm SHA256).Hash
}
$manualBackend = Join-Path $manualOutput 'globallink/backend'
New-Item -ItemType Directory -Path $manualBackend -Force | Out-Null
foreach ($manualRelative in $manualTracked) {
    if ($manualRelative.EndsWith('/.gitignore')) { continue }
    $manualDestination = Join-Path $manualBackend $manualRelative.Substring(8)
    New-Item -ItemType Directory -Path (Split-Path -Parent $manualDestination) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $manualRoot $manualRelative) -Destination $manualDestination
}
Copy-Item -LiteralPath $manualVendor -Destination (Join-Path $manualBackend 'vendor') -Recurse
# Vendor distribution test support is unnecessary in this production-only package.
$manualTestFolders = Get-ChildItem -LiteralPath (Join-Path $manualBackend 'vendor') -Directory -Recurse | Where-Object { $_.Name -in @('Test','Tests','test','tests','fixtures','Fixtures','.git','.github') } | Sort-Object { $_.FullName.Length } -Descending
foreach ($manualFolder in $manualTestFolders) {
    $manualResolved = [System.IO.Path]::GetFullPath($manualFolder.FullName)
    if (!$manualResolved.StartsWith([System.IO.Path]::GetFullPath((Join-Path $manualBackend 'vendor')) + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Vendor cleanup path escaped output' }
    Remove-Item -LiteralPath $manualResolved -Recurse -Force
}
$manualMetadataFiles = Get-ChildItem -LiteralPath (Join-Path $manualBackend 'vendor') -File -Recurse | Where-Object { $_.Extension -in @('.exe','.dll','.bat') -or $_.Name -in @('.gitignore','.gitattributes','.editorconfig','phpunit.xml','phpunit.xml.dist','phpstan.neon','phpstan.neon.dist','psalm.xml','.php-cs-fixer.dist.php') }
foreach ($manualMetadataFile in $manualMetadataFiles) {
    $manualResolved = [System.IO.Path]::GetFullPath($manualMetadataFile.FullName)
    if (!$manualResolved.StartsWith([System.IO.Path]::GetFullPath((Join-Path $manualBackend 'vendor')) + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Metadata cleanup path escaped output' }
    Remove-Item -LiteralPath $manualResolved
}
foreach ($manualDir in @('bootstrap/cache','storage/app/private/cms','storage/framework/cache/data','storage/framework/sessions','storage/framework/views','storage/logs')) {
    New-Item -ItemType Directory -Path (Join-Path $manualBackend $manualDir) -Force | Out-Null
}
$manualManifestDir = Join-Path $manualOutput 'globallink/frontend/dist/.vite'
New-Item -ItemType Directory -Path $manualManifestDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $manualRoot 'frontend/dist/.vite/manifest.json') -Destination $manualManifestDir
Copy-Item -LiteralPath (Join-Path $manualRoot 'frontend/dist/assets') -Destination (Join-Path $manualBackend 'public') -Recurse
Copy-Item -LiteralPath (Join-Path $manualRoot 'deployment/hostinger/production.env.example') -Destination $manualBackend
Copy-Item -LiteralPath (Join-Path $manualBackend 'public') -Destination (Join-Path $manualOutput 'public_html') -Recurse
Copy-Item -LiteralPath (Join-Path $manualRoot 'deployment/hostinger/public_html.index.php') -Destination (Join-Path $manualOutput 'public_html/index.php') -Force
Copy-Item -LiteralPath (Join-Path $manualRoot 'docs/HOSTINGER_DEPLOYMENT.md') -Destination (Join-Path $manualOutput 'DEPLOYMENT_README.md')
Copy-Item -LiteralPath (Join-Path $manualRoot 'docs/HOSTINGER_MANUAL_CHECKLIST.md') -Destination $manualOutput
foreach ($manualRelative in $manualReviewFiles) {
    $manualDestination = Join-Path $manualOutput ('source/' + $manualRelative)
    New-Item -ItemType Directory -Path (Split-Path -Parent $manualDestination) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $manualRoot $manualRelative) -Destination $manualDestination
}
$manualPhp = Join-Path $manualRoot 'tools/php/php.exe'
$manualComposer = Join-Path $manualRoot 'tools/composer.phar'
Push-Location -LiteralPath $manualBackend
try {
    & $manualPhp $manualComposer dump-autoload --no-dev --optimize --no-scripts
    if ($LASTEXITCODE -ne 0) { throw 'Production autoload generation failed' }
} finally { Pop-Location }
foreach ($manualFile in $manualSourceHashes.Keys) {
    if ((Get-FileHash -LiteralPath (Join-Path $manualRoot $manualFile) -Algorithm SHA256).Hash -ne $manualSourceHashes[$manualFile]) { throw "Source changed while packaging: $manualFile" }
    $manualCopied = if ($manualFile -like 'backend/*') { Join-Path $manualBackend $manualFile.Substring(8) } else { Join-Path $manualOutput ('source/' + $manualFile) }
    if ((Get-FileHash -LiteralPath $manualCopied -Algorithm SHA256).Hash -ne $manualSourceHashes[$manualFile]) { throw "Packaged source mismatch: $manualFile" }
}
if ((@(& git -C $manualRoot status --porcelain) -join "`n") -ne ($manualStatus -join "`n")) { throw 'Working-tree inventory changed while packaging.' }
foreach ($manualAsset in $manualBuildHashes.Keys) {
    if ((Get-FileHash -LiteralPath (Join-Path $manualBuildRoot $manualAsset) -Algorithm SHA256).Hash -ne $manualBuildHashes[$manualAsset]) { throw "Frontend build changed while packaging: $manualAsset" }
    $manualCopies = if ($manualAsset -eq '.vite/manifest.json') { @((Join-Path $manualManifestDir 'manifest.json')) } else { @((Join-Path $manualBackend ('public/' + $manualAsset)), (Join-Path $manualOutput ('public_html/' + $manualAsset))) }
    foreach ($manualCopy in $manualCopies) {
        if ((Get-FileHash -LiteralPath $manualCopy -Algorithm SHA256).Hash -ne $manualBuildHashes[$manualAsset]) { throw "Packaged frontend mismatch: $manualAsset" }
    }
}
$manualContentHashes = @{}
foreach ($manualFile in Get-ChildItem -LiteralPath $manualOutput -File -Recurse -Force) {
    $manualRelative = $manualFile.FullName.Substring($manualOutput.Length + 1).Replace('\','/')
    $manualContentHashes[$manualRelative] = (Get-FileHash -LiteralPath $manualFile.FullName -Algorithm SHA256).Hash
}
$manualReceipt = @{ commit=$manualCommit; workingTreeStatus=$manualStatus; includesUntracked=$true; migrations=$manualMigrations; frontendManifestSHA256=$manualBuildHashes['.vite/manifest.json']; frontendBuildSHA256=$manualBuildHashes; sourceSHA256=$manualSourceHashes; contentSHA256=$manualContentHashes }
$manualReceipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $manualOutput 'RELEASE_RECEIPT.json') -Encoding UTF8
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$manualArchive = $manualOutput + '.zip'
if (Test-Path -LiteralPath $manualArchive) { throw 'Archive already exists; it will not be replaced.' }
$manualCreateZip = [IO.Compression.ZipFile]::Open($manualArchive, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($manualFile in Get-ChildItem -LiteralPath $manualOutput -File -Recurse -Force) {
        $manualRelative = $manualFile.FullName.Substring($manualOutput.Length + 1).Replace('\','/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($manualCreateZip, $manualFile.FullName, $manualRelative, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    foreach ($manualDirectory in Get-ChildItem -LiteralPath $manualOutput -Directory -Recurse -Force) {
        if (@(Get-ChildItem -LiteralPath $manualDirectory.FullName -Force).Count -eq 0) {
            $manualCreateZip.CreateEntry($manualDirectory.FullName.Substring($manualOutput.Length + 1).Replace('\','/') + '/') | Out-Null
        }
    }
} finally { $manualCreateZip.Dispose() }
$manualZip = [IO.Compression.ZipFile]::OpenRead($manualArchive)
try {
    if (@($manualZip.Entries | Where-Object { $_.Name }).Count -ne $manualContentHashes.Count + 1) { throw 'Unexpected final archive file inventory.' }
    foreach ($manualRelative in $manualContentHashes.Keys) {
        $manualEntry = $manualZip.GetEntry($manualRelative)
        if (!$manualEntry) { throw "Final archive missing file: $manualRelative" }
        $manualStream = $manualEntry.Open()
        $manualHasher = [Security.Cryptography.SHA256]::Create()
        try { $manualHash = [BitConverter]::ToString($manualHasher.ComputeHash($manualStream)).Replace('-','') } finally { $manualStream.Dispose(); $manualHasher.Dispose() }
        if ($manualHash -ne $manualContentHashes[$manualRelative]) { throw "Final archive hash mismatch: $manualRelative" }
    }
    if (!$manualZip.GetEntry('RELEASE_RECEIPT.json')) { throw 'Final archive missing receipt.' }
} finally { $manualZip.Dispose() }
$manualArchiveHash = (Get-FileHash -LiteralPath $manualArchive -Algorithm SHA256).Hash
"$manualArchiveHash  $([IO.Path]::GetFileName($manualArchive))" | Set-Content -LiteralPath ($manualArchive + '.sha256') -Encoding ASCII
Write-Output "Verified production archive: $manualArchive ($($manualContentHashes.Count) hashed files; $($manualMigrations.Count) migrations)."
