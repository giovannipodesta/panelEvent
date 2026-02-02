# Endpoints de Invitaciones y Gestión de Usuarios

## ⚠️ IMPORTANTE: Cambio de Instancia
**La instancia cambió de `evento-ef` a `evento-prod`**

---

## 📤 Endpoints de Invitaciones

### POST /api/invitaciones/bulk/evento-prod
**Enviar invitaciones masivas con tokens únicos programados**

**Método:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "numeros": [
    "0962888416",
    "0987654321",
    "0999999999"
  ]
}
```

**Validaciones:**
- `numeros` debe ser un array
- No puede estar vacío
- Cada número debe ser string

**Response Success (200):**
```json
{
  "message": "Procesamiento masivo completado",
  "totalProcesados": 3,
  "detalles": [
    {
      "telefono": "0962888416",
      "url": "https://evento.encuentra-facil.com/api/registro/abc123...",
      "timestamp": 1769902964141
    },
    {
      "telefono": "0987654321",
      "url": "https://evento.encuentra-facil.com/api/registro/def456...",
      "timestamp": 1769902970250
    }
  ]
}
```

**Response Error (400):**
```json
{
  "error": "Solicitud inválida",
  "errorCode": "INVALID_INPUT",
  "message": "El cuerpo debe contener { numeros: [...] }"
}
```

**Response Error (502):**
```json
{
  "error": "Error de comunicación externa",
  "errorCode": "EXTERNAL_API_ERROR",
  "message": "Se generaron los tokens pero falló el envío a WhatsApp",
  "details": "...",
  "data": [...]
}
```

**Comportamiento:**
1. Genera un token único para cada número
2. Crea URL de registro: `https://evento.encuentra-facil.com/api/registro/{token}`
3. Programa envío en horario Ecuador (08:00 - 20:00)
4. Envía a Evolution API para programación
5. Retorna detalles de todos los envíos

---

## 🎟️ Endpoints de Tokens

### POST /api/generar-token
**Generar un nuevo token único (límite: 50 tokens)**

**Método:** `POST`

**Request Body:** Ninguno

**Response Success (200):**
```json
{
  "message": "Token generado exitosamente",
  "token": "abc123def456...",
  "url": "https://evento.encuentra-facil.com/api/registro/abc123def456...",
  "estado": "habilitado",
  "createdAt": "2026-01-31T20:00:00.000Z"
}
```

**Response Error (400):**
```json
{
  "error": "Límite alcanzado",
  "errorCode": "TOKEN_LIMIT_REACHED",
  "message": "Se ha alcanzado el límite de 50 tokens únicos"
}
```

---

### POST /api/consumir-token
**Consumir un token con una cédula**

**Método:** `POST`

**Request Body:**
```json
{
  "token": "abc123def456...",
  "cedula": "1234567890"
}
```

**Validaciones:**
- Token requerido
- Cédula requerida (10 caracteres exactos)

**Response Success (200):**
```json
{
  "message": "Token consumido exitosamente",
  "token": {
    "id": "uuid",
    "token": "abc123...",
    "estado": "consumido",
    "cedula": "1234567890",
    "createdAt": "2026-01-31T20:00:00.000Z",
    "consumidoAt": "2026-01-31T20:05:00.000Z"
  }
}
```

**Response Error (404):**
```json
{
  "error": "Token no encontrado",
  "errorCode": "TOKEN_NOT_FOUND",
  "message": "El token proporcionado no existe"
}
```

**Response Error (409):**
```json
{
  "error": "Token ya consumido",
  "errorCode": "TOKEN_ALREADY_CONSUMED",
  "message": "Este token ya ha sido utilizado"
}
```

---

### GET /api/registro/:token
**Servir página HTML de registro**

**Método:** `GET`

**URL:** `/api/registro/{token}`

**Response:** HTML page (index.html)

**Validaciones:**
- Token debe existir en BD
- Token debe estar habilitado (no consumido)

**Response Error (404):** HTML con mensaje de error

---

## 👥 Endpoints de Usuarios

### POST /api/usersRegister
**Registrar nuevo usuario (validado con API de cédulas)**

**Método:** `POST`

**Request Body:**
```json
{
  "cedula": "1234567890",
  "categoria": "VIP",
  "email": "usuario@example.com",
  "telefono": "0987654321"
}
```

**Validaciones:**
- Cédula única (no puede repetirse)
- Consulta API externa para validar cédula
- Email y teléfono opcionales

---

### POST /api/usersEspecial
**Registrar usuario especial (sin validación de cédula)**

**Método:** `POST`

**Request Body:**
```json
{
  "cedula": "1234567890",
  "nombre": "Juan Pérez",
  "categoria": "VIP",
  "email": "usuario@example.com",
  "telefono": "0987654321"
}
```

---

### GET /api/users/:id_uuid
**Obtener usuario por UUID**

**Método:** `GET`

**URL:** `/api/users/{uuid}`

**Response:**
```json
{
  "message": "Usuario encontrado",
  "user": {
    "id_uuid": "uuid",
    "cedula": "1234567890",
    "nombre": "Juan Pérez",
    "categoria": "VIP",
    "email": "usuario@example.com",
    "telefono": "0987654321",
    "aprobado": true,
    "asistencia": false,
    "createdAt": "2026-01-31T20:00:00.000Z"
  }
}
```

---

### PATCH /api/users/:id_uuid/asistencia
**Actualizar estado de asistencia**

**Método:** `PATCH`

**URL:** `/api/users/{uuid}/asistencia`

**Request Body:**
```json
{
  "asistencia": true
}
```

**Response:**
```json
{
  "message": "Estado de asistencia actualizado exitosamente",
  "user": {
    "id_uuid": "uuid",
    "asistencia": true
  }
}
```

---

### PATCH /api/users/:id_uuid/aprobar
**Aprobar usuario y enviar QR automáticamente**

**Método:** `PATCH`

**URL:** `/api/users/{uuid}/aprobar`

**Request Body:** Ninguno

**Response:**
```json
{
  "message": "Usuario aprobado exitosamente",
  "user": {
    "id_uuid": "uuid",
    "aprobado": true
  },
  "telefono": "0987654321",
  "mensajeId": "uuid-mensaje"
}
```

**Comportamiento:**
1. Marca usuario como aprobado
2. Crea registro de mensaje en BD (estado: PROCESANDO)
3. Envía QR a través de Evolution API
4. Actualiza mensaje a ENVIADO si exitoso
5. Actualiza mensaje a ERROR si falla

---

### GET /api/usuarios-asistentes
**Listar usuarios con asistencia confirmada**

**Método:** `GET`

**Response:**
```json
{
  "message": "Usuarios con asistencia confirmada",
  "total": 85,
  "usuarios": [
    {
      "id_uuid": "uuid",
      "cedula": "1234567890",
      "nombre": "Juan Pérez",
      "categoria": "VIP",
      "asistencia": true
    }
  ]
}
```

---

### GET /api/usuarios-pendientes
**Listar usuarios pendientes de aprobación**

**Método:** `GET`

**Response:**
```json
{
  "message": "Usuarios pendientes de aprobación",
  "total": 20,
  "usuarios": [
    {
      "id_uuid": "uuid",
      "cedula": "1234567890",
      "nombre": "Juan Pérez",
      "categoria": "VIP",
      "email": "usuario@example.com",
      "telefono": "0987654321",
      "aprobado": false,
      "createdAt": "2026-01-31T20:00:00.000Z"
    }
  ]
}
```

---

## 📊 Endpoints de Estadísticas

Ver archivo `PANEL_API.md` para documentación completa de:
- `GET /api/stats/mensajes`
- `GET /api/stats/mensajes/pendientes`
- `GET /api/stats/mensajes/historial`
- `GET /api/stats/tokens`
- `GET /api/stats/usuarios`

---

## ❌ Endpoints NO Disponibles

### ❌ GET /api/invitaciones/bulk/evento-ef
**Este endpoint NO existe**

**Error:**
```
Cannot GET /api/invitaciones/bulk/evento-ef
```

**Razones:**
1. Solo existe el método `POST` (no `GET`)
2. La instancia cambió de `evento-ef` a `evento-prod`

**Corrección necesaria en el frontend:**
```javascript
// ❌ INCORRECTO
fetch('/api/invitaciones/bulk/evento-ef', { method: 'GET' })

// ✅ CORRECTO
fetch('/api/invitaciones/bulk/evento-prod', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ numeros: ['0987654321', '0999999999'] })
})
```

---

## 🔄 Resumen de Métodos HTTP

| Endpoint | GET | POST | PATCH | DELETE |
|----------|-----|------|-------|--------|
| `/invitaciones/bulk/evento-prod` | ❌ | ✅ | ❌ | ❌ |
| `/generar-token` | ❌ | ✅ | ❌ | ❌ |
| `/consumir-token` | ❌ | ✅ | ❌ | ❌ |
| `/registro/:token` | ✅ | ❌ | ❌ | ❌ |
| `/usersRegister` | ❌ | ✅ | ❌ | ❌ |
| `/usersEspecial` | ❌ | ✅ | ❌ | ❌ |
| `/users/:id_uuid` | ✅ | ❌ | ❌ | ❌ |
| `/users/:id_uuid/asistencia` | ❌ | ❌ | ✅ | ❌ |
| `/users/:id_uuid/aprobar` | ❌ | ❌ | ✅ | ❌ |
| `/usuarios-asistentes` | ✅ | ❌ | ❌ | ❌ |
| `/usuarios-pendientes` | ✅ | ❌ | ❌ | ❌ |

---

## 🛠️ Ejemplo de Uso Completo

### Flujo: Enviar Invitaciones Masivas

```javascript
// 1. Preparar lista de números
const numeros = [
  "0962888416",
  "0987654321",
  "0999999999"
];

// 2. Enviar a API
const response = await fetch('https://evento.encuentra-facil.com/api/invitaciones/bulk/evento-prod', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ numeros })
});

// 3. Procesar respuesta
const result = await response.json();

if (response.ok) {
  console.log(`✅ ${result.totalProcesados} invitaciones enviadas`);
  result.detalles.forEach(detalle => {
    console.log(`📱 ${detalle.telefono} → ${detalle.url}`);
  });
} else {
  console.error(`❌ Error: ${result.message}`);
}
```

### Flujo: Aprobar Usuario y Enviar QR

```javascript
// 1. Obtener UUID del usuario
const userId = "abc-123-def-456";

// 2. Aprobar usuario
const response = await fetch(`https://evento.encuentra-facil.com/api/users/${userId}/aprobar`, {
  method: 'PATCH'
});

// 3. Verificar resultado
const result = await response.json();

if (response.ok) {
  console.log(`✅ Usuario aprobado: ${result.user.id_uuid}`);
  console.log(`📤 QR enviado a: ${result.telefono}`);
  console.log(`📝 Mensaje ID: ${result.mensajeId}`);
} else {
  console.error(`❌ Error: ${result.message}`);
}
```

---

## 🔐 Autenticación

Algunos endpoints pueden requerir autenticación básica en producción:
- Usuario: `gpodesta`
- Contraseña: `3ncuentr4e.C25`

```javascript
fetch('/api/usuarios-pendientes', {
  headers: {
    'Authorization': 'Basic ' + btoa('gpodesta:3ncuentr4e.C25')
  }
});
```
