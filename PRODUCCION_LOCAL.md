# Produccion local en una empresa

Esta guia permite publicar SINCOT desde la laptop como servidor principal, usando un nombre como `https://sincot.local` en lugar de una IP.


## Comando unico recomendado

Desde el frontend ejecuta:

```powershell
npm run production
```

Ese comando compila el frontend con `/api` y `/ia`, levanta el backend en `127.0.0.1:3001`, levanta el motor IA en `127.0.0.1:5000` y arranca Caddy con `Caddyfile.local`. Tambien fuerza `FRONTEND_URL=https://SINCOT` para que los correos de recuperacion apunten al dominio HTTPS local de produccion.
## 1. Idea general

La laptop ejecuta tres servicios internos:

- Frontend React compilado en `dist`
- Backend Node en `127.0.0.1:3001`
- Motor IA Python en `127.0.0.1:5000`

Caddy queda al frente y entrega todo por HTTPS:

- `https://sincot.local` abre el sistema
- `https://sincot.local/api/...` va al backend Node
- `https://sincot.local/ia/...` va al motor IA Python

## 2. Preparar la IP fija

Configura la laptop con IP fija o reserva DHCP en el router. Ejemplo actual:

```powershell
192.168.0.120
```

Si la IP cambia, las demas computadoras dejaran de encontrar el sistema.

## 3. Crear el nombre del sistema

Opcion rapida para pruebas: en cada computadora cliente, abrir PowerShell como administrador y ejecutar:

```powershell
notepad C:\Windows\System32\drivers\etc\hosts
```

Agregar esta linea:

```txt
192.168.0.120 sincot.local
```

Guardar y probar:

```powershell
ping sincot.local
```

Opcion recomendada en empresa: crear un registro DNS interno:

```txt
sincot.local -> 192.168.0.120
```

## 4. Instalar Caddy

En la laptop servidor:

```powershell
winget install CaddyServer.Caddy
```

Si `winget` no encuentra el paquete, descargar Caddy para Windows desde su sitio oficial y dejar `caddy.exe` en una carpeta incluida en el `PATH`.

## 5. Compilar frontend para produccion

Desde el frontend:

```powershell
cd "C:\Users\Richard\Desktop\React+Vite proyecto\Proyecto tesis\Proyecto inventario\proyecto-inventario"
$env:VITE_API_BASE_URL="/api"
$env:VITE_IA_BASE_URL="/ia"
npm run build
```

## 6. Levantar backend Node

Desde el backend:

```powershell
cd "C:\Users\Richard\Desktop\React+Vite proyecto\Proyecto tesis\backend-inventario"
$env:HOST="127.0.0.1"
$env:PORT="3001"
$env:IA_BASE_URL="http://127.0.0.1:5000"
$env:FRONTEND_URL="https://sincot.local"
npm start
```

## 7. Levantar motor IA

Desde la carpeta de IA:

```powershell
cd "C:\Users\Richard\Desktop\React+Vite proyecto\Proyecto tesis\backend-inventario\sincot-ia"
$env:PORT="5000"
python app_ia.py
```

## 8. Levantar HTTPS con Caddy

Desde el frontend:

```powershell
cd "C:\Users\Richard\Desktop\React+Vite proyecto\Proyecto tesis\Proyecto inventario\proyecto-inventario"
caddy run --config Caddyfile.local
```

Luego abrir:

```txt
https://sincot.local
```

## 9. Certificado HTTPS

El archivo `Caddyfile.local` usa `tls internal`. Eso crea un certificado interno.

Para que el navegador no muestre advertencia de seguridad, cada computadora cliente debe confiar en la autoridad interna de Caddy. En un entorno de empresa, lo correcto es instalar esa autoridad por politicas de Windows o usar un certificado emitido por el area de TI.

Si tienes un dominio real, por ejemplo `sincot.tuempresa.com`, se puede cambiar `sincot.local` por ese dominio y usar HTTPS publico con Let's Encrypt.

## 10. Abrir firewall

Ejecutar PowerShell como administrador en la laptop servidor:

```powershell
New-NetFirewallRule -DisplayName "SINCOT HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

Si vas a probar todavia por puertos directos, tambien:

```powershell
New-NetFirewallRule -DisplayName "SINCOT Vite 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
New-NetFirewallRule -DisplayName "SINCOT API 3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "SINCOT IA 5000" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

En produccion con Caddy solo deberia exponerse el puerto 443.


