$frontendPath = "C:\Users\Richard\Desktop\React+Vite proyecto\Proyecto tesis\Proyecto inventario\proyecto-inventario"
$backendPath = "C:\Users\Richard\Desktop\React+Vite proyecto\Proyecto tesis\backend-inventario"
$iaPath = Join-Path $backendPath "sincot-ia"
$siteUrl = "https://SINCOT"
$caddyCommand = (Get-Command caddy -ErrorAction SilentlyContinue).Source

function Stop-ListenersOnPorts {
  param([int[]]$Ports)

  $connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $Ports -contains $_.LocalPort }

  $processIds = $connections |
    Select-Object -ExpandProperty OwningProcess -Unique |
    Where-Object { $_ -and $_ -ne $PID }

  foreach ($processId in $processIds) {
    try {
      $process = Get-Process -Id $processId -ErrorAction Stop
      Write-Host "Cerrando proceso previo en puerto de produccion: $($process.ProcessName) ($processId)"
      Stop-Process -Id $processId -Force
    } catch {
      Write-Warning "No se pudo cerrar el proceso ${processId}: $($_.Exception.Message)"
    }
  }
}

if (-not $caddyCommand) {
  $caddyCommand = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter caddy.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}

if (-not $caddyCommand) {
  Write-Error "No se encontro caddy.exe. Instala Caddy con: winget install CaddyServer.Caddy"
  exit 1
}

Stop-ListenersOnPorts -Ports @(443, 3001, 5000, 5173)
Start-Sleep -Seconds 2

Write-Host "Compilando frontend para produccion..."
Push-Location $frontendPath
$env:VITE_API_BASE_URL = "/api"
$env:VITE_IA_BASE_URL = "/ia"
npm run build
if ($LASTEXITCODE -ne 0) {
  Pop-Location
  Write-Error "No se pudo compilar el frontend."
  exit $LASTEXITCODE
}
Pop-Location

Start-Process -FilePath powershell -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command", '$env:NODE_ENV="production"; $env:HOST="127.0.0.1"; $env:PORT="3001"; $env:CORS_ORIGIN="' + $siteUrl + '"; $env:IA_BASE_URL="http://127.0.0.1:5000"; $env:FRONTEND_URL="' + $siteUrl + '"; node index.js *> backend-prod.log'
) -WorkingDirectory $backendPath -WindowStyle Hidden

Start-Process -FilePath powershell -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command", '$env:PORT="5000"; python app_ia.py *> ia-prod.log'
) -WorkingDirectory $iaPath -WindowStyle Hidden

Start-Process -FilePath powershell -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command", '& "' + $caddyCommand + '" run --config Caddyfile.local *> caddy-prod.log'
) -WorkingDirectory $frontendPath -WindowStyle Hidden

Write-Host "SINCOT iniciado. Abrir: $siteUrl"
Write-Host "Logs:"
Write-Host "  $backendPath\backend-prod.log"
Write-Host "  $iaPath\ia-prod.log"
Write-Host "  $frontendPath\caddy-prod.log"
