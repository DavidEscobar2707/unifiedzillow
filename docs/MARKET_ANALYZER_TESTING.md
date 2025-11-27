# Market Analyzer Testing Guide

## Quick Start

The Market Analyzer endpoint is now available at:
```
POST /api/properties/market-analyzer
```

## Test Cases

### Test 1: Basic Market Analysis
Analyze all rental properties in a location.

**Request:**
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Austin, TX"
  }'
```

**Expected Response:**
- Status: 200
- Returns analysis of all rental properties in Austin, TX
- Includes summary statistics and list of positive cash flow opportunities

---

### Test 2: Filtered Market Analysis
Analyze rental properties within a specific price range.

**Request:**
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Austin, TX",
    "filters": {
      "minPrice": 250000,
      "maxPrice": 500000,
      "minBedrooms": 2,
      "maxBedrooms": 4
    }
  }'
```

**Expected Response:**
- Status: 200
- Returns analysis of properties matching the filters
- Only properties in the $250k-$500k range with 2-4 bedrooms

---

### Test 3: Custom Investment Parameters
Analyze with different mortgage assumptions.

**Request:**
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Austin, TX",
    "analysisOptions": {
      "downPaymentPercent": 25,
      "interestRate": 7.0,
      "loanTermYears": 30,
      "maintenancePercent": 1.5,
      "vacancyPercent": 7,
      "propertyManagementPercent": 10
    }
  }'
```

**Expected Response:**
- Status: 200
- Returns analysis with custom parameters
- Results will differ from defaults due to higher interest rate and expenses

---

### Test 4: All Parameters Combined
Full analysis with filters and custom options.

**Request:**
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Denver, CO",
    "filters": {
      "minPrice": 300000,
      "maxPrice": 600000,
      "minBedrooms": 3,
      "maxBedrooms": 5
    },
    "analysisOptions": {
      "downPaymentPercent": 20,
      "interestRate": 6.5,
      "loanTermYears": 30,
      "maintenancePercent": 1,
      "vacancyPercent": 5,
      "propertyManagementPercent": 8
    }
  }'
```

**Expected Response:**
- Status: 200
- Comprehensive analysis with all parameters specified

---

### Test 5: Invalid Location (Error Case)
Test error handling with missing location.

**Request:**
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "minPrice": 250000
    }
  }'
```

**Expected Response:**
- Status: 400
- Error message: "Location parameter is required and must be a non-empty string"

---

### Test 6: Empty Location String (Error Case)
Test error handling with empty location.

**Request:**
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "location": ""
  }'
```

**Expected Response:**
- Status: 400
- Error message: "Location parameter is required and must be a non-empty string"

---

## Response Structure Validation

When testing, verify the response includes:

### Top-level fields:
- ✓ `success` (boolean)
- ✓ `data` (object)
- ✓ `metadata` (object)

### Data object fields:
- ✓ `location` (string)
- ✓ `totalPropertiesAnalyzed` (number)
- ✓ `positiveOpportunities` (array)
- ✓ `allAnalysis` (array)
- ✓ `summary` (object)
- ✓ `timestamp` (ISO string)

### Summary object fields:
- ✓ `averageCashFlow` (number)
- ✓ `averageCashOnCashReturn` (number)
- ✓ `averageCapRate` (number)
- ✓ `opportunityCount` (number)
- ✓ `opportunityPercentage` (number)

### Property analysis fields:
- ✓ `zpid` (string)
- ✓ `address` (string)
- ✓ `propertyType` (string)
- ✓ `bedrooms` (number)
- ✓ `bathrooms` (number)
- ✓ `purchasePrice` (number)
- ✓ `monthlyRent` (number)
- ✓ `analysis` (object with financial metrics)
- ✓ `investmentQuality` (string: Excellent/Good/Fair/Poor)
- ✓ `investmentScore` (number 0-100)
- ✓ `rentToMortgageRatio` (number)
- ✓ `isPositiveCashFlow` (boolean)
- ✓ `timestamp` (ISO string)

---

## Caching Behavior

### Test 7: Cache Validation
Make the same request twice and verify caching.

**First Request:**
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{"location": "Austin, TX"}'
```

**Second Request (within 6 hours):**
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{"location": "Austin, TX"}'
```

**Expected Behavior:**
- First request: `"cached": false` in metadata
- Second request: `"cached": true` in metadata (if cache is working)
- Response times should be significantly faster on second request

---

## Performance Testing

### Test 8: Large Dataset Analysis
Test with a location that has many rental properties.

**Request:**
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Los Angeles, CA"
  }'
```

**Expected Behavior:**
- Should complete within 30 seconds
- Returns analysis of all available properties
- Summary statistics are accurate

---

## Data Validation

### Test 9: Verify Calculations
Manually verify calculations for a single property.

**Example Property:**
- Purchase Price: $350,000
- Monthly Rent: $2,500
- Down Payment: 20% = $70,000
- Interest Rate: 6.5%
- Loan Term: 30 years

**Expected Calculations:**
- Mortgage Payment: ~$1,878.74
- Property Taxes (1% annually): ~$291.67/month
- Insurance (0.5% annually): ~$145.83/month
- Maintenance (1% annually): ~$291.67/month
- Vacancy (5% of rent): ~$125/month
- Property Management (8% of rent): ~$200/month
- Total Monthly Cost: ~$2,933.91
- Monthly Cash Flow: $2,500 - $2,933.91 = -$433.91 (negative)
- Annual Cash Flow: -$5,207
- Cash-on-Cash Return: -2.08%

---

## Integration Testing

### Test 10: End-to-End Workflow
1. Search for properties in a location
2. Analyze market opportunities
3. Filter positive opportunities
4. Compare investment metrics

**Workflow:**
```bash
# Step 1: Get market analysis
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{"location": "Austin, TX"}'

# Step 2: Extract positive opportunities from response
# Step 3: Analyze the top 5 opportunities
# Step 4: Compare cash flow and ROI metrics
```

---

## Troubleshooting

### Issue: No properties returned
- **Cause**: Location may not have rental properties in Zillow database
- **Solution**: Try a major city like Austin, Denver, or Los Angeles

### Issue: All properties show negative cash flow
- **Cause**: Market conditions or rental estimates may be low
- **Solution**: Adjust analysis options (lower interest rate, higher rent estimates)

### Issue: Slow response times
- **Cause**: Large number of properties to analyze
- **Solution**: Use filters to narrow down the search (price range, bedrooms)

### Issue: Cache not working
- **Cause**: Different parameters create different cache keys
- **Solution**: Use identical parameters for both requests

---

## Success Criteria

✓ Endpoint returns 200 status for valid requests
✓ Endpoint returns 400 status for invalid requests
✓ Response includes all required fields
✓ Calculations are mathematically correct
✓ Positive opportunities are sorted by cash flow
✓ Caching works for identical requests
✓ Error messages are clear and helpful
✓ Performance is acceptable (< 30 seconds for large datasets)
