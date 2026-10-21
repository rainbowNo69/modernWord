# ABOUTME: 释放本地端口占用（默认 5000 Express / 24678 Vite HMR）
# ABOUTME: 用法: pnpm kill:port   其它端口: powershell -File ./scripts/kill-port.ps1 -Ports 3000,8080
param(
  [int[]] $Ports = @(5000, 24678)
)

$ErrorActionPreference = 'SilentlyContinue'

foreach ($port in $Ports) {
  $pids = Get-NetTCPConnection -LocalPort $port -State Listen |
    Select-Object -ExpandProperty OwningProcess -Unique

  if (-not $pids) {
    Write-Host "Port $port is free."
    continue
  }

  foreach ($processId in $pids) {
    if ($processId -gt 0) {
      Write-Host "Port $port in use, killing PID $processId (with children)."
      & taskkill.exe /PID $processId /T /F | Out-Null
    }
  }
}

Write-Host "Done."
