$procesosDns = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -match "local-dns-server\.cjs|run-local-dns-worker\.ps1"
}

if (-not $procesosDns) {
  Write-Host "No se encontro DNS local SINCOT activo."
  exit 0
}

foreach ($proceso in $procesosDns) {
  Write-Host "Apagando DNS local PID $($proceso.ProcessId)"
  Stop-Process -Id $proceso.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "DNS local SINCOT apagado."
