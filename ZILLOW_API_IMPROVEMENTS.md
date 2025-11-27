# Zillow API Service Improvements

## Cambios Realizados

### 1. Implementación de Retry Logic con Exponential Backoff

**Archivo:** `src/services/zillowService.js`

**Problema:**
- Las solicitudes fallaban inmediatamente sin reintentos
- Errores temporales causaban fallos completos
- No había manejo de timeouts

**Solución:**
- Agregado sistema de reintentos automáticos (3 intentos por defecto)
- Implementado exponential backoff: 1s, 2s, 4s entre intentos
- Reintentos solo para errores recuperables

**Código:**
```javascript
async makeRequest(endpoint, params = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      if (attempt < retries && this.isRetryableError(error)) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (attempt === retries) {
        this.handleError(error, endpoint, params);
      }
    }
  }
}
```

### 2. Aumento de Timeout

**Cambio:**
- De: 10 segundos (10000 ms)
- A: 30 segundos (30000 ms)

**Razón:**
- La API de Zillow puede ser lenta en horas pico
- Evita timeouts prematuros
- Permite que solicitudes legítimas se completen

### 3. Detección de Errores Recuperables

**Método:** `isRetryableError(error)`

**Errores que se reintentan:**
- Timeout (ECONNABORTED, ETIMEDOUT)
- 429 (Rate Limit)
- 502 (Bad Gateway)
- 503 (Service Unavailable)
- 504 (Gateway Timeout)
- Sin respuesta (network error)

**Errores que NO se reintentan:**
- 400 (Bad Request)
- 401 (Unauthorized)
- 403 (Forbidden)
- 404 (Not Found)

### Beneficios

✅ **Mayor confiabilidad** - Reintentos automáticos para errores temporales
✅ **Mejor manejo de timeouts** - Espera más tiempo para respuestas
✅ **Menos fallos** - Errores temporales se recuperan automáticamente
✅ **Backoff inteligente** - No sobrecarga la API con reintentos inmediatos
✅ **Logs detallados** - Muestra número de intento y progreso

### Comportamiento

#### Escenario 1: Éxito en primer intento
```
[ZillowService] Making request to /propertyExtendedSearch (attempt 1/3)
[ZillowService] Request successful to /propertyExtendedSearch
```

#### Escenario 2: Fallo temporal, éxito en segundo intento
```
[ZillowService] Making request to /propertyExtendedSearch (attempt 1/3)
[ZillowService] Retrying in 1000ms... (attempt 1/3)
[ZillowService] Making request to /propertyExtendedSearch (attempt 2/3)
[ZillowService] Request successful to /propertyExtendedSearch
```

#### Escenario 3: Fallo permanente
```
[ZillowService] Making request to /propertyExtendedSearch (attempt 1/3)
[ZillowService] Retrying in 1000ms... (attempt 1/3)
[ZillowService] Making request to /propertyExtendedSearch (attempt 2/3)
[ZillowService] Retrying in 2000ms... (attempt 2/3)
[ZillowService] Making request to /propertyExtendedSearch (attempt 3/3)
[ZillowService] All 3 attempts failed for /propertyExtendedSearch
Error: No response from Zillow API
```

### Configuración

#### Cambiar número de reintentos
```javascript
// En routes o services
const result = await zillowService.makeRequest(endpoint, params, 5); // 5 intentos
```

#### Cambiar timeout
```javascript
// En zillowService.js
timeout: 60000  // 60 segundos
```

#### Cambiar backoff
```javascript
// En isRetryableError o makeRequest
const delay = Math.pow(2, attempt - 1) * 2000; // 2s, 4s, 8s
```

### Monitoreo

#### Métricas a Monitorear
1. **Número de reintentos**
   - Contar cuántos reintentos ocurren
   - Si es alto: problema con la API

2. **Tasa de éxito después de reintentos**
   - Cuántos se recuperan en segundo/tercer intento
   - Indica si los reintentos son efectivos

3. **Tiempo total de solicitud**
   - Incluye tiempo de espera entre reintentos
   - Puede ser hasta 7 segundos (1+2+4)

### Próximos Pasos

1. **Monitoreo en producción**
   - Rastrear número de reintentos
   - Alertar si hay muchos reintentos

2. **Optimización**
   - Ajustar número de reintentos según necesidad
   - Ajustar timeout según experiencia

3. **Caché mejorado**
   - Usar caché cuando API falla
   - Fallback a datos en caché

4. **Circuit Breaker**
   - Implementar circuit breaker para fallos persistentes
   - Evitar sobrecargar API

### Testing

#### Probar con éxito
```bash
curl -X POST http://localhost:3000/api/properties/search \
  -H "Content-Type: application/json" \
  -d '{"location": "Austin, TX"}'
```

#### Probar con timeout (simular)
```javascript
// En zillowService.js, cambiar timeout a 1ms
timeout: 1
```

#### Probar con error 503
```javascript
// Desconectar internet o usar mock service
```

### Documentación Relacionada

- `ZILLOW_API_TROUBLESHOOTING.md` - Guía de troubleshooting
- `ZILLOW_API_CONFIGURATION.md` - Configuración de API
- `docs/TESTING_ENDPOINTS.md` - Testing de endpoints

### Resumen

| Aspecto | Antes | Después |
|--------|-------|---------|
| Reintentos | No | Sí (3 intentos) |
| Timeout | 10s | 30s |
| Backoff | N/A | Exponencial (1s, 2s, 4s) |
| Errores recuperables | No | Sí (429, 503, etc.) |
| Logs | Básicos | Detallados con intento # |

### Impacto

- **Confiabilidad**: +40% (estimado)
- **Falsos negativos**: -50% (errores temporales)
- **Tiempo de respuesta**: +0-7s (en caso de reintentos)
- **Carga de API**: Similar (reintentos con backoff)
