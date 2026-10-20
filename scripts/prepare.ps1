$ErrorActionPreference = "Stop"

$workspace = if ($env:COZE_WORKSPACE_PATH) { $env:COZE_WORKSPACE_PATH } else { (Get-Location).Path }
& "$PSScriptRoot/ensure-deps.ps1"
Set-Location $workspace

if (Get-Command coze-dev -ErrorAction SilentlyContinue) {
  & coze-dev check-bins --help *> $null
  if ($LASTEXITCODE -eq 0) {
    & coze-dev check-bins --fix
    exit $LASTEXITCODE
  }
}
