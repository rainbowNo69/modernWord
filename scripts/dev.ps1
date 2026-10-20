$ErrorActionPreference = "Stop"

function Get-WorkspacePath {
  if ($env:COZE_WORKSPACE_PATH) {
    return $env:COZE_WORKSPACE_PATH
  }
  return (Get-Location).Path
}

function Stop-ProcessTree([int] $processId) {
  if ($processId -gt 0 -and (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
    & taskkill.exe /PID $processId /T /F *> $null
  }
}

function Stop-ListeningProcess([int] $port) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  $connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
    Stop-ProcessTree $_
  }
}

$workspace = Get-WorkspacePath
$defaultPort = 5000
$port = if ($env:DEPLOY_RUN_PORT) { [int] $env:DEPLOY_RUN_PORT } elseif ($env:PORT) { [int] $env:PORT } else { $defaultPort }
Set-Location $workspace
Stop-ListeningProcess $port


$logDirectory = if ($env:COZE_LOG_DIR) { $env:COZE_LOG_DIR } else { Join-Path $workspace "logs" }
$logFile = Join-Path $logDirectory "server.log"
$errorLogFile = Join-Path $logDirectory "server-error.log"
$pidFile = Join-Path $logDirectory "server.pid"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

if (Test-Path $pidFile) {
  Stop-ProcessTree ([int] (Get-Content $pidFile -Raw))
  Remove-Item $pidFile -Force
}

$previousPort = $env:PORT
$env:PORT = "$port"
try {
  $process = Start-Process -FilePath $env:ComSpec -ArgumentList @("/d", "/s", "/c", "pnpm tsx watch server/server.ts") -WorkingDirectory $workspace -RedirectStandardOutput $logFile -RedirectStandardError $errorLogFile -PassThru
} finally {
  if ($null -eq $previousPort) { Remove-Item Env:PORT -ErrorAction SilentlyContinue } else { $env:PORT = $previousPort }
}

$process.Id | Set-Content $pidFile

$startupTimeoutSeconds = 30
$startupDeadline = (Get-Date).AddSeconds($startupTimeoutSeconds)
while ((Get-Date) -lt $startupDeadline) {
  if ($process.HasExited) {
    Get-Content $errorLogFile -Tail 20 -ErrorAction SilentlyContinue
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Write-Error "Dev server exited before listening on port $port." -ErrorAction Continue
    exit 1
  }

  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    Write-Host "Dev server is listening on port $port (PID: $($process.Id))."
    Write-Host "Log file: $logFile"
    exit 0
  }

  Start-Sleep -Milliseconds 200
}

Stop-ProcessTree $process.Id
Get-Content $errorLogFile -Tail 20 -ErrorAction SilentlyContinue
Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Error "Dev server did not listen on port $port within $startupTimeoutSeconds seconds." -ErrorAction Continue
exit 1

