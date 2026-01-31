# 🔧 Configuración de Variables de Entorno

Este proyecto ahora usa un sistema de configuración basado en entornos para evitar hardcodear valores sensibles.

## 📁 Archivos de Configuración

### `config.env.js` (Versionado en Git)
Archivo base con la estructura de configuración. Contiene valores por defecto para desarrollo y producción.

### `config.env.local.js` (NO versionado - opcional)
Crea este archivo para sobrescribir valores localmente sin afectar el repositorio.

## 🚀 Uso

### Cambiar entre Entornos

Edita `config.env.js` y cambia la propiedad `ENVIRONMENT`:

```javascript
const ENV_CONFIG = {
    ENVIRONMENT: 'development', // o 'production'
    // ...
};
```

### Configuración Actual

**Desarrollo:**
- API Base URL: `http://100.67.71.55:3000/api`

**Producción:**
- API Base URL: `https://evento.encuentra-facil.com/api`

### Agregar Nuevas Variables

1. Abre `config.env.js`
2. Agrega la variable en los objetos `development` y `production`:

```javascript
development: {
    API_BASE_URL: 'http://100.67.71.55:3000/api',
    NEW_VARIABLE: 'valor_dev',
},
production: {
    API_BASE_URL: 'https://evento.encuentra-facil.com/api',
    NEW_VARIABLE: 'valor_prod',
}
```

3. Úsala en tu código:
```javascript
const myValue = ENV_CONFIG.current.NEW_VARIABLE;
```

## 🔒 Seguridad

- ✅ `config.env.js` está versionado (valores por defecto)
- ❌ `config.env.local.js` NO se versiona (valores sensibles locales)
- ❌ Nunca subas credenciales o tokens al repositorio

## 📱 Acceso desde Móvil

El servidor está configurado para aceptar conexiones desde tu red local:

```bash
# Servidor corriendo en:
http://0.0.0.0:8765

# Accede desde tu celular (misma WiFi):
http://192.168.0.102:8765
```

## 🛠️ Estructura de Carga

Los scripts se cargan en este orden en `index.html`:

1. `config.env.js` - Variables de entorno
2. `config.js` - Configuración de API (usa ENV_CONFIG)
3. `categories.js` - Datos de categorías
4. `script.js` - Lógica principal
