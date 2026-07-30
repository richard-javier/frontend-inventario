$puertos = @(443, 80, 3001, 5000, 5173)
$procesos = @()

foreach ($puerto in $puertos) {
  $conexiones = Get-NetTCPConnection -LocalPort $puerto -ErrorAction SilentlyContinue
  foreach ($conexion in $conexiones) {
    if ($conexion.OwningProcess -and $conexion.OwningProcess -ne 0) {
      $procesos += $conexion.OwningProcess
    }
  }
}

$procesos = $procesos | Sort-Object -Unique

if (-not $procesos -or $procesos.Count -eq 0) {
  Write-Host "No se encontraron servicios SINCOT activos en los puertos esperados."
  exit 0
}

foreach ($pidProceso in $procesos) {
  try {
    $proceso = Get-Process -Id $pidProceso -ErrorAction Stop
    Write-Host "Apagando $($proceso.ProcessName) PID $pidProceso"
    Stop-Process -Id $pidProceso -Force
  } catch {
    Write-Host "No se pudo apagar PID ${pidProceso}: $($_.Exception.Message)"
  }
}

Write-Host "Servidor SINCOT apagado."
