$certPath = Join-Path (Split-Path $PSScriptRoot -Parent) "certificados\SINCOT-Caddy-Root.crt"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $esAdmin) {
  Write-Error "Ejecuta este script en PowerShell como administrador."
  exit 1
}

if (-not (Test-Path $certPath)) {
  Write-Error "No se encontro el certificado: $certPath"
  exit 1
}

Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\LocalMachine\Root | Out-Null

Write-Host "Certificado SINCOT instalado en Entidades de certificacion raiz de confianza."
Write-Host "Cierra y vuelve a abrir el navegador, luego entra a https://SINCOT"
