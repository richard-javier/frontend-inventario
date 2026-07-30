$ipServidor = "192.168.0.120"
$nombreSistema = "sincot.local"
$hostsPath = "$env:windir\System32\drivers\etc\hosts"
$entrada = "$ipServidor $nombreSistema"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $esAdmin) {
  Write-Error "Ejecuta este script en PowerShell como administrador."
  exit 1
}

if (-not (Select-String -Path $hostsPath -Pattern "\s$([regex]::Escape($nombreSistema))$" -Quiet)) {
  Add-Content -Path $hostsPath -Value "`r`n$entrada"
  Write-Host "Agregado al hosts real: $entrada"
} else {
  Write-Host "$nombreSistema ya existe en el hosts real."
}

ipconfig /flushdns | Out-Null
Write-Host "DNS limpiado. Prueba: ping $nombreSistema"
