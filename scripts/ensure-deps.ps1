$ErrorActionPreference = "Stop"

$workspace = if ($env:COZE_WORKSPACE_PATH) { $env:COZE_WORKSPACE_PATH } else { (Get-Location).Path }
Set-Location $workspace

$lockfile = Join-Path $workspace "pnpm-lock.yaml"
$modulesDirectory = Join-Path $workspace "node_modules"
$modulesManifest = Join-Path $modulesDirectory ".modules.yaml"
$lockHashFile = Join-Path $modulesDirectory ".coze-lockfile-sha256"

if (-not (Test-Path $lockfile)) {
  throw "pnpm-lock.yaml is required to install dependencies."
}

$lockHash = (Get-FileHash -LiteralPath $lockfile -Algorithm SHA256).Hash
$cachedLockHash = if (Test-Path $lockHashFile) {
  (Get-Content -LiteralPath $lockHashFile -Raw).Trim()
} else {
  ""
}

if ((Test-Path $modulesManifest) -and $cachedLockHash -eq $lockHash) {
  Write-Host "Dependencies already match pnpm-lock.yaml; skipping install."
  return
}

Write-Host "Installing dependencies..."
& pnpm install --frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only
if ($LASTEXITCODE -ne 0) {
  throw "pnpm install failed with exit code $LASTEXITCODE."
}

Set-Content -LiteralPath $lockHashFile -Value $lockHash -NoNewline
