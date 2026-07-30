$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $esAdmin) {
  Write-Error "Ejecuta VS Code o PowerShell como administrador."
  exit 1
}

$reglas = @(
  @{ Nombre = "SINCOT HTTPS 443"; Protocolo = "TCP"; Puerto = 443 },
  @{ Nombre = "SINCOT HTTP 80"; Protocolo = "TCP"; Puerto = 80 },
  @{ Nombre = "SINCOT DNS UDP 53"; Protocolo = "UDP"; Puerto = 53 },
  @{ Nombre = "SINCOT DNS TCP 53"; Protocolo = "TCP"; Puerto = 53 }
)

foreach ($regla in $reglas) {
  $existente = Get-NetFirewallRule -DisplayName $regla.Nombre -ErrorAction SilentlyContinue
  if ($existente) {
    Set-NetFirewallRule -DisplayName $regla.Nombre -Enabled True -Action Allow -Profile Any
  } else {
    New-NetFirewallRule `
      -DisplayName $regla.Nombre `
      -Direction Inbound `
      -Protocol $regla.Protocolo `
      -LocalPort $regla.Puerto `
      -Action Allow `
      -Profile Any | Out-Null
  }
}

Write-Host "Reglas de firewall SINCOT activas:"
Get-NetFirewallRule -DisplayName "SINCOT*" | Select-Object DisplayName, Enabled, Direction, Action, Profile
