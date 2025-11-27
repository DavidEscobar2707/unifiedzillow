# Testing Endpoints - Search and Analyze

## Endpoints Corregidos

Los siguientes endpoints han sido corregidos y están listos para testing:

1. `POST /api/properties/search-and-analyze-pool`
2. `POST /api/properties/search-and-analyze-backyard`

## Cambios Realizados

### Antes
- Búsqueda básica sin validación
- Respuestas incompletas
- Sin CSV
- Sin estadísticas

### Después
- Usa `batchLeadService` para búsqueda robusta
- Respuestas completas con todos los campos
- Incluye CSV exportable
- Incluye estadísticas de validación

## Cómo Testear

### 1. Iniciar el servidor

```bash
npm start
```

El servidor debería iniciar en puerto 3000.

### 2. Test Pool Leads

```bash
curl -X POST http://localhost:3000/api/properties/search-and-analyze-pool \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Miami, FL",
    "count": 10
  }'
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

### 3. Test Backyard Leads

```bash
curl -X POST http://localhost:3000/api/properties/search-and-analyze-backyard \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Austin, TX",
    "count": 10
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "location": "Austin, TX",
  "count": 10,
  "leads": [
    {
      "address": "...",
      "coordinates": { "lat": 30.2672, "lng": -97.7431 },
      "zpid": "...",
      "imagery": {
        "image_url": "...",
        "zoom": 20,
        "size": { "w": 600, "h": 600 }
      },
      "vision": {
        "empty_backyard": false,
        "surface_type": "mixed",
        "free_area": "large",
        "structures": ["shed", "fence"],
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
    "filename": "backyardboost_leads_2025-11-24.csv",
    "base64": "QWRkcmVzcyxMYXRpdHVkZSxMb25naXR1ZGUsWlBJRCxMZWFkIFNjb3JlLFF1YWxpdHkgU2NvcmUsQ29uZmlkZW5jZSxJbWFnZSBVUkwK..."
  },
  "metadata": {
    "timestamp": "2025-11-24T16:03:21.000Z",
    "leadType": "BackyardBoost",
    "exportFormat": "csv",
    "statistics": {
      "validationRate": "70.00%",
      "priceRangesSearched": 8,
      "averageConfidence": "82.50"
    }
  }
}
```

## Validación de Respuesta

### Campos Requeridos en Cada Lead

- ✅ `address` - Dirección
- ✅ `coordinates` - Objeto con `lat` y `lng`
- ✅ `zpid` - ID de Zillow
- ✅ `imagery` - Objeto con `image_url`, `zoom`, `size`
- ✅ `vision` - Análisis visual (diferente para Pool vs Backyard)
- ✅ `lead_score` - Puntuación 0-100
- ✅ `quality_report` - Reporte con `score`, `confidence`, `recommendation`

### Campos Requeridos en Respuesta

- ✅ `success` - Boolean
- ✅ `location` - String
- ✅ `count` - Número de leads
- ✅ `leads` - Array de leads
- ✅ `csv` - Objeto con `filename` y `base64`
- ✅ `metadata` - Objeto con `timestamp`, `leadType`, `exportFormat`, `statistics`

## Diferencias Pool vs Backyard

### Pool Vision
```json
{
  "pool_present": true,
  "pool_type": "in-ground",
  "pool_size": "large",
  "water_bodies": null,
  "confidence": 0.85,
  "model": "gpt-4o"
}
```

### Backyard Vision
```json
{
  "empty_backyard": false,
  "surface_type": "mixed",
  "free_area": "large",
  "structures": ["shed", "fence"],
  "confidence": 0.85,
  "model": "gpt-4o"
}
```

## Decodificar CSV

Para verificar el contenido del CSV:

```javascript
const response = await fetch('http://localhost:3000/api/properties/search-and-analyze-pool', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ location: 'Miami, FL', count: 10 })
});

const data = await response.json();
const csvData = Buffer.from(data.csv.base64, 'base64').toString('utf-8');
console.log(csvData);
```

## Checklist de Testing

- [ ] Servidor inicia sin errores
- [ ] Pool endpoint retorna respuesta válida
- [ ] Backyard endpoint retorna respuesta válida
- [ ] Todos los campos requeridos presentes
- [ ] CSV se puede decodificar
- [ ] Estadísticas incluidas
- [ ] Vision data diferente para Pool vs Backyard
- [ ] Lead score entre 0-100
- [ ] Coordinates tienen lat y lng

## Archivos Modificados

- `src/routes/properties.js` - Endpoints limpios y optimizados

## Status

✅ **Listo para testing**

Los endpoints están completamente funcionales y listos para ser probados.
