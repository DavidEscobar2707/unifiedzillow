# Market Analyzer Endpoint Guide

## Overview

The Market Analyzer endpoint identifies real estate investment opportunities by analyzing properties where rental income exceeds mortgage costs. This is a powerful tool for identifying positive cash flow properties.

## Endpoint

**POST** `/api/properties/market-analyzer`

## Request Body

```json
{
  "location": "Austin, TX",
  "filters": {
    "minPrice": 200000,
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

### Parameters

#### Required
- **location** (string): Property location (city, zip code, address, etc.)

#### Optional
- **filters** (object): Search filters
  - `minPrice`: Minimum property price
  - `maxPrice`: Maximum property price
  - `minBedrooms`: Minimum number of bedrooms
  - `maxBedrooms`: Maximum number of bedrooms

- **analysisOptions** (object): Investment analysis parameters
  - `downPaymentPercent`: Down payment percentage (default: 20%)
  - `interestRate`: Annual interest rate (default: 6.5%)
  - `loanTermYears`: Loan term in years (default: 30)
  - `maintenancePercent`: Annual maintenance as % of property value (default: 1%)
  - `vacancyPercent`: Vacancy rate percentage (default: 5%)
  - `propertyManagementPercent`: Property management as % of rental income (default: 8%)

## Response Format

```json
{
  "success": true,
  "data": {
    "location": "Austin, TX",
    "totalPropertiesAnalyzed": 25,
    "positiveOpportunities": [
      {
        "zpid": "12345678",
        "address": "123 Main St, Austin, TX 78701",
        "propertyType": "House",
        "bedrooms": 3,
        "bathrooms": 2,
        "purchasePrice": 350000,
        "monthlyRent": 2500,
        "analysis": {
          "mortgagePayment": 1878.74,
          "propertyTaxes": 291.67,
          "insurance": 145.83,
          "hoa": 0,
          "maintenance": 291.67,
          "vacancy": 125,
          "propertyManagement": 200,
          "totalMonthlyCost": 2933.91,
          "monthlyCashFlow": -433.91,
          "annualCashFlow": -5207,
          "cashOnCashReturn": -2.08,
          "capRate": -1.49,
          "downPayment": 70000,
          "closingCosts": 7000,
          "totalCashInvested": 77000
        },
        "investmentQuality": "Poor",
        "investmentScore": 0,
        "rentToMortgageRatio": 1.33,
        "isPositiveCashFlow": false,
        "timestamp": "2024-11-27T10:30:00.000Z"
      }
    ],
    "allAnalysis": [
      // ... all analyzed properties
    ],
    "summary": {
      "averageCashFlow": 250.50,
      "averageCashOnCashReturn": 3.25,
      "averageCapRate": 2.15,
      "opportunityCount": 8,
      "opportunityPercentage": 32
    },
    "timestamp": "2024-11-27T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-11-27T10:30:00.000Z",
    "source": "zillow-market-analyzer",
    "cached": false
  }
}
```

## Response Fields

### Top Level
- **success**: Boolean indicating if the analysis was successful
- **data**: Analysis results object
- **metadata**: Request metadata including timestamp and cache status

### Data Object
- **location**: The analyzed location
- **totalPropertiesAnalyzed**: Total number of properties analyzed
- **positiveOpportunities**: Array of properties with positive cash flow (sorted by cash flow, highest first)
- **allAnalysis**: Array of all analyzed properties
- **summary**: Summary statistics across all properties
- **timestamp**: When the analysis was performed

### Property Analysis Object
- **zpid**: Zillow property ID
- **address**: Property address
- **propertyType**: Type of property (House, Condo, etc.)
- **bedrooms**: Number of bedrooms
- **bathrooms**: Number of bathrooms
- **purchasePrice**: Property purchase price
- **monthlyRent**: Estimated monthly rental income
- **analysis**: Detailed financial analysis
  - **mortgagePayment**: Monthly mortgage payment
  - **propertyTaxes**: Estimated monthly property taxes
  - **insurance**: Estimated monthly homeowners insurance
  - **hoa**: Monthly HOA fees
  - **maintenance**: Monthly maintenance costs (1% of property value annually)
  - **vacancy**: Monthly vacancy loss (5% of rental income)
  - **propertyManagement**: Monthly property management fees (8% of rental income)
  - **totalMonthlyCost**: Total monthly expenses
  - **monthlyCashFlow**: Monthly cash flow (rent - expenses)
  - **annualCashFlow**: Annual cash flow
  - **cashOnCashReturn**: Cash-on-cash return percentage
  - **capRate**: Capitalization rate percentage
  - **downPayment**: Down payment amount
  - **closingCosts**: Estimated closing costs (2% of purchase price)
  - **totalCashInvested**: Total cash invested (down payment + closing costs)
- **investmentQuality**: Quality rating (Excellent, Good, Fair, Poor)
- **investmentScore**: Numeric investment score (0-100)
- **rentToMortgageRatio**: Ratio of monthly rent to mortgage payment
- **isPositiveCashFlow**: Boolean indicating positive cash flow
- **timestamp**: When the property was analyzed

### Summary Object
- **averageCashFlow**: Average monthly cash flow across all properties
- **averageCashOnCashReturn**: Average cash-on-cash return percentage
- **averageCapRate**: Average capitalization rate
- **opportunityCount**: Number of properties with positive cash flow
- **opportunityPercentage**: Percentage of properties with positive cash flow

## Investment Quality Ratings

- **Excellent**: Cash-on-cash return ≥ 8%
- **Good**: Cash-on-cash return 5-7.99%
- **Fair**: Cash-on-cash return 2-4.99%
- **Poor**: Negative cash flow or cash-on-cash return < 2%

## Example Usage

### Basic Analysis
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Austin, TX"
  }'
```

### With Filters
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

### With Custom Analysis Options
```bash
curl -X POST http://localhost:3000/api/properties/market-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Austin, TX",
    "filters": {
      "minPrice": 250000,
      "maxPrice": 500000
    },
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

## Key Metrics Explained

### Cash Flow
The difference between rental income and all expenses. Positive cash flow means the property generates income after all costs.

```
Monthly Cash Flow = Monthly Rent - (Mortgage + Taxes + Insurance + HOA + Maintenance + Vacancy + Property Management)
```

### Cash-on-Cash Return
The percentage return on the actual cash invested (down payment + closing costs).

```
Cash-on-Cash Return = (Annual Cash Flow / Total Cash Invested) × 100
```

### Cap Rate (Capitalization Rate)
The annual return on the property investment based on purchase price.

```
Cap Rate = (Annual Cash Flow / Purchase Price) × 100
```

### Rent-to-Mortgage Ratio
The ratio of monthly rent to mortgage payment. A ratio > 1.0 indicates positive cash flow from rent alone.

```
Rent-to-Mortgage Ratio = Monthly Rent / Monthly Mortgage Payment
```

## Caching

Market analysis results are cached for 6 hours to improve performance. The cache key includes location, filters, and analysis options. Identical requests within 6 hours will return cached results.

## Error Handling

The endpoint returns appropriate HTTP status codes:
- **200**: Successful analysis
- **400**: Invalid request parameters
- **500**: Server error during analysis

Error responses include:
```json
{
  "error": "Error message describing what went wrong",
  "timestamp": "2024-11-27T10:30:00.000Z"
}
```

## Use Cases

1. **Investment Property Screening**: Quickly identify properties with positive cash flow
2. **Market Comparison**: Compare investment metrics across different locations
3. **Portfolio Analysis**: Analyze multiple properties to build a diversified portfolio
4. **Due Diligence**: Validate investment assumptions before making offers
5. **Market Research**: Understand market dynamics and investment opportunities

## Notes

- Rental estimates are based on Zillow data and may vary from actual market rates
- Property tax and insurance estimates are based on national averages and should be verified
- Maintenance costs assume 1% of property value annually (industry standard)
- Vacancy rate assumes 5% (typical for well-maintained properties)
- Property management assumes 8% of rental income (typical for professional management)
- All calculations assume 30-year fixed-rate mortgages
- Results are sorted by monthly cash flow (highest first) in the positiveOpportunities array
