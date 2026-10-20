$ErrorActionPreference = "Stop"

$workspace = if ($env:COZE_WORKSPACE_PATH) { $env:COZE_WORKSPACE_PATH } else { (Get-Location).Path }
$defaultPort = 5000
$port = if ($env:DEPLOY_RUN_PORT) { $env:DEPLOY_RUN_PORT } elseif ($env:PORT) { $env:PORT } else { $defaultPort }
Set-Location $workspace

Write-Host "Starting express production server on port $port..."
$env:PORT = "$port"
& node dist-server/server.js
exit $LASTEXITCODE
