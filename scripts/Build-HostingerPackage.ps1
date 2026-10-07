param(
    [Parameter(Mandatory = $true)][string]$ProductionVendorDirectory
)
$ErrorActionPreference = 'Stop'
$manualRoot = Split-Path -Parent $PSScriptRoot
$manualOutput = Join-Path $manualRoot 'dist/hostinger'
$manualVendor = (Resolve-Path -LiteralPath $ProductionVendorDirectory).Path
$manualInstalled = Get-Content -LiteralPath (Join-Path $manualVendor 'composer/installed.json') -Raw | ConvertFrom-Json
if ($manualInstalled.dev -or $manualInstalled.packages.Count -ne 76) { throw 'Expected 76 locked production-only vendor packages' }
if (Test-Path -LiteralPath $manualOutput) { throw 'Output exists. Preserve or remove the exact old dist/hostinger directory before rebuilding.' }
$manualBackend = Join-Path $manualOutput 'globallink/backend'
New-Item -ItemType Directory -Path $manualBackend -Force | Out-Null
$manualTracked = & git -C $manualRoot ls-files backend/app backend/config backend/database/migrations backend/database/seeders backend/routes backend/resources backend/bootstrap/app.php backend/bootstrap/providers.php backend/public backend/artisan backend/composer.json backend/composer.lock
if ($LASTEXITCODE -ne 0) { throw 'Git file inventory failed' }
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
$manualPhp = Join-Path $manualRoot 'tools/php/php.exe'
$manualComposer = Join-Path $manualRoot 'tools/composer.phar'
Push-Location -LiteralPath $manualBackend
try {
    & $manualPhp $manualComposer dump-autoload --no-dev --optimize --no-scripts
    if ($LASTEXITCODE -ne 0) { throw 'Production autoload generation failed' }
} finally { Pop-Location }
Write-Output "Production folder prepared at $manualOutput. Validate it and create the ZIP after checking the exact contents."
