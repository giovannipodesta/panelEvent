# API de Gestión — Panel de Invitados

**Base URL:** `https://evento.encuentra-facil.com/api`  
**Autenticación:** Basic Auth (Nginx) — todos los endpoints excepto `/generar-token`

---

## Tipos de Personas

| Tipo | Origen | Aprobación | Tiene categoría | Tiene token |
|------|--------|------------|-----------------|-------------|
| **Solicitante** | Formulario público (`POST /usersRegister`) | Manual (admin) | Sí | No |
| **Invitado VIP** | Admin envía bulk (`POST /invitaciones/bulk/:instance`) | Automática | No | Sí (`maxReferidos ≥ 1`) |
| **Referido** | VIP comparte cupo (`POST /solicitar-referido`) | Manual (admin) | No | Sí (`maxReferidos: 0`) |

---

## Endpoints por Página del Panel

### `/` — Registro de Invitados VIP

| Acción | Método | Endpoint | Body |
|--------|--------|----------|------|
| Estadísticas de tokens | `GET` | `/stats/tokens` | — |
| Enviar invitaciones bulk | `POST` | `/invitaciones/bulk/{EVENT_ID}` | `{ "invitados": [{ "numero": "0991234567", "maxReferidos": 1 }] }` |

**`GET /stats/tokens`** — Response:
```json
{
  "stats": {
    "total": 50,
    "habilitados": 30,
    "consumidos": 20,
    "aceptacion": { "aceptados": 15, "rechazados": 3, "sinRespuesta": 2 }
  }
}
```

**`POST /invitaciones/bulk/{EVENT_ID}`** — Response:
```json
{
  "success": true,
  "message": "Invitaciones procesadas",
  "resultados": {
    "nuevos": 5,
    "existentes": 0,
    "errores": 0
  }
}
```

---

### `/admin` — Administración

#### Sub-tab: Usuarios Pendientes

| Acción | Método | Endpoint | Body |
|--------|--------|----------|------|
| Listar solicitantes pendientes | `GET` | `/gestion/registros?tipo=solicitante&aprobado=false` | — |
| Aprobar usuario (envía QR) | `PATCH` | `/users/{id_uuid}/aprobar` | `{ "asistencia": true }` |

**`GET /gestion/registros`** — Query params:

| Param | Tipo | Descripción |
|-------|------|-------------|
| `tipo` | `solicitante \| vip \| referido` | Filtrar por tipo |
| `aprobado` | `true \| false` | Estado de aprobación |
| `asistencia` | `true \| false` | Asistencia confirmada |
| `categoria` | UUID | Solo solicitantes de esta categoría |
| `buscar` | string | Búsqueda por nombre, cédula, teléfono, email |
| `pagina` | number | Página (default: 1) |
| `limite` | number | Resultados por página (default: 50) |

**Response:**
```json
{
  "success": true,
  "total": 13,
  "registros": [
    {
      "id_uuid": "uuid",
      "cedula": "0932665565",
      "nombre": "ARIAS TIPAN ARIEL",
      "telefono": "0990939856",
      "email": "ariel@gmail.com",
      "categoria": "uuid-cat",
      "aprobado": false,
      "asistencia": false,
      "tipo": "solicitante",
      "tokenInfo": null,
      "mensajes": []
    }
  ]
}
```

**Cómo distinguir tipos en `/gestion/registros`:**

| Campo | Solicitante | VIP | Referido |
|-------|-------------|-----|----------|
| `tipo` | `"solicitante"` | `"vip"` | `"referido"` |
| `categoria` | UUID | `null` | `null` |
| `email` | tiene | `null` | `null` |
| `tokenInfo` | `null` | `{ tokenId, maxReferidos }` | `{ tokenId, maxReferidos: 0 }` |

#### Sub-tab: Estadísticas

| Acción | Método | Endpoint |
|--------|--------|----------|
| Stats de usuarios | `GET` | `/stats/usuarios` |
| Stats de tokens | `GET` | `/stats/tokens` |
| Stats de Evolution API | `GET` | `/evolution-stats/stats/{EVENT_ID}` |
| Mensajes programados | `GET` | `/evolution-stats/programados/{EVENT_ID}` |
| Historial de envíos | `GET` | `/evolution-stats/historial/{EVENT_ID}?limite=20` |

**`GET /stats/usuarios`** — Response:
```json
{
  "total": 120,
  "aprobados": 85,
  "pendientes": 35,
  "conAsistencia": 40
}
```

**`GET /evolution-stats/stats/{EVENT_ID}`** — Response:
```json
{
  "totalMensajes": 200,
  "enviados": 180,
  "fallidos": 5,
  "pendientes": 15
}
```

**`GET /evolution-stats/programados/{EVENT_ID}`** — Response:
```json
{
  "total": 3,
  "envios": [
    {
      "telefono": "0991234567",
      "horaEcuador": "14:30",
      "estado": "PENDIENTE",
      "timestampEnvio": 1707500000000,
      "tiempoRestante": { "texto": "2h 15m" }
    }
  ]
}
```

**`GET /evolution-stats/historial/{EVENT_ID}?limite=20`** — Response:
```json
{
  "total": 50,
  "envios": [
    {
      "telefono": "0991234567",
      "horaEcuador": "12:05",
      "estado": "ENVIADO"
    }
  ]
}
```

---

### `/invitados` — Lista de Invitados Especiales

| Acción | Método | Endpoint | Body |
|--------|--------|----------|------|
| Listar invitados (VIP + referidos) | `GET` | `/gestion/invitados` | — |
| Actualizar max referidos | `PATCH` | `/panel/actualizar-max-referidos` | `{ "tokenId": "uuid", "maxReferidos": 3 }` |
| Ver detalle de invitado | `GET` | `/gestion/invitado/{telefono}` | — |
| Revocar invitación | `DELETE` | `/gestion/invitacion/{tokenId}` | — |

**`GET /gestion/invitados`** — Query params:

| Param | Tipo | Descripción |
|-------|------|-------------|
| `tipo` | `vip \| referido` | Filtrar por tipo |
| `estado` | `habilitado \| consumido` | Estado del token |
| `aceptacion` | `ACEPTADO \| RECHAZADO` | Respuesta del invitado |
| `buscar` | string | Búsqueda por teléfono, nombre o cédula |
| `pagina` | number | Página (default: 1) |
| `limite` | number | Resultados por página (default: 50) |

**Response:**
```json
{
  "success": true,
  "total": 35,
  "pagina": 1,
  "totalPaginas": 4,
  "invitados": [
    {
      "tokenId": "uuid",
      "tipo": "vip",
      "token": "hex-string",
      "telefono": "0983248236",
      "nombre": null,
      "cedula": null,
      "estado": "habilitado",
      "aceptacion": null,
      "maxReferidos": 1,
      "referidosUsados": 0,
      "referidoPor": null,
      "createdAt": "2026-02-08T16:55:25.107Z",
      "consumidoAt": null,
      "expiraEn": null,
      "usuario": null,
      "invitacionEnviada": false,
      "qrEnviado": false,
      "mensajes": []
    },
    {
      "tokenId": "uuid",
      "tipo": "referido",
      "telefono": "0991234567",
      "estado": "consumido",
      "aceptacion": "ACEPTADO",
      "maxReferidos": 0,
      "referidoPor": { "telefono": "0983248236", "nombre": "PÉREZ JUAN" },
      "usuario": {
        "id_uuid": "uuid",
        "nombre": "LÓPEZ MARIA",
        "aprobado": true,
        "asistencia": false
      },
      "qrEnviado": true
    }
  ]
}
```

**`GET /gestion/invitado/{telefono}`** — Detalle completo:
```json
{
  "success": true,
  "invitado": {
    "token": {
      "id": "uuid",
      "estado": "consumido",
      "aceptacion": "ACEPTADO",
      "telefono": "0983248236",
      "maxReferidos": 1
    },
    "referidoPor": null,
    "referidos": [
      { "id": "uuid", "telefono": "0991234567", "estado": "habilitado", "aceptacion": null }
    ],
    "usuario": {
      "id_uuid": "uuid",
      "nombre": "PÉREZ JUAN",
      "cedula": "0912345678",
      "aprobado": true
    },
    "mensajes": [],
    "enviosProgramados": []
  }
}
```

---

### `/referidos` — Gestión de Referidos

| Acción | Método | Endpoint | Body |
|--------|--------|----------|------|
| Listar referidos con info del VIP padre | `GET` | `/panel/invitados-especiales` | — |
| Aprobar referido (envía QR) | `POST` | `/panel/aprobar-referido` | `{ "tokenId": "uuid" }` |
| Rechazar referido (libera slot) | `POST` | `/panel/rechazar-referido` | `{ "tokenId": "uuid" }` |

**`GET /panel/invitados-especiales`** — Response:
```json
{
  "invitados": [
    {
      "id": "uuid",
      "telefono": "0991234567",
      "estado": "consumido",
      "aceptacion": null,
      "maxReferidos": 0,
      "referidoPor": "0983248236",
      "referidoPorCedula": "0912345678",
      "nombre": "LÓPEZ MARIA",
      "cedula": "0912345679"
    }
  ]
}
```

---

### `/token` — Generador de Tokens

| Acción | Método | Endpoint | Auth | Body |
|--------|--------|----------|------|------|
| Generar token público | `POST` | `/generar-token` | **No** (público) | — |

**Response:**
```json
{
  "success": true,
  "token": "hex-string",
  "url": "https://evento.encuentra-facil.com/registro?token=hex-string",
  "id": "uuid"
}
```

---

## Endpoints de Gestión Avanzada

Acciones administrativas disponibles para integrar en cualquier página del panel.

### Revocar Invitación

```
DELETE /gestion/invitacion/{tokenId}
```

Invalida token → `consumido` + `RECHAZADO`. Cancela mensajes pendientes y envíos en Evolution API.

```json
{
  "success": true,
  "message": "Invitación revocada",
  "detalle": {
    "tokenInvalidado": true,
    "mensajesCancelados": 1,
    "envioEvolutionCancelado": true,
    "telefono": "0983248236"
  }
}
```

### Eliminar Registro Completo

```
DELETE /gestion/registro/{id_uuid}
```

**⚠️ Irreversible.** Elimina: envíos programados, mensajes, tokens y usuario de la BD.

```json
{
  "success": true,
  "message": "Registro eliminado completamente",
  "detalle": {
    "usuario": { "nombre": "ARIAS TIPAN ARIEL", "cedula": "0932665565" },
    "mensajesEliminados": 2,
    "tokensInvalidados": 1
  }
}
```

### Anular QR

```
PATCH /gestion/qr/{id_uuid}/anular
```

Desaprueba usuario (`aprobado → false`, `asistencia → false`) y marca QRs como `CANCELADO`.

```json
{
  "success": true,
  "message": "QR anulado exitosamente",
  "detalle": {
    "usuario": { "nombre": "ARIAS TIPAN ARIEL", "cedula": "0932665565" },
    "aprobado": false,
    "qrsCancelados": 1
  }
}
```

### Revocar Aprobación

```
PATCH /gestion/usuario/{id_uuid}/desaprobar
```

Solo revoca aprobación. No anula mensajes ni elimina datos.

### Eliminar Token

```
DELETE /gestion/token/{tokenId}
```

Elimina token de la BD. Falla si tiene referidos activos.

---

## Resumen — Todos los Endpoints

### Lectura (GET)

| # | Endpoint | Descripción | Página |
|---|----------|-------------|--------|
| 1 | `GET /stats/tokens` | Estadísticas de tokens | `/`, `/admin` |
| 2 | `GET /stats/usuarios` | Estadísticas de usuarios | `/admin` |
| 3 | `GET /evolution-stats/stats/{EVENT_ID}` | Stats de Evolution API | `/admin` |
| 4 | `GET /evolution-stats/programados/{EVENT_ID}` | Mensajes programados | `/admin` |
| 5 | `GET /evolution-stats/historial/{EVENT_ID}?limite=N` | Historial de envíos | `/admin` |
| 6 | `GET /gestion/registros` | Listar usuarios (todos los tipos) | `/admin` |
| 7 | `GET /gestion/invitados` | Listar invitados VIP + referidos (tokens) | `/invitados` |
| 8 | `GET /gestion/invitado/{telefono}` | Detalle de invitado | `/invitados` |
| 9 | `GET /panel/invitados-especiales` | Referidos con info del VIP padre | `/referidos` |

### Escritura (POST / PATCH)

| # | Endpoint | Descripción | Página |
|---|----------|-------------|--------|
| 10 | `POST /generar-token` | Generar token público (sin auth) | `/token` |
| 11 | `POST /invitaciones/bulk/{EVENT_ID}` | Enviar invitaciones masivas | `/` |
| 12 | `PATCH /users/{id_uuid}/aprobar` | Aprobar solicitante → envía QR | `/admin` |
| 13 | `PATCH /panel/actualizar-max-referidos` | Cambiar límite de referidos | `/invitados` |
| 14 | `POST /panel/aprobar-referido` | Aprobar referido → envía QR | `/referidos` |
| 15 | `POST /panel/rechazar-referido` | Rechazar referido → libera slot | `/referidos` |

### Gestión avanzada (PATCH / DELETE)

| # | Endpoint | Descripción | Aplica a |
|---|----------|-------------|----------|
| 16 | `DELETE /gestion/invitacion/{tokenId}` | Revocar invitación + cancelar envíos | VIP, Referido |
| 17 | `DELETE /gestion/registro/{id_uuid}` | Eliminar registro completo (⚠️) | Todos |
| 18 | `PATCH /gestion/qr/{id_uuid}/anular` | Anular QR + desaprobar | Todos |
| 19 | `PATCH /gestion/usuario/{id_uuid}/desaprobar` | Solo revocar aprobación | Todos |
| 20 | `DELETE /gestion/token/{tokenId}` | Eliminar token | VIP, Referido |

---

## Flujos Típicos

### Solicitante: aprobación
```
GET  /gestion/registros?tipo=solicitante&aprobado=false   → ver pendientes
PATCH /users/{uuid}/aprobar                                → aprobar + enviar QR
```

### Solicitante: rechazo
```
DELETE /gestion/registro/{uuid}                            → eliminar registro completo
```

### VIP: enviar invitaciones
```
POST /invitaciones/bulk/{EVENT_ID}  { invitados: [...] }   → enviar por WhatsApp
GET  /gestion/invitados?tipo=vip                            → verificar estado
```

### VIP: revocar
```
DELETE /gestion/invitacion/{tokenId}                        → revocar invitación
```

### Referido: aprobar
```
GET  /panel/invitados-especiales                            → ver referidos pendientes
POST /panel/aprobar-referido  { tokenId: "..." }            → aprobar + enviar QR
```

### Referido: rechazar
```
POST /panel/rechazar-referido { tokenId: "..." }            → rechazar (libera slot al VIP)
```

### Cualquier tipo: anular QR ya enviado
```
PATCH /gestion/qr/{uuid}/anular                            → anular QR + desaprobar
```
