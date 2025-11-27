# Zillow API Troubleshooting Guide

## Error: 503 - No Response from Zillow API

### Síntomas
```
[ZillowService] No response from API at /propertyExtendedSearch
Error: No response from Zillow API
statusCode: 503
```

### Causas Posibles

1. **API de Zillow está caída o no disponible**
   - La API de RapidAPI puede estar experimentando problemas
   - El servidor de Zillow puede estar en mantenimiento

2. **Problema de conectividad**
   - Firewall bloqueando la conexión
   - Problema de red
   - Timeout en la solicitud (10 segundos por defecto)

3. **Credenciales inválidas**
   - `RAPIDAPI_KEY` incorrecto
   - `RAPIDAPI_HOST` incorrecto
   - Cambios en la API de RapidAPI

4. **Rate limiting**
   - Demasiadas solicitudes en poco tiempo
   - Cuota de API agotada

5. **Problema de TLS/SSL**
   - Certificado SSL inválido
   - Problema de verificación de certificado

### Soluciones

#### 1. Verificar Credenciales
```bash
# Verificar que las variables de entorno están configuradas
echo $RAPIDAPI_KEY
echo $RAPIDAPI_HOST

# Esperado:
# RAPIDAPI_KEY=6123ffbdcamsh851c534d7b1d9c9p17f5dcjsn03fc00bdd068
# RAPIDAPI_HOST=zillow-com1.p.rapidapi.com
```

#### 2. Verificar Estado de la API
- Ir a https://rapidapi.com/apigeek/api/zillow-com1
- Verificar si la API está disponible
- Revisar el estado del servicio

#### 3. Aumentar Timeout
**Archivo:** `src/services/zillowService.js`

```javascript
// Cambiar de 10000 a 30000 ms (30 segundos)
const axiosConfig = {
  baseURL: this.baseURL,
  headers: {
    'x-rapidapi-key': this.apiKey,
    'x-rapidapi-host': this.apiHost
  },
  timeout: 30000  // Aumentado de 10000
};
```

#### 4. Implementar Retry Logic
Agregar reintentos automáticos con backoff exponencial:

```javascript
async makeRequest(endpoint, params = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[ZillowService] Making request to ${endpoint} (attempt ${attempt}/${retries})`, { params });
      
      const response = await this.client.get(endpoint, { params });
      
      console.log(`[ZillowService] Request successful to ${endpoint}`);
      return response.data;
    } catch (error) {
      if (attempt === retries) {
        // Last attempt failed
        this.handleError(error, endpoint, params);
      } else {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`[ZillowService] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

#### 5. Verificar Conectividad
```bash
# Probar conexión a la API
curl -X GET "https://zillow-com1.p.rapidapi.com/propertyExtendedSearch?location=Miami%2C%20FL" \
  -H "x-rapidapi-key: YOUR_API_KEY" \
  -H "x-rapidapi-host: zillow-com1.p.rapidapi.com"
```

#### 6. Verificar Certificado SSL
```bash
# Si hay problemas de SSL, verificar el certificado
openssl s_client -connect zillow-com1.p.rapidapi.com:443

# En desarrollo, el código ya desactiva la verificación SSL:
# process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

### Monitoreo

#### Métricas a Monitorear
1. **Tasa de éxito de solicitudes**
   - Target: > 95%
   - Alert: < 90%

2. **Tiempo de respuesta**
   - Target: < 5 segundos
   - Alert: > 10 segundos

3. **Errores 503**
   - Target: 0
   - Alert: > 5 en 1 hora

4. **Rate limit errors (429)**
   - Target: 0
   - Alert: > 10 en 1 hora

#### Logging
```javascript
// Agregar logging detallado
console.log(`[ZillowService] Request: ${endpoint}`);
console.log(`[ZillowService] Status: ${response.status}`);
console.log(`[ZillowService] Response time: ${Date.now() - startTime}ms`);
console.log(`[ZillowService] Data size: ${JSON.stringify(response.data).length} bytes`);
```

### Checklist de Diagnóstico

- [ ] Verificar que `RAPIDAPI_KEY` está configurado
- [ ] Verificar que `RAPIDAPI_HOST` es `zillow-com1.p.rapidapi.com`
- [ ] Verificar que la API está disponible en RapidAPI
- [ ] Probar conexión con curl
- [ ] Verificar logs de error detallados
- [ ] Aumentar timeout si es necesario
- [ ] Implementar retry logic
- [ ] Monitorear tasa de éxito
- [ ] Verificar cuota de API en RapidAPI
- [ ] Revisar estado de la red

### Soluciones Alternativas

#### 1. Usar Mock Service
Para desarrollo/testing, usar `zillowServiceMock.js`:

```javascript
// En config.js o routes
const zillowService = process.env.USE_MOCK === 'true' 
  ? require('./zillowServiceMock')
  : require('./zillowService');
```

#### 2. Implementar Fallback
```javascript
async searchProperties(searchParams) {
  try {
    return await this.makeRequest('/propertyExtendedSearch', params);
  } catch (error) {
    if (error.statusCode === 503) {
      console.warn('[ZillowService] API unavailable, using cached data');
      return this.getCachedResults(searchParams);
    }
    throw error;
  }
}
```

#### 3. Usar Caché Agresivo
```javascript
// Aumentar TTL de caché
const cacheKey = cacheService.generateKey('search', params);
const cachedResult = cacheService.get(cacheKey);
if (cachedResult) {
  console.log('[ZillowService] Using cached result (API unavailable)');
  return cachedResult;
}
```

### Contacto y Soporte

- **RapidAPI Status**: https://status.rapidapi.com/
- **Zillow API Documentation**: https://rapidapi.com/apigeek/api/zillow-com1
- **GitHub Issues**: Reportar problemas en el repositorio

### Historial de Incidentes

| Fecha | Problema | Solución | Duración |
|-------|----------|----------|----------|
| 2025-11-27 | 503 No response | Verificar API | - |

### Notas

- El timeout actual es de 10 segundos
- La API de Zillow puede ser lenta en horas pico
- Considerar aumentar timeout a 30 segundos
- Implementar retry logic con backoff exponencial
- Monitorear cuota de API en RapidAPI
