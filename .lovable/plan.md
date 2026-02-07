
# Plan: Configurar cabecera PNA en proxy HTTPS para IA Local

## Resumen del problema

El navegador Chrome/Edge rechaza las peticiones desde la aplicacion (HTTPS publico) hacia tu servidor Ollama en la red local (192.168.20.174:11443). Esto ocurre por la politica **Private Network Access (PNA)** que Chrome implementa para proteger redes internas.

El certificado SSL esta funcionando correctamente (curl y navegador muestran el JSON), pero Chrome bloquea la peticion programatica (fetch) desde JavaScript porque detecta que es un intento de acceder a una red privada desde un sitio publico.

## Solucion

Configurar el proxy HTTPS (Nginx o Caddy) para que incluya la cabecera especial:

```text
Access-Control-Allow-Private-Network: true
```

Esta cabecera le indica a Chrome que el servidor acepta peticiones de origenes publicos a la red privada.

## Pasos de implementacion

### Paso 1: Limpiar contenedores anteriores

Primero, verificar que proxy esta activo y limpiar los anteriores:

```bash
# Ver contenedores en ejecucion
docker ps

# Parar todos los proxies anteriores
docker stop caddy-ollama nginx-ollama 2>/dev/null
docker rm caddy-ollama nginx-ollama 2>/dev/null
```

### Paso 2: Crear la configuracion Nginx corregida

Crear el archivo de configuracion con la cabecera PNA:

```bash
mkdir -p ~/nginx-ollama && cd ~/nginx-ollama

# Configuracion Nginx con cabecera PNA
cat > nginx.conf << 'EOF'
events { worker_connections 1024; }
http {
  server {
    listen 11443 ssl;
    server_name _;
    
    ssl_certificate     /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    
    location / {
      # CORS headers para cualquier origen
      add_header 'Access-Control-Allow-Origin' '*' always;
      add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
      add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
      
      # Cabecera PNA - Clave para Chrome/Edge
      add_header 'Access-Control-Allow-Private-Network' 'true' always;
      
      # Responder OPTIONS (preflight)
      if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
        add_header 'Access-Control-Allow-Private-Network' 'true';
        add_header 'Content-Length' 0;
        return 204;
      }
      
      proxy_pass http://127.0.0.1:11434;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_read_timeout 300;
      proxy_connect_timeout 60;
    }
  }
}
EOF
```

### Paso 3: Generar certificado autofirmado (si no existe)

```bash
# Crear directorio para certificados
mkdir -p ~/nginx-ollama/ssl && cd ~/nginx-ollama/ssl

# Generar certificado autofirmado
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout server.key -out server.crt \
  -subj "/CN=ollama-proxy" \
  -addext "subjectAltName=IP:192.168.20.174"
```

### Paso 4: Arrancar Nginx con la configuracion

```bash
cd ~/nginx-ollama

docker run -d \
  --name nginx-ollama \
  --network host \
  -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/ssl:/etc/nginx/ssl:ro \
  --restart unless-stopped \
  nginx:alpine

# Verificar que esta corriendo
docker logs nginx-ollama
```

### Paso 5: Verificar cabeceras

Probar que la cabecera PNA esta presente:

```bash
# Preflight OPTIONS
curl -k -I -X OPTIONS https://localhost:11443/api/tags

# Deberia mostrar:
# Access-Control-Allow-Private-Network: true
```

### Paso 6: Aceptar certificado en el navegador

1. Abrir `https://192.168.20.174:11443/api/tags` en Chrome/Edge
2. Hacer clic en "Avanzado" > "Acceder a 192.168.20.174"
3. Verificar que se muestra el JSON de modelos

### Paso 7: Configurar el Copilot

En la configuracion del AI Copilot, establecer:
- **URL Ollama**: `https://192.168.20.174:11443`

## Notas tecnicas

- La cabecera `Access-Control-Allow-Private-Network` es obligatoria para que Chrome permita fetch desde HTTPS publico a IP privada
- El certificado debe aceptarse manualmente en cada navegador que vaya a usar el Copilot
- Esta solucion funciona para todos los usuarios de la LAN que accedan a la aplicacion
- Si en el futuro se quiere acceso desde internet, sera necesario un dominio real con certificado Let's Encrypt
