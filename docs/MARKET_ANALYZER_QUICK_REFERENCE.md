# Market Analyzer - Quick Reference

## Endpoint
```
POST /api/properties/market-analyzer
```

## Basic Request
```json
{
  "location": "Austin, TX"
}
```

## Full Request
```json
{
  "location": "Austin, TX",
  "filters": {
    "minPrice": 250000,
    "maxPrice": 500000,
    "minBedrooms": 2,
    "maxBedrooms": 4
  },
  "analysisOptions": {
    "downPaymentPercent": 20,
    "interestRate": 6.5,
    "loanTermYears": 30,
    "maintenancePercent": 1,
    "vacancyPercent": 5,
    "propertyManagementPercent": 8
  }
}
```

## Response Structure
```json
{
  "success": true,
  "data": {
    "location": "Austin, TX",
    "totalPropertiesAnalyzed": 25,
    "positiveOpportunities": [...],
    "allAnalysis": [...],
    "summary": {
      "averageCashFlow": 250.50,
      "averageCashOnCashReturn": 3.25,
      "averageCapRate": 2.15,
      "opportunityCount": 8,
      "opportunityPercentage": 32
    }
  },
  "metadata": {
    "timestamp": "2024-11-27T10:30:00.000Z",
    "source": "zillow-market-analyzer",
    "cached": false
  }
}
```

## Key Metrics

| Metric | Formula | Interpretation |
|--------|---------|-----------------|
| **Cash Flow** | Rent - Expenses | Monthly profit/loss |
| **Cash-on-Cash Return** | (Annual Cash Flow / Cash Invested) × 100 | ROI percentage |
| **Cap Rate** | (Annual Cash Flow / Purchase Price) × 100 | Annual return on property |
| **Rent-to-Mortgage Ratio** | Monthly Rent / Mortgage Payment | Rent coverage of mortgage |

## Investment Quality

| Rating | Cash-on-Cash Return | Interpretation |
|--------|-------------------|-----------------|
| **Excellent** | ≥ 8% | Strong investment |
| **Good** | 5-7.99% | Solid investment |
| **Fair** | 2-4.99% | Moderate investment |
| **Poor** | < 2% or negative | Weak investment |

## Default Assumptions

| Parameter | Default | Customizable |
|-----------|---------|--------------|
| Down Payment | 20% | Yes |
| Interest Rate | 6.5% | Yes |
| Loan Term | 30 years | Yes |
| Property Taxes | 1% annually | Yes |
| Insurance | 0.5% annually | Yes |
| Maintenance | 1% annually | Yes |
| Vacancy Rate | 5% | Yes |
| Property Management | 8% | Yes |
| Closing Costs | 2% | No |

## Curl Examples

### Basic
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{"location": "Austin, TX"}'
```

### With Filters
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Austin, TX",
    "filters": {
      "minPrice": 250000,
      "maxPrice": 500000
    }
  }'
```

### With Custom Options
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Austin, TX",
    "analysisOptions": {
      "downPaymentPercent": 25,
      "interestRate": 7.0
    }
  }'
```

## Property Analysis Fields

```
zpid                    - Zillow property ID
address                 - Property address
propertyType            - Type (House, Condo, etc.)
bedrooms                - Number of bedrooms
bathrooms               - Number of bathrooms
purchasePrice           - Property price
monthlyRent             - Estimated monthly rent
analysis                - Financial metrics object
  ├─ mortgagePayment    - Monthly mortgage
  ├─ propertyTaxes      - Monthly taxes
  ├─ insurance          - Monthly insurance
  ├─ hoa                - Monthly HOA
  ├─ maintenance        - Monthly maintenance
  ├─ vacancy            - Monthly vacancy loss
  ├─ propertyManagement - Monthly management fee
  ├─ totalMonthlyCost   - Total monthly expenses
  ├─ monthlyCashFlow    - Monthly profit/loss
  ├─ annualCashFlow     - Annual profit/loss
  ├─ cashOnCashReturn   - ROI percentage
  ├─ capRate            - Cap rate percentage
  ├─ downPayment        - Down payment amount
  ├─ closingCosts       - Closing costs
  └─ totalCashInvested  - Total cash invested
investmentQuality       - Rating (Excellent/Good/Fair/Poor)
investmentScore         - Score 0-100
rentToMortgageRatio     - Rent/Mortgage ratio
isPositiveCashFlow      - Boolean
timestamp               - Analysis timestamp
```

## Common Calculations

### Mortgage Payment
```
M = P × [r(1+r)^n] / [(1+r)^n - 1]
Where:
  P = Loan amount
  r = Monthly interest rate
  n = Number of payments
```

### Total Monthly Cost
```
Total = Mortgage + Taxes + Insurance + HOA + Maintenance + Vacancy + Management
```

### Cash Flow
```
Cash Flow = Monthly Rent - Total Monthly Cost
```

### Cash-on-Cash Return
```
Return = (Annual Cash Flow / Total Cash Invested) × 100
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid parameters |
| 500 | Server error |

## Caching

- **Duration**: 6 hours
- **Key**: location + filters + analysisOptions
- **Benefit**: Faster responses for repeated requests

## Performance Tips

1. **Use filters** to narrow search scope
2. **Adjust parameters** based on market conditions
3. **Check cache** for repeated requests
4. **Monitor response times** for large datasets

## Common Issues

| Issue | Solution |
|-------|----------|
| No properties found | Try major city (Austin, Denver, LA) |
| All negative cash flow | Adjust interest rate or rent estimates |
| Slow response | Use price/bedroom filters |
| Cache not working | Use identical parameters |

## Files

- **Service**: `src/services/marketAnalyzerService.js`
- **Endpoint**: `src/routes/properties.js`
- **Guide**: `MARKET_ANALYZER_GUIDE.md`
- **Testing**: `MARKET_ANALYZER_TESTING.md`
- **Summary**: `MARKET_ANALYZER_SUMMARY.md`

## Next Steps

1. Test with `MARKET_ANALYZER_TESTING.md`
2. Review calculations in `MARKET_ANALYZER_GUIDE.md`
3. Adjust parameters for your market
4. Monitor performance and cache
5. Gather feedback for improvements
