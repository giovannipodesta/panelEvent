#!/bin/bash

# Script para actualizar la configuración de nginx en evolution-evento
# Corrige el problema de rutas del panel

set -e

VM_NAME="evolution-evento"
VM_USER="encuentrafacil"
ZONE="us-east4-a"

echo "Actualizando configuración de nginx..."

# Crear el archivo de configuración actualizado
cat > /tmp/nginx-panel-fix.conf << 'EOF'
server {
    listen 80;
    server_name evento.encuentra-facil.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name evento.encuentra-facil.com;

    ssl_certificate /etc/letsencrypt/live/evento.encuentra-facil.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/evento.encuentra-facil.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Panel de Accesos - CORREGIDO para usar alias
    location /panel/ {
        alias /var/www/panel/;
        index index.html;
        auth_basic "Panel de Accesos";
        auth_basic_user_file /etc/nginx/.htpasswd-panel;
        try_files $uri $uri/ /panel/index.html;
    }

    # Archivos estáticos del panel - sin autenticación
    location ~ ^/panel/.*\.(css|js|webp|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$ {
        alias /var/www/panel/;
        auth_basic off;
        # Reescribir la ruta para quitar /panel/
        rewrite ^/panel/(.*)$ /$1 break;
    }

    # WhatsApp QR Monitor - con autenticación básica
    location /qr {
        auth_basic "WhatsApp Monitor";
        auth_basic_user_file /etc/nginx/.htpasswd-panel;
        proxy_pass http://localhost:8080/qr;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Evolution API endpoints (protegidos)
    location ~ ^/(instance|message|chat|group|evento)/ {
        auth_basic "Evolution API";
        auth_basic_user_file /etc/nginx/.htpasswd-panel;
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Server Register API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Assets estáticos del backend (imágenes, etc) - NO del panel
    location /assets {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Archivos estáticos del backend (JS, CSS)
    location /static {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Bloquear todo lo demás
    location / {
        return 404;
    }
}
EOF

# Copiar el archivo a la VM
echo "Copiando configuración a la VM..."
gcloud compute scp --zone=${ZONE} /tmp/nginx-panel-fix.conf ${VM_USER}@${VM_NAME}:/tmp/

# Hacer backup y aplicar la nueva configuración
echo "Aplicando configuración..."
gcloud compute ssh ${VM_USER}@${VM_NAME} --zone=${ZONE} << 'ENDSSH'
# Backup de la configuración actual
sudo cp /etc/nginx/sites-available/evento.encuentra-facil.com \
     /etc/nginx/sites-available/evento.encuentra-facil.com.bak-$(date +%Y%m%d-%H%M%S)

# Aplicar nueva configuración
sudo mv /tmp/nginx-panel-fix.conf /etc/nginx/sites-available/evento.encuentra-facil.com

# Verificar configuración
sudo nginx -t

# Si la verificación es exitosa, recargar nginx
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "✓ Nginx recargado exitosamente"
else
    echo "✗ Error en la configuración de nginx"
    exit 1
fi
ENDSSH

# Limpiar archivo temporal local
rm /tmp/nginx-panel-fix.conf

echo "✓ Configuración actualizada exitosamente"
