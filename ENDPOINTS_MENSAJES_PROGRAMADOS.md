# Endpoints de Mensajes Programados - Evolution API

## Base URL
```
https://evento.encuentra-facil.com
```

## Headers requeridos
```http
apikey: evento2025secret
Content-Type: application/json
```

---

## 1. Listar Mensajes Programados Pendientes

### Endpoint
```http
GET /evento/programados?instanceName=evento-prod
```

### Response
```json
{
  "success": true,
  "total": 3,
  "envios": [
    {
      "id": "cm5abc123...",
      "telefono": "593959486261",
      "url": "https://evento.encuentra-facil.com/api/registro/token123",
      "estado": "pendiente",
      "timestampEnvio": "1738450800000",
      "intentos": 0,
      "creadoAt": "2026-02-01T20:00:00.000Z",
      "Instance": {
        "name": "evento-prod"
      }
    },
    {
      "id": "cm5def456...",
      "telefono": "593987654321",
      "url": "https://evento.encuentra-facil.com/api/registro/token456",
      "estado": "pendiente",
      "timestampEnvio": "1738454400000",
      "intentos": 0,
      "creadoAt": "2026-02-01T20:05:00.000Z",
      "Instance": {
        "name": "evento-prod"
      }
    }
  ]
}
```

### Cómo calcular tiempo restante (JavaScript)
```javascript
// Ejemplo: Calcular tiempo restante para cada envío
function calcularTiempoRestante(timestampEnvio) {
  const ahora = Date.now();
  const timestampMs = Number(timestampEnvio);
  const diferencia = timestampMs - ahora;
  
  if (diferencia <= 0) {
    return { texto: "Enviando...", segundos: 0 };
  }
  
  const horas = Math.floor(diferencia / (1000 * 60 * 60));
  const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
  
  return {
    texto: `${horas}h ${minutos}m ${segundos}s`,
    horas,
    minutos,
    segundos,
    totalSegundos: Math.floor(diferencia / 1000)
  };
}

// Ejemplo de uso con el response
async function obtenerProgramados() {
  const res = await fetch('https://evento.encuentra-facil.com/evento/programados?instanceName=evento-prod', {
    headers: { 'apikey': 'evento2025secret' }
  });
  const data = await res.json();
  
  data.envios.forEach(envio => {
    const tiempo = calcularTiempoRestante(envio.timestampEnvio);
    const horaEnvio = new Date(Number(envio.timestampEnvio));
    
    console.log(`📱 ${envio.telefono}`);
    console.log(`   URL: ${envio.url}`);
    console.log(`   Hora programada: ${horaEnvio.toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}`);
    console.log(`   Tiempo restante: ${tiempo.texto}`);
    console.log(`   Estado: ${envio.estado}`);
    console.log('---');
  });
}
```

### Convertir timestamp a hora Ecuador (GMT-5)
```javascript
function timestampAHoraEcuador(timestamp) {
  const fecha = new Date(Number(timestamp));
  return fecha.toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

// Ejemplo: timestampAHoraEcuador("1738450800000")
// Resultado: "01/02/2026, 03:00:00 PM"
```

---

## 2. Historial de Mensajes (Enviados/Fallidos)

### Endpoint
```http
GET /evento/historial?instanceName=evento-prod&limite=100
```

### Parámetros opcionales
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `instanceName` | string | Nombre de la instancia (evento-prod) |
| `limite` | number | Cantidad máxima de registros (default: todos) |

### Response
```json
{
  "success": true,
  "total": 25,
  "envios": [
    {
      "id": "cm5xyz789...",
      "telefono": "593959486261",
      "url": "https://evento.encuentra-facil.com/api/registro/token789",
      "estado": "enviado",
      "timestampEnvio": "1738360800000",
      "intentos": 1,
      "creadoAt": "2026-01-31T15:00:00.000Z",
      "enviadoAt": "2026-01-31T20:00:05.123Z",
      "mensajeKey": "3EB0F12345ABCDEF",
      "ultimoError": null,
      "Instance": {
        "name": "evento-prod"
      }
    },
    {
      "id": "cm5fail123...",
      "telefono": "593999999999",
      "url": "https://evento.encuentra-facil.com/api/registro/tokenfail",
      "estado": "error",
      "timestampEnvio": "1738357200000",
      "intentos": 3,
      "creadoAt": "2026-01-31T14:00:00.000Z",
      "enviadoAt": null,
      "mensajeKey": null,
      "ultimoError": "Número no registrado en WhatsApp",
      "Instance": {
        "name": "evento-prod"
      }
    }
  ]
}
```

### Estados posibles
| Estado | Descripción |
|--------|-------------|
| `pendiente` | En cola, esperando el timestamp programado |
| `procesando` | Actualmente enviándose |
| `enviado` | Entregado exitosamente a WhatsApp |
| `error` | Falló el envío (ver `ultimoError`) |
| `cancelado` | Cancelado manualmente |

---

## 3. Estadísticas / Resumen

### Endpoint
```http
GET /evento/evento-prod/stats
```

### Response
```json
{
  "stats": {
    "totalRegistros": 150,
    "mensajesEnviados": 120,
    "mensajesRecibidos": 45,
    "mensajesLeidos": 98,
    "qrsEnviados": 80,
    "qrsLeidos": 65,
    "pendientesQr": 15
  }
}
```

---

## 4. Cancelar Envío Programado

### Endpoint
```http
DELETE /evento/programar?telefono=593959486261&timestamp=1738450800000
```

### Response exitoso
```json
{
  "success": true,
  "message": "Envío cancelado",
  "envio": {
    "id": "cm5abc123...",
    "telefono": "593959486261",
    "estado": "cancelado"
  }
}
```

### Response error (no encontrado)
```json
{
  "success": false,
  "message": "Envío no encontrado"
}
```

---

## Ejemplo Completo: Panel de Monitoreo

```html
<!DOCTYPE html>
<html>
<head>
  <title>Monitor de Envíos</title>
  <style>
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
    .pendiente { background: #fff3cd; }
    .enviado { background: #d4edda; }
    .error { background: #f8d7da; }
  </style>
</head>
<body>
  <h1>Mensajes Programados</h1>
  <table id="tablaProgramados">
    <thead>
      <tr>
        <th>📱 Teléfono</th>
        <th>🔗 URL</th>
        <th>🕐 Hora Programada (Ecuador)</th>
        <th>⏱️ Tiempo Restante</th>
        <th>📊 Estado</th>
        <th>🔄 Intentos</th>
        <th>❌ Error</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>

  <script>
    const API_URL = 'https://evento.encuentra-facil.com';
    const API_KEY = 'evento2025secret';

    async function cargarProgramados() {
      const res = await fetch(`${API_URL}/evento/programados?instanceName=evento-prod`, {
        headers: { 'apikey': API_KEY }
      });
      const data = await res.json();
      
      const tbody = document.querySelector('#tablaProgramados tbody');
      tbody.innerHTML = '';
      
      data.envios.forEach(envio => {
        const horaEcuador = new Date(Number(envio.timestampEnvio))
          .toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });
        const tiempo = calcularTiempoRestante(envio.timestampEnvio);
        
        const tr = document.createElement('tr');
        tr.className = envio.estado;
        tr.innerHTML = `
          <td>${envio.telefono}</td>
          <td><a href="${envio.url}" target="_blank">Ver enlace</a></td>
          <td>${horaEcuador}</td>
          <td class="tiempo-restante" data-timestamp="${envio.timestampEnvio}">${tiempo.texto}</td>
          <td>${envio.estado}</td>
          <td>${envio.intentos}</td>
          <td>${envio.ultimoError || '-'}</td>
          <td><button onclick="cancelar('${envio.telefono}', ${envio.timestampEnvio})">Cancelar</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    function calcularTiempoRestante(timestamp) {
      const diferencia = Number(timestamp) - Date.now();
      if (diferencia <= 0) return { texto: "Enviando..." };
      
      const h = Math.floor(diferencia / 3600000);
      const m = Math.floor((diferencia % 3600000) / 60000);
      const s = Math.floor((diferencia % 60000) / 1000);
      return { texto: `${h}h ${m}m ${s}s` };
    }

    async function cancelar(telefono, timestamp) {
      if (!confirm(`¿Cancelar envío a ${telefono}?`)) return;
      
      await fetch(`${API_URL}/evento/programar?telefono=${telefono}&timestamp=${timestamp}`, {
        method: 'DELETE',
        headers: { 'apikey': API_KEY }
      });
      cargarProgramados();
    }

    // Actualizar tiempo restante cada segundo
    setInterval(() => {
      document.querySelectorAll('.tiempo-restante').forEach(td => {
        const tiempo = calcularTiempoRestante(td.dataset.timestamp);
        td.textContent = tiempo.texto;
      });
    }, 1000);

    // Cargar datos iniciales y refrescar cada 30 segundos
    cargarProgramados();
    setInterval(cargarProgramados, 30000);
  </script>
</body>
</html>
```

---

## Notas Importantes

### Zona horaria
- Los timestamps se almacenan en **UTC (milisegundos)**
- Para mostrar en hora Ecuador: usar `timeZone: 'America/Guayaquil'` (GMT-5)

### Autenticación
- Todos los endpoints requieren header `apikey: evento2025secret`
- Si accedes desde navegador, también necesitas auth básica de nginx (usuario/contraseña del panel)

### Límites
- Espacio mínimo entre envíos masivos: **5 segundos**
- Los mensajes con timestamp pasado se envían inmediatamente al reiniciar el servidor
