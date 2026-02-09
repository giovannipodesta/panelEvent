# Servicio de Consulta Ciudadana — Endpoints

Servicio externo **desactivable** que consulta datos de ciudadanos ecuatorianos directamente desde fuentes públicas (ecuconsultas.com, Función Judicial, SRI).

---

## Configuración

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `CIUDADANO_SERVICE_ENABLED` | `true` / `false` | Activa o desactiva todo el servicio. Si es `false`, nada crashea — todos los endpoints retornan `enabled: false` con datos vacíos. |
| `ECUCONSULTAS_TIMEOUT` | `20000` | Timeout en ms para ecuconsultas.com |
| `FJ_TIMEOUT` | `15000` | Timeout en ms para Función Judicial |
| `SRI_TIMEOUT` | `10000` | Timeout en ms para SRI |

---

## Base path

```
/api/ciudadano
```

---

## Endpoints

### GET `/status`

Estado del servicio.

**Respuesta:**
```json
{
  "success": true,
  "enabled": true,
  "message": "Servicio de consulta ciudadana activo"
}
```

---

### GET `/nombre/:cedula`

Consulta rápida — solo el nombre completo.

**Respuesta:**
```json
{
  "success": true,
  "enabled": true,
  "cedula": "0926178773",
  "nombre": "BRAVO CAMARGO STALYN JOSE"
}
```

---

### GET `/consultar/:cedula`

Datos completos del Registro Civil (nombre, fecha nacimiento, edad, estado civil, cónyuge, profesión, discapacidad, estado vital).

**Respuesta:**
```json
{
  "success": true,
  "enabled": true,
  "cedula": "0926178773",
  "datos": {
    "nombre": "BRAVO CAMARGO STALYN JOSE",
    "fechaNacimiento": "16 de septiembre de 1987",
    "edad": "38 años",
    "estadoCivil": "CASADO",
    "conyuge": "MUÑOZ LITARDO OLINDA JAZMIN",
    "profesion": "ING. ELEC/SIST/COMPUT",
    "discapacidad": "NO",
    "estadoVital": "VIVO"
  }
}
```

---

### GET `/antecedentes/:cedula`

Antecedentes penales (DefensorPenal + causas penales de Función Judicial). **Guarda el resultado automáticamente** en el campo `antecedentesPenales` del usuario si existe en BD.

**Respuesta:**
```json
{
  "success": true,
  "enabled": true,
  "cedula": "0926178773",
  "antecedentes": {
    "tiene": false,
    "cantidad": 0,
    "detalle": []
  }
}
```

Si tiene antecedentes, `detalle` contiene objetos con: `nombre`, `idJuicio`, `nombreDelito`, `nombreMateria`, `nombreJudicatura`, `nombreProvincia`, `nombreTipoAccion`, `fechaProvidencia`.

---

### GET `/causas/:cedula`

Resumen de causas judiciales (como actor y como demandado).

**Respuesta:**
```json
{
  "success": true,
  "enabled": true,
  "cedula": "0926178773",
  "resumen": {
    "totalComoActor": 1,
    "totalComoDemandado": 0,
    "causas": [
      {
        "idJuicio": "0935420100382",
        "nombreDelito": "HABERES E INDEMNIZACIONES LABORALES",
        "fechaIngreso": "2010-05-26T00:00:00-05:00",
        "idMateria": 2
      }
    ],
    "causasPenales": []
  }
}
```

---

### GET `/ruc/:cedula`

Verifica si la persona tiene RUC activo en el SRI.

**Respuesta:**
```json
{
  "success": true,
  "enabled": true,
  "cedula": "0926178773",
  "tieneRUC": true
}
```

---

### POST `/verificar-antecedentes-bulk`

Verifica antecedentes penales de **todos los usuarios aprobados** que aún no han sido verificados (`antecedentesPenales = null`). Aplica rate limiting de 1 req/s entre consultas.

**Respuesta:**
```json
{
  "success": true,
  "totalPendientes": 12,
  "verificados": 12,
  "conAntecedentes": 1,
  "sinAntecedentes": 11
}
```

---

## Flag de antecedentes penales

Campo `antecedentesPenales` en la tabla `users`:

| Valor | Significado |
|-------|-------------|
| `null` | No verificado (servicio desactivado o pendiente) |
| `true` | Tiene antecedentes penales |
| `false` | Sin antecedentes penales |

Se muestra automáticamente en:
- `GET /api/gestion/invitados` → campo `antecedentesPenales` en cada invitado
- Se actualiza automáticamente al aprobar un usuario (`/users/:id/aprobar` y `/panel/aprobar-referido`)

---

## Comportamiento con servicio desactivado

Cuando `CIUDADANO_SERVICE_ENABLED=false`:

- Todos los endpoints retornan `{ enabled: false }` sin error
- La validación de cédulas sigue funcionando (retorna `valid: true` sin nombre)
- El registro de usuarios no se bloquea
- Los antecedentes quedan como `null` (no verificados)
- Nada crashea
