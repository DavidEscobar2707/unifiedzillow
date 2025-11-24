# Validation Guide - Response Fix

## Cambios Realizados

Se han corregido los endpoints `/search-and-analyze-pool` y `/search-and-analyze-backyard` para:

1. ✅ Usar `batchLeadService` en lugar de búsqueda básica
2. ✅ Formatear respuestas con `responseFormatter.formatLead()`
3. ✅ Incluir campos completos: `vision`, `lead_score`, `imagery`, `coordinates`, `quality_report`
4. ✅ Generar y exportar CSV en base64
5. ✅ Incluir estadísticas de validación

## Cómo Validar

### 1. Verificar Sintaxis

```bash
node -c src/routes/properties.js
```

**Resultado esperado:** Sin errores

### 2. Verificar Imports

```bash
node -e "require('./src/routes/properties.js')"
```

**Resultado esperado:** Sin errores

### 3. Ejecutar Tests

```bash
npm test -- src/routes/__tests__/properties.test.js
```

**Resultado esperado:** Todos los tests pasan

### 4. Verificar Estructura de Respuesta

Hacer una solicitud POST a cualquiera de los endpoints:

```bash
curl -X POST http://localhost:3000/api/properties/search-and-analyze-pool \
  -H "Content-Type: application/json" \
  -d '{"location":"Miami, FL","count":10}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "location": "Miami, FL",
  "count": 10,
  "leads": [
    {
      "address": "...",
      "coordinates": { "lat": 25.7617, "lng": -80.1918 },
      "zpid": "...",
      "imagery": {
        "image_url": "...",
        "zoom": 20,
        "size": { "w": 600, "h": 600 }
      },
      "vision": {
        "pool_present": true,
        "pool_type": "in-ground",
        "pool_size": "large",
        "confidence": 0.85,
        "model": "gpt-4o"
      },
      "lead_score": 85,
      "quality_report": {
        "score": "high",
        "confidence": 85,
        "recommendation": "APPROVE"
      }
    }
  ],
  "csv": {
    "filename": "poolleadgen_leads_2025-11-24.csv",
    "base64": "QWRkcmVzcyxMYXRpdHVkZSxMb25naXR1ZGUsWlBJRCxMZWFkIFNjb3JlLFF1YWxpdHkgU2NvcmUsQ29uZmlkZW5jZSxJbWFnZSBVUkwK..."
  },
  "metadata": {
    "timestamp": "2025-11-24T16:03:21.000Z",
    "leadType": "PoolLeadGen",
    "exportFormat": "csv",
    "statistics": {
      "validationRate": "70.00%",
      "priceRangesSearched": 8,
      "averageConfidence": "82.50"
    }
  }
}
```

## Campos Validados

### Estructura de Lead

Cada lead debe tener:

- ✅ `address` - Dirección de la propiedad
- ✅ `coordinates` - Objeto con `lat` y `lng`
- ✅ `zpid` - ID de Zillow
- ✅ `imagery` - Objeto con `image_url`, `zoom`, `size`
- ✅ `vision` - Análisis visual específico del tipo de lead
- ✅ `lead_score` - Puntuación 0-100
- ✅ `quality_report` - Reporte de calidad con `score`, `confidence`, `recommendation`

### Estructura de Respuesta

La respuesta debe tener:

- ✅ `success` - Boolean
- ✅ `location` - String
- ✅ `count` - Número de leads
- ✅ `leads` - Array de leads formateados
- ✅ `csv` - Objeto con `filename` y `base64`
- ✅ `metadata` - Objeto con `timestamp`, `leadType`, `exportFormat`, `statistics`

## Diferencias Pool vs Backyard

### Pool (PoolLeadGen)

```json
"vision": {
  "pool_present": true,
  "pool_type": "in-ground",
  "pool_size": "large",
  "water_bodies": null,
  "confidence": 0.85,
  "model": "gpt-4o"
}
```

### Backyard (BackyardBoost)

```json
"vision": {
  "empty_backyard": false,
  "surface_type": "mixed",
  "free_area": "large",
  "structures": ["shed", "fence"],
  "confidence": 0.85,
  "model": "gpt-4o"
}
```

## Decodificar CSV

Para verificar el CSV:

```javascript
const csvBase64 = response.csv.base64;
const csvData = Buffer.from(csvBase64, 'base64').toString('utf-8');
console.log(csvData);
```

**Resultado esperado:**
```
Address,Latitude,Longitude,ZPID,Lead Score,Quality Score,Confidence,Image URL,Pool Present,Pool Type,Pool Size,Water Bodies
123 Main St,25.7617,-80.1918,12345,85,high,85,https://...,true,in-ground,large,
```

## Checklist de Validación

- [ ] Sintaxis correcta (node -c)
- [ ] Imports funcionan (node -e)
- [ ] Tests pasan (npm test)
- [ ] Respuesta tiene estructura correcta
- [ ] Todos los campos requeridos presentes
- [ ] CSV se puede decodificar
- [ ] Estadísticas incluidas
- [ ] Diferencias Pool/Backyard correctas

## Archivos Modificados

- `src/routes/properties.js` - Endpoints corregidos
- `src/routes/__tests__/properties.test.js` - Tests agregados

## Status

✅ **Listo para validar**

Todos los cambios han sido implementados y están listos para pruebas.
