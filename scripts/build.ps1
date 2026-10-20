$ErrorActionPreference = "Stop"

$workspace = if ($env:COZE_WORKSPACE_PATH) { $env:COZE_WORKSPACE_PATH } else { (Get-Location).Path }
& "$PSScriptRoot/ensure-deps.ps1"
Set-Location $workspace

Write-Host "Building frontend with Vite..."
& pnpm vite build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Bundling server with tsup..."
& pnpm tsup server/server.ts --format cjs --platform node --target node20 --outDir dist-server --no-splitting --no-minify --external vite
exit $LASTEXITCODE
