const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
// Windows PowerShell must discover its own modules rather than inherit PowerShell 7 paths.
const shellEnv = { ...process.env };
delete shellEnv.PSModulePath;

function fixture(run) {
  const parent = path.resolve(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'globallink-package-test-'));
  const write = (name, content = '') => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  };
  try {
    write('scripts/Build-HostingerPackage.ps1', fs.readFileSync(path.join(__dirname, 'Build-HostingerPackage.ps1')));
    const packages = Array.from({ length: 76 }, (_, i) => ({ name: 'synthetic/package-' + i, version: '1.0.0', dist: { reference: 'synthetic-' + i } }));
    write('vendor/composer/installed.json', JSON.stringify({ dev: false, packages }));
    write('backend/composer.lock', JSON.stringify({ packages }));
    for (const name of ['database/migrations/2026_10_13_130001_add_description_to_bank_service_details.php', 'app/Http/Controllers/Admin/CmsController.php', 'app/Http/Resources/ServiceResource.php', 'routes/web.php', 'tests/Feature/ProviderWorkflowTest.php']) write('backend/' + name, '<?php');
    for (const name of ['app/Services/ProviderDeletionSafety.php', 'app/Services/SafeDatabaseError.php', 'app/Http/Middleware/RequestCorrelation.php', 'config/provider_workflow.php', 'tests/Feature/ProviderDependencyIntegrationTest.php', 'tests/Feature/DiagnosticCorrelationTest.php']) write('backend/' + name, '<?php');
    write('frontend/dist/.vite/manifest.json', JSON.stringify({ 'index.html': { file: 'assets/index.js', css: ['assets/index.css'] } }));
    write('frontend/dist/assets/index.js');
    write('frontend/dist/assets/index.css');
    assert.equal(spawnSync('git', ['init', '--quiet'], { cwd: root }).status, 0);
    const execute = (allow = true) => spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/Build-HostingerPackage.ps1'), '-ProductionVendorDirectory', path.join(root, 'vendor'), '-OutputDirectory', path.join(root, 'release'), ...(allow ? ['-AllowWorkingTree'] : [])], { encoding: 'utf8', env: shellEnv });
    run({ root, write, execute });
  } finally {
    const target = path.resolve(root);
    if (!target.startsWith(parent + path.sep) || !path.basename(target).startsWith('globallink-package-test-')) throw new Error('Unsafe cleanup target');
    fs.rmSync(target, { recursive: true, force: true });
  }
}

test('required untracked migration cannot be silently omitted', () => fixture(({ root, execute }) => {
  fs.unlinkSync(path.join(root, 'backend/database/migrations/2026_10_13_130001_add_description_to_bank_service_details.php'));
  const result = execute();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Required release file missing/);
  assert.equal(fs.existsSync(path.join(root, 'release')), false);
}));

test('actual archive code preserves nested paths, empty directories, hashes and receipt', () => fixture(({ root, write }) => {
  write('release/globallink/backend/database/migrations/add_description.php', '<?php // synthetic migration');
  write('release/public_html/assets/index.js', 'synthetic asset');
  write('release/RELEASE_RECEIPT.json', '{}');
  fs.mkdirSync(path.join(root, 'release/globallink/backend/storage/logs'), { recursive: true });
  const script = fs.readFileSync(path.join(__dirname, 'Build-HostingerPackage.ps1'), 'utf8');
  const tail = script.slice(script.indexOf('Add-Type -AssemblyName System.IO.Compression\r') >= 0 ? script.indexOf('Add-Type -AssemblyName System.IO.Compression\r') : script.indexOf('Add-Type -AssemblyName System.IO.Compression\n'));
  assert.ok(tail.startsWith('Add-Type -AssemblyName System.IO.Compression'));
  const prelude = `$ErrorActionPreference='Stop'\n$manualOutput=Join-Path $PSScriptRoot 'release'\n$manualMigrations=@('synthetic')\n$manualContentHashes=@{}\nGet-ChildItem -LiteralPath $manualOutput -File -Recurse | Where-Object { $_.Name -ne 'RELEASE_RECEIPT.json' } | ForEach-Object { $manualContentHashes[$_.FullName.Substring($manualOutput.Length+1).Replace('\\','/')]=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }\n`;
  const checks = `\n$zip=[IO.Compression.ZipFile]::OpenRead($manualArchive)\ntry { if (!$zip.GetEntry('globallink/backend/storage/logs/')) { throw 'Empty directory missing' }; if (@($zip.Entries | Where-Object { $_.FullName.Contains('\\') }).Count) { throw 'Nonportable entry path' } } finally { $zip.Dispose() }\n`;
  write('archive-test.ps1', prelude + tail + checks);
  const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'archive-test.ps1')], { encoding: 'utf8', env: shellEnv });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Verified production archive/);
  assert.match(fs.readFileSync(path.join(root, 'release.zip.sha256'), 'utf8'), /^[A-F0-9]{64}  release.zip/);
}));
test('manifest asset absence fails before copying', () => fixture(({ root, execute }) => {
  fs.unlinkSync(path.join(root, 'frontend/dist/assets/index.css'));
  const result = execute();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing or invalid manifest asset/);
  assert.equal(fs.existsSync(path.join(root, 'release')), false);
}));
test('existing output and archive are preserved', () => fixture(({ root, write, execute }) => {
  write('release/sentinel', 'preserve');
  assert.notEqual(execute().status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'release/sentinel'), 'utf8'), 'preserve');
  fs.unlinkSync(path.join(root, 'release/sentinel'));
  fs.rmdirSync(path.join(root, 'release'));
  write('release.zip', 'old archive');
  assert.notEqual(execute().status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'release.zip'), 'utf8'), 'old archive');
  assert.equal(fs.existsSync(path.join(root, 'release')), false);
}));
test('working-tree release requires deliberate opt-in', () => fixture(({ root, execute }) => {
  const result = execute(false);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Explicit -AllowWorkingTree approval/);
  assert.equal(fs.existsSync(path.join(root, 'release')), false);
}));

test('production vendor must match locked identities and versions', () => fixture(({ root, write, execute }) => {
  const installed = JSON.parse(fs.readFileSync(path.join(root, 'vendor/composer/installed.json'), 'utf8'));
  installed.packages[0].version = '9.0.0';
  write('vendor/composer/installed.json', JSON.stringify(installed));
  const result = execute();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /differs from composer.lock/);
  assert.equal(fs.existsSync(path.join(root, 'release')), false);
}));
