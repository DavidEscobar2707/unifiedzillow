# API Testing Guide - Zillow Backend

## Base URL
```
http://localhost:3000
```

## Health Check

### GET /health
Check if the server is running and healthy.

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2025-11-21T10:30:00.000Z",
  "uptime": 125.456
}
```

---

## Properties Endpoints

### 1. Search Properties

**Endpoint:** `GET /api/properties/search`

**Description:** Search for properties by location with optional filters.

**Query Parameters:**
- `location` (required): City, address, or zip code
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `minBedrooms` (optional): Minimum bedrooms
- `maxBedrooms` (optional): Maximum bedrooms
- `propertyType` (optional): Type of property (house, condo, etc.)
- `sortBy` (optional): Sort results (price, date, relevance)
- `includeVisualValidation` (optional): Add visual validation (PoolLeadGen or BackyardBoost)

**Example Requests:**

Basic search:
```bash
curl "http://localhost:3000/api/properties/search?location=New%20York,%20NY"
```

With filters:
```bash
curl "http://localhost:3000/api/properties/search?location=Los%20Angeles,%20CA&minPrice=500000&maxPrice=1000000&minBedrooms=3"
```

With visual validation for pools:
```bash
curl "http://localhost:3000/api/properties/search?location=Miami,%20FL&includeVisualValidation=PoolLeadGen"
```

With visual validation for backyards:
```bash
curl "http://localhost:3000/api/properties/search?location=Austin,%20TX&includeVisualValidation=BackyardBoost"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "12345678",
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "price": 750000,
        "bedrooms": 3,
        "bathrooms": 2,
        "squareFeet": 2500,
        "propertyType": "house",
        "yearBuilt": 2005,
        "listingUrl": "https://www.zillow.com/...",
        "imageUrl": "https://...",
        "lastUpdated": "2025-11-21T10:00:00.000Z",
        "visualValidation": {
          "leadType": "PoolLeadGen",
          "satelliteImageUrl": "https://maps.googleapis.com/...",
          "analysis": {
            "has_pool": true,
            "confidence": 85,
            "pool_type": "in-ground",
            "pool_size_estimate": "large",
            "reasoning": "Clear in-ground pool visible in satellite image"
          },
          "timestamp": "2025-11-21T10:15:00.000Z"
        }
      }
    ],
    "totalCount": 1
  },
  "metadata": {
    "timestamp": "2025-11-21T10:30:00.000Z",
    "source": "zillow",
    "cached": false
  }
}
```

---

### 2. Get Property Details

**Endpoint:** `GET /api/properties/:id`

**Description:** Fetch detailed information for a specific property by ID.

**Path Parameters:**
- `id` (required): Property ID (zpid)

**Example Request:**
```bash
curl http://localhost:3000/api/properties/12345678
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "12345678",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "price": 750000,
    "bedrooms": 3,
    "bathrooms": 2,
    "squareFeet": 2500,
    "propertyType": "house",
    "yearBuilt": 2005,
    "listingUrl": "https://www.zillow.com/...",
    "imageUrl": "https://...",
    "lastUpdated": "2025-11-21T10:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2025-11-21T10:30:00.000Z",
    "source": "zillow",
    "cached": false
  }
}
```

---

### 3. Get Property Estimate

**Endpoint:** `GET /api/properties/estimate`

**Description:** Get price estimate for a property by address.

**Query Parameters:**
- `address` (required): Property address

**Example Request:**
```bash
curl "http://localhost:3000/api/properties/estimate?address=123%20Main%20St,%20New%20York,%20NY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "123 Main St, New York, NY",
    "estimate": 750000,
    "estimateRange": {
      "low": 700000,
      "high": 800000
    },
    "lastUpdated": "2025-11-21T10:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2025-11-21T10:30:00.000Z",
    "source": "zillow",
    "cached": false
  }
}
```

---

### 4. Visual Validation (Lead Quality)

**Endpoint:** `POST /api/properties/validate-visual`

**Description:** Validate property characteristics using satellite imagery and LLM analysis. This endpoint uses the new lead quality service to detect discrepancies between Zillow data and visual analysis.

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "lead_type": "PoolLeadGen",
  "zillow_data": {
    "id": "12345678",
    "address": "123 Main St",
    "has_pool": true,
    "pool_type": "in-ground",
    "property_type": "house"
  }
}
```

**Parameters:**
- `latitude` (required): Property latitude (-90 to 90)
- `longitude` (required): Property longitude (-180 to 180)
- `lead_type` (required): Type of lead - "PoolLeadGen" or "BackyardBoost"
- `zillow_data` (optional): Zillow property data for comparison
- `property_id` (optional): Zillow property ID

**Example Requests:**

Pool validation:
```bash
curl -X POST http://localhost:3000/api/properties/validate-visual \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "lead_type": "PoolLeadGen",
    "zillow_data": {
      "has_pool": true,
      "pool_type": "in-ground"
    }
  }'
```

Backyard validation:
```bash
curl -X POST http://localhost:3000/api/properties/validate-visual \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 30.2672,
    "longitude": -97.7431,
    "lead_type": "BackyardBoost",
    "zillow_data": {
      "has_backyard": true,
      "lot_size": 5000
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadType": "PoolLeadGen",
    "satelliteImageUrl": "https://maps.googleapis.com/maps/api/staticmap?...",
    "analysis": {
      "has_pool": true,
      "confidence": 85,
      "pool_type": "in-ground",
      "pool_size_estimate": "large",
      "water_bodies": "One in-ground swimming pool",
      "reasoning": "Clear in-ground pool visible in satellite image with high confidence"
    },
    "timestamp": "2025-11-21T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2025-11-21T10:30:00.000Z",
    "source": "zillow",
    "cached": false
  }
}
```

---

## Lead Quality Service (New)

The Lead Quality Service is integrated into the visual validation endpoint and provides:

### Quality Assessment Features:

1. **Discrepancy Detection**
   - Compares Zillow data with visual analysis results
   - Detects pool mismatches, backyard size mismatches, surface type inconsistencies
   - Generates severity ratings (none, minor, major)

2. **Lead Flagging**
   - Automatically flags leads with major discrepancies
   - Stores satellite image URL as evidence
   - Includes confidence scores and analysis details

3. **Quality Scoring**
   - High quality: Visual confirms Zillow data with ≥80% confidence
   - Medium quality: Minor discrepancies or 60-80% confidence
   - Low quality: Major contradictions or <60% confidence

### Example: Full Quality Assessment

To get a complete quality assessment with flagging:

```bash
curl -X POST http://localhost:3000/api/properties/validate-visual \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "lead_type": "PoolLeadGen",
    "zillow_data": {
      "id": "lead-001",
      "address": "123 Main St",
      "has_pool": true,
      "pool_type": "in-ground",
      "property_type": "house"
    }
  }'
```

The response will include visual analysis that can be used to generate a quality report with:
- Quality score (high/medium/low)
- Confidence level
- Discrepancy details
- Recommendations (APPROVE/REVIEW/REJECT)
- Flags for problematic leads

---

## Error Handling

All endpoints return standardized error responses:

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Location parameter is required and must be a non-empty string",
    "statusCode": 400,
    "timestamp": "2025-11-21T10:30:00.000Z",
    "requestId": "req-1700564400000-abc123def"
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` (400): Invalid input parameters
- `INVALID_LOCATION` (400): Invalid location format
- `INVALID_PARAMETER` (400): Invalid parameter value
- `AUTHENTICATION_ERROR` (401/403): API key issues
- `NOT_FOUND` (404): Property not found
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `API_ERROR` (500): Server error
- `SERVICE_UNAVAILABLE` (503): External service down
- `GATEWAY_TIMEOUT` (504): Request timeout

---

## Testing with cURL

### Test Pool Lead Generation

```bash
# Search for properties with pools
curl "http://localhost:3000/api/properties/search?location=Miami,%20FL&includeVisualValidation=PoolLeadGen"

# Validate specific coordinates for pool
curl -X POST http://localhost:3000/api/properties/validate-visual \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 25.7617,
    "longitude": -80.1918,
    "lead_type": "PoolLeadGen"
  }'
```

### Test Backyard Boost

```bash
# Search for properties with backyards
curl "http://localhost:3000/api/properties/search?location=Austin,%20TX&includeVisualValidation=BackyardBoost"

# Validate specific coordinates for backyard
curl -X POST http://localhost:3000/api/properties/validate-visual \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 30.2672,
    "longitude": -97.7431,
    "lead_type": "BackyardBoost"
  }'
```

---

## Environment Setup

Before testing, ensure your `.env` file is configured:

```env
# Server
NODE_ENV=development
PORT=3000

# Zillow API
ZILLOW_API_KEY=your_rapidapi_key
ZILLOW_API_HOST=zillow56.p.rapidapi.com

# Visual Inspector (Google Maps & OpenAI)
GOOGLE_MAPS_API_KEY=your_google_maps_key
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o

# Cache
CACHE_TTL=3600
```

---

## Rate Limiting

The API implements rate limiting:
- Default: 100 requests per 15 minutes per IP
- Adjust in `src/middleware/rateLimiter.js`

---

## Caching

Responses are cached to improve performance:
- Search results: 1 hour (3600 seconds)
- Property details: 1 hour
- Visual validation: 30 minutes (1800 seconds)
- Price estimates: 1 hour

Cache is stored in memory using node-cache.

---

## Next Steps

1. Start the server: `npm run dev`
2. Test endpoints using the cURL examples above
3. Monitor logs for request/response details
4. Check the lead quality service for discrepancy detection and flagging
