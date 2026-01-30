# Panel de Invitaciones

Sistema de gestión de invitaciones y usuarios para eventos.

## Estructura del Proyecto

```
panelEventoInvitaciones/
├── index.html          # Interfaz principal
├── style.css           # Estilos
├── config.js           # ⭐ Configuración centralizada de APIs
├── categories.js       # Definición de categorías
└── script.js           # Lógica de la aplicación
```

## Configuración de API

Todas las peticiones API están centralizadas en `config.js`. Para cambiar la URL del servidor, solo necesitas modificar un archivo:

### Cambiar la URL del servidor

Edita `config.js` y actualiza `BASE_URL`:

```javascript
const API_CONFIG = {
    BASE_URL: 'http://TU_SERVIDOR:PUERTO/api',
    // ...
};
```

### Endpoints Disponibles

- **Generar Token**: `POST /generar-token`
- **Usuarios Pendientes**: `GET /usuarios-pendientes`
- **Aprobar Usuario**: `POST /users/:id_uuid/aprobar`

## Uso

1. Abre `index.html` en un servidor web local o navegador
2. Haz clic en "Generar Token" para crear un nuevo token de acceso
3. Haz clic en "Cargar Usuarios Pendientes" para ver usuarios que requieren aprobación
4. Usa los filtros de categoría para organizar los usuarios
5. Aprueba usuarios haciendo clic en el botón "Aprobar"

## Características

✅ Configuración centralizada de APIs  
✅ Sistema de tokens de acceso  
✅ Gestión de usuarios pendientes  
✅ Filtros por categoría  
✅ Interfaz responsive
