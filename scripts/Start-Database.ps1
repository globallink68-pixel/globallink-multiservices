$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dataRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'tools\mysql-data'))
$toolsRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'tools'))
if (-not $dataRoot.StartsWith($toolsRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid database path.' }
if (-not (Test-Path -LiteralPath (Join-Path $dataRoot 'auto.cnf'))) { throw 'Dedicated database is not initialized. Follow README; this launcher never initializes data.' }
$listener = Get-NetTCPConnection -LocalPort 3312 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    $dbProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener[0].OwningProcess)"
    if ($dbProcess.Name -ne 'mysqld.exe' -or $dbProcess.CommandLine -notlike "*$dataRoot*") { throw 'Port 3312 belongs to a different process; no action taken.' }
    Write-Output 'This project database is already running on 127.0.0.1:3312.'
    exit 0
}
$mysqlBinary = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
if (-not (Test-Path -LiteralPath $mysqlBinary)) { throw 'Install MySQL 8 or set the installed binary path in this launcher.' }
$errorLog = Join-Path $toolsRoot 'mysql-error.log'
Start-Process -FilePath $mysqlBinary -ArgumentList @('--no-defaults', "--datadir=`"$dataRoot`"", '--port=3312', '--bind-address=127.0.0.1', '--mysqlx=OFF', "--log-error=`"$errorLog`"") -WindowStyle Hidden
for ($attempt = 0; $attempt -lt 15; $attempt++) {
    if (Get-NetTCPConnection -LocalPort 3312 -State Listen -ErrorAction SilentlyContinue) { Write-Output 'Isolated database started on 127.0.0.1:3312.'; exit 0 }
    Start-Sleep -Seconds 1
}
throw 'Database did not start. Review only tools/mysql-error.log in this project.'
