# Correcciones Finales - Panel de Eventos

## 🔧 Problemas Solucionados

### 1. Rutas de Archivos Estáticos (CSS/JS)
**Problema:** Los archivos CSS y JS no se cargaban porque el `<base href>` se establecía con JavaScript después de que el navegador ya había parseado los `<link>` tags.

**Solución:** Reemplazado el `<base href>` dinámico con JavaScript por un tag `<base>` estático en el HTML:

```html
<!-- ANTES (no funcionaba) -->
<script>
    const isLocal = window.location.hostname === 'localhost' || ...;
    const baseHref = isLocal ? '/' : '/panel/';
    document.write('<base href="' + baseHref + '">');
</script>

<!-- DESPUÉS (funciona correctamente) -->
<base href="/panel/">
```

**Archivos modificados:**
- ✅ index.html
- ✅ referidos.html
- ✅ invitados-especiales.html

### 2. Configuración de API
**Problema:** Usar `api.encuentra-facil.com` causaba errores de CORS.

**Solución:** Configurado para usar el proxy de nginx en el mismo dominio:

```javascript
production: {
    API_BASE_URL: 'https://evento.encuentra-facil.com/api',  // Usa el proxy de nginx
    BASE_PATH: '/panel/',
    EVENT_ID: 'evento-prod',
}
```

**Beneficios:**
- ✅ Sin problemas de CORS
- ✅ Nginx hace proxy a `localhost:3000` internamente
- ✅ No expone la API interna
- ✅ Todo el tráfico va por el mismo dominio con SSL

---

## 📊 Configuración Final

### Flujo de Requests

```
Browser → https://evento.encuentra-facil.com/panel/
         ↓
      [Nginx]
         ↓
   /var/www/panel/index.html (con auth básica)
         ↓
   Carga: /panel/style.css, /panel/script.js, etc. (sin auth)
```

```
Browser → https://evento.encuentra-facil.com/api/stats/tokens
         ↓
      [Nginx]
         ↓
   Proxy → http://localhost:3000/api/stats/tokens
         ↓
   [Backend Node.js]
```

### Nginx Configuration (actual)

```nginx
# Panel HTML - con autenticación
location /panel {
    root /var/www;
    index index.html;
    auth_basic "Panel de Accesos";
    auth_basic_user_file /etc/nginx/.htpasswd-panel;
    try_files $uri $uri/ /panel/index.html;
}

# Archivos estáticos del panel - sin autenticación
location ~ ^/panel/.*\.(css|js|webp|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$ {
    root /var/www;
    auth_basic off;
}

# API - proxy a localhost:3000
location /api {
    proxy_pass http://localhost:3000;
    # ... headers de proxy
}
```

---

## ✅ Estado Actual

### Archivos Desplegados
- ✅ HTML con `<base href="/panel/">` estático
- ✅ config.env.js con `API_BASE_URL: 'https://evento.encuentra-facil.com/api'`
- ✅ Todos los CSS, JS y assets

### Funcionamiento
- ✅ Las rutas de archivos estáticos se resuelven correctamente
- ✅ La API se accede sin problemas de CORS
- ✅ Nginx hace proxy transparente al backend
- ✅ Autenticación básica protege las páginas HTML
- ✅ Archivos estáticos accesibles sin autenticación

---

## 🧪 Verificación

### Probar en el navegador:
1. Ir a: https://evento.encuentra-facil.com/panel/
2. Ingresar credenciales de autenticación básica
3. Verificar que:
   - ✅ Los estilos se cargan correctamente
   - ✅ Los scripts funcionan
   - ✅ Las llamadas a la API funcionan sin errores de CORS
   - ✅ Las páginas de referidos e invitados especiales funcionan

### Verificar en la consola del navegador:
```javascript
// Debería mostrar: https://evento.encuentra-facil.com/api
console.log(API_CONFIG.BASE_URL);

// Debería mostrar: evento-prod
console.log(API_CONFIG.eventId);
```

---

## 📝 Notas Importantes

### Para Desarrollo Local
Si necesitas probar localmente, tendrás que cambiar temporalmente el `<base href>` en los archivos HTML:

```html
<!-- Para desarrollo local -->
<base href="/">

<!-- Para producción -->
<base href="/panel/">
```

O mejor aún, usa el servidor local en el puerto 8085 y accede con:
```
http://localhost:8085/
```

### Para Futuros Deploys
El script `deploy.sh` automáticamente:
1. Convierte `ENVIRONMENT` a 'production'
2. Copia todos los archivos necesarios
3. Configura permisos correctos

Simplemente ejecuta:
```bash
./deploy.sh
```

---

**Última actualización:** 2026-02-04 17:05 (UTC-5)
