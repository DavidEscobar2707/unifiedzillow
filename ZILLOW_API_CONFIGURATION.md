# Zillow API Configuration Guide

## Overview

This document provides a comprehensive analysis of the Zillow RapidAPI (`propertyExtendedSearch` endpoint) and defines specific configurations for three distinct projects: **BackyardBoost**, **PoolLeadGen**, and **MarketStale**.

**API Reference:** https://rapidapi.com/apimaker/api/zillow-com1/playground/apiendpoint_93602987-7c54-426d-94f3-1fce926b3ebb

---

## API Endpoint: propertyExtendedSearch

**Base URL:** `https://zillow-com1.p.rapidapi.com/propertyExtendedSearch`

**Method:** GET

**Response Structure:**
```json
{
  "props": [
    {
      "zpid": "number",
      "address": "string",
      "city": "string",
      "state": "string",
      "zipcode": "string",
      "latitude": "number",
      "longitude": "number",
      "price": "number",
      "unformattedPrice": "number",
      "bedrooms": "number",
      "bathrooms": "number",
      "livingArea": "number",
      "squareFeet": "number",
      "homeType": "string",
      "propertyType": "string",
      "daysOnZillow": "number",
      "imgSrc": "string",
      "detailUrl": "string",
      "listingUrl": "string",
      "has3DModel": "boolean",
      "hasImage": "boolean",
      "hasVideo": "boolean",
      "carouselPhotos": "array",
      "datePriceChanged": "string|null",
      "comingSoonOnMarketDate": "string|null",
      "contingentListingType": "string|null",
      "country": "string",
      "currency": "string"
    }
  ],
  "schools": "array",
  "totalResultCount": "number",
  "resultsPerPage": "number",
  "totalPages": "number",
  "currentPage": "number"
}
```

---

## Query Parameters

### Core Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `location` | string | Yes | City, address, or zip code (e.g., "Los Angeles, CA") |
| `status_type` | string | No | Listing status: `ForSale`, `ForRent`, `RecentlySold`, `All` |
| `home_type` | string | No | Property type: `Houses`, `Apartments`, `Condos`, `Townhomes`, `All` |
| `keywords` | string | No | Search keywords (e.g., "backyard", "pool", "renovated") |
| `sort` | string | No | Sort order: `newest`, `price_low`, `price_high`, `days_on_zillow` |
| `page` | number | No | Page number for pagination (default: 1) |

### Advanced Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `minPrice` | number | Minimum price filter |
| `maxPrice` | number | Maximum price filter |
| `minBedrooms` | number | Minimum bedrooms |
| `maxBedrooms` | number | Maximum bedrooms |
| `minBathrooms` | number | Minimum bathrooms |
| `maxBathrooms` | number | Maximum bathrooms |
| `minSquareFeet` | number | Minimum square footage |
| `maxSquareFeet` | number | Maximum square footage |
| `yearBuiltMin` | number | Minimum year built |
| `yearBuiltMax` | number | Maximum year built |

---

## Project-Specific Configurations

### 1. BackyardBoost

**Objective:** Detect homes with undeveloped or empty backyards via satellite imagery and sell as leads.

**Target Properties:**
- Recently sold homes (to identify motivated sellers)
- Single-family houses (primary focus)
- Homes with visible empty/undeveloped backyard space
- Properties in suburban/residential areas

**API Configuration:**

```javascript
{
  location: "City, State",
  status_type: "RecentlySold",
  home_type: "Houses",
  keywords: "backyard",
  sort: "newest",
  minBedrooms: 2,
  maxBedrooms: 5,
  minPrice: 200000,
  maxPrice: 1500000
}
```

**Key Attributes to Extract:**
- `zpid` - Property ID for tracking
- `address`, `city`, `state`, `zipcode` - Location data
- `latitude`, `longitude` - For satellite imagery retrieval
- `price` - Lead value indicator
- `bedrooms`, `bathrooms` - Property size
- `livingArea` - Backyard potential indicator
- `imgSrc` - Thumbnail for preview
- `daysOnZillow` - Recency indicator
- `detailUrl` - Link to property details

**Visual Validation Focus:**
- Detect empty/undeveloped backyard space
- Estimate free area percentage
- Identify surface type (grass, dirt, paved)
- Detect existing structures (sheds, decks, fences)
- Confidence threshold: ≥75% for high-quality leads

**Lead Quality Criteria:**
- Visual confirms empty backyard with high confidence
- Property recently sold (within 30 days)
- Adequate lot size for development
- No major discrepancies between Zillow data and visual analysis

---

### 2. PoolLeadGen

**Objective:** Identify homes in hot climates with no pool detected via imagery and sell as leads.

**Target Properties:**
- Recently sold homes (motivated sellers)
- Single-family houses in warm climates
- Properties without visible pools
- High-value residential areas

**API Configuration:**

```javascript
{
  location: "City, State",
  status_type: "RecentlySold",
  home_type: "Houses",
  keywords: "pool",
  sort: "newest",
  minBedrooms: 3,
  maxBedrooms: 6,
  minPrice: 300000,
  maxPrice: 2000000
}
```

**Key Attributes to Extract:**
- `zpid` - Property ID for tracking
- `address`, `city`, `state`, `zipcode` - Location data
- `latitude`, `longitude` - For satellite imagery retrieval
- `price` - Lead value indicator
- `bedrooms`, `bathrooms` - Property size
- `livingArea` - Pool potential indicator
- `imgSrc` - Thumbnail for preview
- `daysOnZillow` - Recency indicator
- `detailUrl` - Link to property details

**Visual Validation Focus:**
- Detect presence/absence of pools
- Identify pool type (in-ground, above-ground, hot tub)
- Estimate pool size
- Detect water bodies or water features
- Confidence threshold: ≥80% for high-quality leads

**Lead Quality Criteria:**
- Visual confirms no pool with high confidence
- Property recently sold (within 30 days)
- Adequate backyard space for pool installation
- Hot climate location (target regions: FL, CA, AZ, TX, NV)
- No major discrepancies between Zillow data and visual analysis

---

### 3. MarketStale

**Objective:** Scrape homes listed for rent that have dropped in price within 30 days and send alerts to buyers.

**Target Properties:**
- Rental properties (for rent)
- Any property type (apartments, houses, condos)
- Properties with recent price drops
- Active listings with price history

**API Configuration:**

```javascript
{
  location: "City, State",
  status_type: "ForRent",
  home_type: "All",
  sort: "price_low",
  minPrice: 500,
  maxPrice: 5000,
  minBedrooms: 1,
  maxBedrooms: 4
}
```

**Key Attributes to Extract:**
- `zpid` - Property ID for tracking
- `address`, `city`, `state`, `zipcode` - Location data
- `price` - Current rental price
- `datePriceChanged` - Price change timestamp
- `bedrooms`, `bathrooms` - Property size
- `livingArea` - Space indicator
- `homeType` - Property type
- `imgSrc` - Thumbnail for preview
- `daysOnZillow` - Listing age
- `detailUrl` - Link to property details

**Price Drop Detection:**
- Monitor `datePriceChanged` field
- Calculate price difference from previous listing
- Identify drops within 30-day window
- Calculate percentage drop (target: ≥5% reduction)

**Alert Criteria:**
- Price dropped within last 30 days
- Minimum price drop: 5% or $100 (whichever is greater)
- Active rental listing
- Property has complete information
- Alert sent to registered buyers matching criteria

**Alert Notification:**
- Property address and details
- Previous price vs. current price
- Percentage/amount saved
- Direct link to property
- Contact information for landlord/agent

---

## Implementation Strategy

### Search Flow by Project

#### BackyardBoost Search Flow
```
1. Query: location + status_type=RecentlySold + home_type=Houses + keywords=backyard
2. Filter results by price range and bedroom count
3. Extract coordinates for satellite imagery
4. Run visual validation (BackyardBoost mode)
5. Compare visual results with Zillow data
6. Flag discrepancies and calculate quality score
7. Return high-quality leads (quality_score = "high")
```

#### PoolLeadGen Search Flow
```
1. Query: location + status_type=RecentlySold + home_type=Houses + keywords=pool
2. Filter results by price range and bedroom count
3. Extract coordinates for satellite imagery
4. Run visual validation (PoolLeadGen mode)
5. Compare visual results with Zillow data
6. Flag discrepancies and calculate quality score
7. Return high-quality leads (quality_score = "high")
```

#### MarketStale Search Flow
```
1. Query: location + status_type=ForRent + home_type=All
2. Filter results by price range and bedroom count
3. Check datePriceChanged field
4. Calculate price drop percentage
5. Identify drops within 30-day window
6. Generate alerts for matching buyers
7. Track alert delivery and engagement
```

---

## API Response Mapping

### Property Object Transformation

```javascript
// Raw API Response
{
  zpid: 12345678,
  address: "1626 S Rimpau Blvd",
  city: "Los Angeles",
  state: "CA",
  zipcode: "90019",
  latitude: 34.046246,
  longitude: -118.267891,
  price: 850000,
  unformattedPrice: 850000,
  bedrooms: 2,
  bathrooms: 2,
  livingArea: 1200,
  squareFeet: 1200,
  homeType: "SINGLE_FAMILY",
  propertyType: "HOUSE",
  daysOnZillow: 7,
  imgSrc: "https://photos.zillowstatic.com/...",
  detailUrl: "/homedetails/1626-S-Rimpau-Blvd-Los-Angeles-CA-90019/20601851_zpid/",
  has3DModel: true,
  hasImage: true,
  hasVideo: false,
  datePriceChanged: "2025-11-15T00:00:00Z",
  comingSoonOnMarketDate: null,
  contingentListingType: null,
  country: "USA",
  currency: "USD"
}

// Transformed Response
{
  id: "12345678",
  address: "1626 S Rimpau Blvd",
  city: "Los Angeles",
  state: "CA",
  zipCode: "90019",
  latitude: 34.046246,
  longitude: -118.267891,
  price: 850000,
  bedrooms: 2,
  bathrooms: 2,
  squareFeet: 1200,
  propertyType: "HOUSE",
  daysOnZillow: 7,
  imageUrl: "https://photos.zillowstatic.com/...",
  listingUrl: "/homedetails/1626-S-Rimpau-Blvd-Los-Angeles-CA-90019/20601851_zpid/",
  has3DModel: true,
  hasImage: true,
  hasVideo: false,
  priceChangedDate: "2025-11-15T00:00:00Z",
  has_pool: false,
  has_backyard: true,
  lastUpdated: "2025-11-21T16:41:24.077Z"
}
```

---

## Caching Strategy

| Project | Cache TTL | Rationale |
|---------|-----------|-----------|
| BackyardBoost | 24 hours | Recently sold homes change slowly |
| PoolLeadGen | 24 hours | Recently sold homes change slowly |
| MarketStale | 6 hours | Rental prices change frequently |

---

## Rate Limiting Considerations

- RapidAPI default: 100 requests per 15 minutes
- Implement exponential backoff for retries
- Cache aggressively to reduce API calls
- Batch requests when possible

---

## Error Handling

| Status Code | Meaning | Action |
|-------------|---------|--------|
| 200 | Success | Process results |
| 400 | Bad Request | Validate parameters |
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Check API permissions |
| 404 | Not Found | No results for location |
| 429 | Rate Limited | Implement backoff |
| 500 | Server Error | Retry with backoff |
| 503 | Service Unavailable | Retry later |

---

## Example Requests

### BackyardBoost - Los Angeles
```bash
curl -X GET "https://zillow-com1.p.rapidapi.com/propertyExtendedSearch?location=Los%20Angeles,%20CA&status_type=RecentlySold&home_type=Houses&keywords=backyard&sort=newest&minBedrooms=2&maxBedrooms=5&minPrice=200000&maxPrice=1500000" \
  -H "x-rapidapi-host: zillow-com1.p.rapidapi.com" \
  -H "x-rapidapi-key: YOUR_API_KEY"
```

### PoolLeadGen - Miami
```bash
curl -X GET "https://zillow-com1.p.rapidapi.com/propertyExtendedSearch?location=Miami,%20FL&status_type=RecentlySold&home_type=Houses&keywords=pool&sort=newest&minBedrooms=3&maxBedrooms=6&minPrice=300000&maxPrice=2000000" \
  -H "x-rapidapi-host: zillow-com1.p.rapidapi.com" \
  -H "x-rapidapi-key: YOUR_API_KEY"
```

### MarketStale - New York
```bash
curl -X GET "https://zillow-com1.p.rapidapi.com/propertyExtendedSearch?location=New%20York,%20NY&status_type=ForRent&home_type=All&sort=price_low&minPrice=500&maxPrice=5000&minBedrooms=1&maxBedrooms=4" \
  -H "x-rapidapi-host: zillow-com1.p.rapidapi.com" \
  -H "x-rapidapi-key: YOUR_API_KEY"
```

---

## Google Maps Integration

### Overview

Google Maps Static API is integrated to fetch satellite imagery for properties. This enables visual validation for BackyardBoost and PoolLeadGen projects.

### Satellite Image Retrieval

**Endpoint:** Google Maps Static API

**Configuration:**
```javascript
{
  center: `${latitude},${longitude}`,
  zoom: 20,
  size: '600x600',
  maptype: 'satellite',
  key: GOOGLE_MAPS_API_KEY
}
```

**Parameters:**
- `latitude`, `longitude` - Property coordinates from Zillow
- `zoom` - Level 20 for detailed backyard/pool view
- `size` - 600x600 pixels for analysis
- `maptype` - 'satellite' for aerial view

**Response:**
- Direct image data (PNG format)
- URL format: `https://maps.googleapis.com/maps/api/staticmap?...`

### Integration Flow

```
1. Zillow Search → Get property coordinates
2. Google Maps API → Fetch satellite image
3. OpenAI Vision → Analyze image
4. Lead Quality Service → Compare & flag discrepancies
5. Return enriched property data with visual validation
```

---

## Project-Specific Endpoints

### BackyardBoost Workflow

**Step 1: Search Properties**
```
GET /api/properties/search?location=Los%20Angeles,%20CA&project=backyard
```

Response includes:
- Property details from Zillow
- Coordinates for satellite imagery
- Basic lead information

**Step 2: Fetch Satellite Image & Analyze**
```
POST /api/properties/analyze-backyard
{
  "zpid": "12345678",
  "latitude": 34.046246,
  "longitude": -118.267891,
  "address": "1626 S Rimpau Blvd, Los Angeles, CA 90019",
  "zillow_data": { ... }
}
```

Response includes:
- Satellite image URL
- Visual analysis results
- Backyard assessment (empty/undeveloped space)
- Quality score
- Flags for discrepancies

**Step 3: Get Quality Report**
```
GET /api/properties/12345678/quality-report?project=backyard
```

Response includes:
- Lead quality score (high/medium/low)
- Visual validation confidence
- Discrepancy details
- Recommendation (APPROVE/REVIEW/REJECT)
- Flagged issues if any

---

### PoolLeadGen Workflow

**Step 1: Search Properties**
```
GET /api/properties/search?location=Miami,%20FL&project=pool
```

Response includes:
- Property details from Zillow
- Coordinates for satellite imagery
- Basic lead information

**Step 2: Fetch Satellite Image & Analyze**
```
POST /api/properties/analyze-pool
{
  "zpid": "87654321",
  "latitude": 25.7617,
  "longitude": -80.1918,
  "address": "123 Ocean Drive, Miami, FL 33139",
  "zillow_data": { ... }
}
```

Response includes:
- Satellite image URL
- Visual analysis results
- Pool detection (presence/absence)
- Pool type and size estimate
- Quality score
- Flags for discrepancies

**Step 3: Get Quality Report**
```
GET /api/properties/87654321/quality-report?project=pool
```

Response includes:
- Lead quality score (high/medium/low)
- Visual validation confidence
- Pool detection results
- Discrepancy details
- Recommendation (APPROVE/REVIEW/REJECT)
- Flagged issues if any

---

### MarketStale Workflow

**Step 1: Search Rental Properties**
```
GET /api/properties/search?location=New%20York,%20NY&project=market
```

Response includes:
- Rental property details from Zillow
- Current price
- Price change date
- Days on market

**Step 2: Check Price Drops**
```
POST /api/properties/check-price-drop
{
  "zpid": "11111111",
  "current_price": 2500,
  "previous_price": 2650,
  "price_changed_date": "2025-11-15T00:00:00Z"
}
```

Response includes:
- Price drop percentage
- Amount saved
- Eligibility for alert
- Alert status

**Step 3: Generate Alerts**
```
GET /api/properties/price-drop-alerts?location=New%20York,%20NY&min_drop_percent=5
```

Response includes:
- List of properties with price drops
- Alert details for each property
- Buyer matching information

---

## Complete Workflow Examples

### BackyardBoost Complete Workflow

**1. Search for properties with empty backyards**
```bash
curl "http://localhost:3000/api/properties/search?location=Los%20Angeles,%20CA&project=backyard"
```

Response:
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "20601851",
        "address": "1626 S Rimpau Blvd, Los Angeles, CA 90019",
        "price": 850000,
        "bedrooms": 2,
        "bathrooms": 2,
        "latitude": 34.046246,
        "longitude": -118.267891,
        "imageUrl": "https://photos.zillowstatic.com/...",
        "daysOnZillow": 7
      }
    ],
    "totalCount": 1
  }
}
```

**2. Analyze backyard with satellite imagery**
```bash
curl -X POST "http://localhost:3000/api/properties/analyze-backyard" \
  -H "Content-Type: application/json" \
  -d '{
    "zpid": "20601851",
    "latitude": 34.046246,
    "longitude": -118.267891,
    "address": "1626 S Rimpau Blvd, Los Angeles, CA 90019",
    "zillow_data": {
      "has_backyard": true,
      "lot_size": 5000,
      "surface_type": "grass"
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "zpid": "20601851",
    "address": "1626 S Rimpau Blvd, Los Angeles, CA 90019",
    "satelliteImageUrl": "https://maps.googleapis.com/maps/api/staticmap?...",
    "visualAnalysis": {
      "is_empty_backyard": true,
      "surface_type": "grass",
      "estimated_free_area": "high",
      "confidence": 87,
      "structures_detected": ["fence", "small shed"],
      "reasoning": "Large empty grassy area with minimal structures"
    },
    "qualityScore": "high",
    "recommendation": "APPROVE"
  }
}
```

**3. Get detailed quality report**
```bash
curl "http://localhost:3000/api/properties/20601851/quality-report?project=backyard"
```

Response:
```json
{
  "success": true,
  "data": {
    "leadId": "20601851",
    "qualityScore": "high",
    "confidence": 87,
    "reasoning": [
      "Visual validation confirms empty backyard with high confidence",
      "Property recently sold (7 days on Zillow)",
      "Adequate lot size for development",
      "No major discrepancies between Zillow data and visual analysis"
    ],
    "discrepancy": {
      "detected": false,
      "type": null,
      "severity": "none"
    },
    "recommendation": "APPROVE - Lead meets quality standards",
    "evidence": {
      "satelliteImageUrl": "https://maps.googleapis.com/maps/api/staticmap?...",
      "visualAnalysis": { ... },
      "zillowData": { ... }
    }
  }
}
```

---

### PoolLeadGen Complete Workflow

**1. Search for properties without pools**
```bash
curl "http://localhost:3000/api/properties/search?location=Miami,%20FL&project=pool"
```

**2. Analyze pool presence with satellite imagery**
```bash
curl -X POST "http://localhost:3000/api/properties/analyze-pool" \
  -H "Content-Type: application/json" \
  -d '{
    "zpid": "43177112",
    "latitude": 25.7617,
    "longitude": -80.1918,
    "address": "1541 SW 102nd Ter, Davie, FL 33324",
    "zillow_data": {
      "has_pool": false,
      "property_type": "house",
      "bedrooms": 4
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "zpid": "43177112",
    "address": "1541 SW 102nd Ter, Davie, FL 33324",
    "satelliteImageUrl": "https://maps.googleapis.com/maps/api/staticmap?...",
    "visualAnalysis": {
      "has_pool": false,
      "confidence": 92,
      "pool_type": null,
      "pool_size_estimate": null,
      "water_bodies": "None detected",
      "reasoning": "Clear satellite view shows no pool or water features"
    },
    "qualityScore": "high",
    "recommendation": "APPROVE"
  }
}
```

**3. Get detailed quality report**
```bash
curl "http://localhost:3000/api/properties/43177112/quality-report?project=pool"
```

---

### MarketStale Complete Workflow

**1. Search for rental properties**
```bash
curl "http://localhost:3000/api/properties/search?location=New%20York,%20NY&project=market"
```

**2. Check for price drops**
```bash
curl -X POST "http://localhost:3000/api/properties/check-price-drop" \
  -H "Content-Type: application/json" \
  -d '{
    "zpid": "11111111",
    "current_price": 2500,
    "previous_price": 2650,
    "price_changed_date": "2025-11-15T00:00:00Z"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "zpid": "11111111",
    "currentPrice": 2500,
    "previousPrice": 2650,
    "priceDropAmount": 150,
    "priceDropPercent": 5.66,
    "priceChangedDate": "2025-11-15T00:00:00Z",
    "daysAgo": 6,
    "meetsAlertCriteria": true,
    "alertMessage": "Price dropped $150 (5.66%) - Save $150/month!"
  }
}
```

**3. Get all price drop alerts**
```bash
curl "http://localhost:3000/api/properties/price-drop-alerts?location=New%20York,%20NY&min_drop_percent=5"
```

Response:
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "zpid": "11111111",
        "address": "123 Main St, New York, NY 10001",
        "currentPrice": 2500,
        "previousPrice": 2650,
        "priceDropAmount": 150,
        "priceDropPercent": 5.66,
        "bedrooms": 2,
        "bathrooms": 1,
        "imageUrl": "https://photos.zillowstatic.com/...",
        "listingUrl": "/homedetails/123-Main-St-New-York-NY-10001/...",
        "alertMessage": "Price dropped $150 (5.66%) - Save $150/month!"
      }
    ],
    "totalAlerts": 1
  }
}
```

---

## Next Steps

1. Implement project-specific search endpoints (/search with project parameter)
2. Create analyze-backyard endpoint (POST /api/properties/analyze-backyard)
3. Create analyze-pool endpoint (POST /api/properties/analyze-pool)
4. Create quality-report endpoint (GET /api/properties/:id/quality-report)
5. Create price-drop-alerts endpoint (GET /api/properties/price-drop-alerts)
6. Implement price tracking for MarketStale
7. Set up alert notification system
8. Create lead quality scoring system
9. Build dashboard for lead management
