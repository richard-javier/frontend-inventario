$env:SINCOT_IP = "192.168.0.120"
$env:UPSTREAM_DNS = "8.8.8.8"

$scriptPath = Join-Path $PSScriptRoot "local-dns-server.cjs"
$logPath = Join-Path (Split-Path $PSScriptRoot -Parent) "local-dns.log"

& node $scriptPath *> $logPath
