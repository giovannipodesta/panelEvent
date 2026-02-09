# Despliegue — Panel de Eventos (SvelteKit)

## Resumen

**Stack:** SvelteKit + adapter-static (genera HTML/CSS/JS puro)  
**VM:** evolution-evento (GCloud, us-east4-a, 2GB RAM)  
**User:** encuentrafacil  
**Target:** /var/www/panel/  
**Auth:** nginx basic auth (`/etc/nginx/.htpasswd-panel`)  
**No se necesita Node.js en el servidor** — solo archivos estáticos.

---

## Deploy

```bash
cd /Users/encuentrafacil/Documents/panelEvent
./deploy.sh
```

El script:
1. Ejecuta `npm run build` con `.env.production`
2. Sube `build/*` a `/tmp/` en la VM vía `gcloud compute scp`
3. Reemplaza `/var/www/panel/` (con backup previo)
4. Configura permisos `www-data:www-data 755`
5. Recarga nginx

---

## Configuración de producción

**`.env.production`:**
```
PUBLIC_API_BASE_URL=https://evento.encuentra-facil.com/api
PUBLIC_EVENT_ID=evento-prod
PUBLIC_BASE_PATH=/panel
```

**`svelte.config.js`:** `base: '/panel'`, adapter-static → `build/`

---

## Nginx (sin cambios necesarios)

La config existente ya es compatible con SPA:

```nginx
location /panel {
    root /var/www;
    index index.html;
    auth_basic "Panel de Accesos";
    auth_basic_user_file /etc/nginx/.htpasswd-panel;
    try_files $uri $uri/ /panel/index.html;
}

location ~ ^/panel/.*\.(css|js|webp|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$ {
    root /var/www;
    auth_basic off;
}

location /api {
    proxy_pass http://localhost:3000;
}
```

`try_files $uri $uri/ /panel/index.html` ya maneja el client-side routing de SvelteKit.

---

## URLs

Todas con auth básica nginx:

- **Panel:** https://evento.encuentra-facil.com/panel/
- **Admin:** https://evento.encuentra-facil.com/panel/admin
- **Referidos:** https://evento.encuentra-facil.com/panel/referidos
- **Invitados:** https://evento.encuentra-facil.com/panel/invitados

---

## Troubleshooting

```bash
# Ver archivos en servidor
gcloud compute ssh encuentrafacil@evolution-evento --zone=us-east4-a \
  --command="ls -la /var/www/panel/"

# Verificar nginx
gcloud compute ssh encuentrafacil@evolution-evento --zone=us-east4-a \
  --command="sudo nginx -t"

# Recargar nginx
gcloud compute ssh encuentrafacil@evolution-evento --zone=us-east4-a \
  --command="sudo systemctl reload nginx"

# Ver logs
gcloud compute ssh encuentrafacil@evolution-evento --zone=us-east4-a \
  --command="tail -20 /var/log/nginx/error.log"

# Restaurar backup
gcloud compute ssh encuentrafacil@evolution-evento --zone=us-east4-a \
  --command="ls /var/www/panel.bak-*"
```

---

## Desarrollo local

```bash
npm run dev          # http://localhost:5173/panel
npm run build        # genera build/
npm run preview      # preview del build
```

---

**Última actualización:** 2026-02-09
