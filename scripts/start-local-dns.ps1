$frontendPath = "C:\Users\Richard\Desktop\React+Vite proyecto\Proyecto tesis\Proyecto inventario\proyecto-inventario"
$workerScript = Join-Path $frontendPath "scripts\run-local-dns-worker.ps1"
$logPath = Join-Path $frontendPath "local-dns.log"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $esAdmin) {
  Write-Error "Ejecuta este script en PowerShell como administrador. El puerto DNS 53 requiere permisos elevados."
  exit 1
}

New-NetFirewallRule -DisplayName "SINCOT DNS UDP 53" -Direction Inbound -Protocol UDP -LocalPort 53 -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "SINCOT DNS TCP 53" -Direction Inbound -Protocol TCP -LocalPort 53 -Action Allow -ErrorAction SilentlyContinue | Out-Null

$procesosDns = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -match "local-dns-server\.cjs|run-local-dns-worker\.ps1"
}

foreach ($proceso in $procesosDns) {
  Stop-Process -Id $proceso.ProcessId -Force -ErrorAction SilentlyContinue
}

Remove-Item $logPath -ErrorAction SilentlyContinue

Start-Process -FilePath powershell -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command", "& '$workerScript'"
) -WorkingDirectory $frontendPath -WindowStyle Hidden

Start-Sleep -Seconds 2

Write-Host "Log: $frontendPath\local-dns.log"

if (Test-Path $logPath) {
  Get-Content $logPath -Tail 20
}

$udp53 = Get-NetUDPEndpoint -LocalPort 53 -ErrorAction SilentlyContinue
if (-not $udp53) {
  Write-Error "El DNS local no quedo escuchando en UDP 53. Revisa el log anterior."
  exit 1
}

node (Join-Path $frontendPath "scripts\test-local-dns.cjs") 127.0.0.1 53 SINCOT

if ($LASTEXITCODE -ne 0) {
  Write-Error "El DNS local esta en el puerto 53, pero no respondio la prueba."
  exit 1
}

Write-Host "DNS local SINCOT iniciado y verificado."
