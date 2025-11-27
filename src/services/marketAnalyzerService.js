const zillowService = require('./zillowService');
const transformService = require('./transformService');
const cacheService = require('./cacheService');

/**
 * Market Analyzer Service
 * Analyzes real estate market opportunities by comparing rental income vs mortgage costs
 * Identifies properties where rent is higher than mortgage (positive cash flow opportunities)
 */
class MarketAnalyzerService {
  /**
   * Calculate monthly mortgage payment
   * @param {number} purchasePrice - Property purchase price
   * @param {number} downPaymentPercent - Down payment percentage (default 20%)
   * @param {number} interestRate - Annual interest rate (default 6.5%)
   * @param {number} loanTermYears - Loan term in years (default 30)
   * @returns {number} Monthly mortgage payment
   */
  calculateMortgagePayment(purchasePrice, downPaymentPercent = 20, interestRate = 6.5, loanTermYears = 30) {
    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const loanAmount = purchasePrice - downPayment;
    
    // Monthly interest rate
    const monthlyRate = interestRate / 100 / 12;
    
    // Number of payments
    const numberOfPayments = loanTermYears * 12;
    
    // Mortgage payment formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    if (monthlyRate === 0) {
      return loanAmount / numberOfPayments;
    }
    
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    return monthlyPayment;
  }

  /**
   * Calculate total monthly housing costs (mortgage + taxes + insurance + HOA)
   * @param {number} purchasePrice - Property purchase price
   * @param {number} monthlyTaxes - Monthly property taxes
   * @param {number} monthlyInsurance - Monthly homeowners insurance
   * @param {number} monthlyHOA - Monthly HOA fees
   * @param {number} downPaymentPercent - Down payment percentage
   * @param {number} interestRate - Annual interest rate
   * @param {number} loanTermYears - Loan term in years
   * @returns {number} Total monthly housing costs
   */
  calculateTotalMonthlyCost(
    purchasePrice,
    monthlyTaxes = 0,
    monthlyInsurance = 0,
    monthlyHOA = 0,
    downPaymentPercent = 20,
    interestRate = 6.5,
    loanTermYears = 30
  ) {
    const mortgagePayment = this.calculateMortgagePayment(
      purchasePrice,
      downPaymentPercent,
      interestRate,
      loanTermYears
    );
    
    return mortgagePayment + monthlyTaxes + monthlyInsurance + monthlyHOA;
  }

  /**
   * Calculate cash flow (rental income - total costs)
   * @param {number} monthlyRent - Monthly rental income
   * @param {number} monthlyExpenses - Monthly expenses (mortgage, taxes, insurance, HOA, maintenance, vacancy, etc.)
   * @returns {number} Monthly cash flow
   */
  calculateCashFlow(monthlyRent, monthlyExpenses) {
    return monthlyRent - monthlyExpenses;
  }

  /**
   * Calculate cash-on-cash return
   * @param {number} annualCashFlow - Annual cash flow
   * @param {number} cashInvested - Total cash invested (down payment + closing costs)
   * @returns {number} Cash-on-cash return percentage
   */
  calculateCashOnCashReturn(annualCashFlow, cashInvested) {
    if (cashInvested === 0) return 0;
    return (annualCashFlow / cashInvested) * 100;
  }

  /**
   * Analyze a single property for investment potential
   * @param {object} property - Property data from Zillow
   * @param {object} options - Analysis options
   * @returns {object} Investment analysis result
   */
  analyzePropertyInvestment(property, options = {}) {
    const {
      downPaymentPercent = 20,
      interestRate = 6.5,
      loanTermYears = 30,
      maintenancePercent = 1, // 1% of property value annually
      vacancyPercent = 5, // 5% vacancy rate
      propertyManagementPercent = 8 // 8% of rental income
    } = options;

    // Extract property data
    const zpid = property.id || property.zpid;
    const address = property.address || 'Unknown';
    const purchasePrice = property.price || 0;
    const monthlyRent = property.rentEstimate || property.monthlyRent || 0;
    const bedrooms = property.bedrooms || 0;
    const bathrooms = property.bathrooms || 0;
    const propertyType = property.propertyType || 'Unknown';

    // Estimate monthly costs if not provided
    const estimatedMonthlyTaxes = (purchasePrice / 12) * 0.01; // Assume 1% annual property tax
    const estimatedMonthlyInsurance = (purchasePrice / 12) * 0.005; // Assume 0.5% annual insurance
    const monthlyHOA = property.monthlyHOA || 0;

    // Calculate total monthly costs
    const totalMonthlyCost = this.calculateTotalMonthlyCost(
      purchasePrice,
      estimatedMonthlyTaxes,
      estimatedMonthlyInsurance,
      monthlyHOA,
      downPaymentPercent,
      interestRate,
      loanTermYears
    );

    // Calculate maintenance and vacancy costs
    const monthlyMaintenance = (purchasePrice / 12) * (maintenancePercent / 100);
    const monthlyVacancy = monthlyRent * (vacancyPercent / 100);
    const monthlyPropertyManagement = monthlyRent * (propertyManagementPercent / 100);

    // Total operating expenses
    const totalMonthlyExpenses = totalMonthlyCost + monthlyMaintenance + monthlyVacancy + monthlyPropertyManagement;

    // Calculate cash flow
    const monthlyCashFlow = this.calculateCashFlow(monthlyRent, totalMonthlyExpenses);
    const annualCashFlow = monthlyCashFlow * 12;

    // Calculate down payment and closing costs
    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const closingCosts = purchasePrice * 0.02; // Assume 2% closing costs
    const totalCashInvested = downPayment + closingCosts;

    // Calculate cash-on-cash return
    const cashOnCashReturn = this.calculateCashOnCashReturn(annualCashFlow, totalCashInvested);

    // Calculate cap rate (annual cash flow / purchase price)
    const capRate = (annualCashFlow / purchasePrice) * 100;

    // Determine investment quality
    let investmentQuality = 'Poor';
    let investmentScore = 0;

    if (monthlyCashFlow > 0) {
      investmentScore += 50; // Positive cash flow is essential
      
      if (cashOnCashReturn >= 8) {
        investmentQuality = 'Excellent';
        investmentScore += 50;
      } else if (cashOnCashReturn >= 5) {
        investmentQuality = 'Good';
        investmentScore += 35;
      } else if (cashOnCashReturn >= 2) {
        investmentQuality = 'Fair';
        investmentScore += 20;
      } else {
        investmentQuality = 'Poor';
        investmentScore += 5;
      }
    } else {
      investmentQuality = 'Poor';
      investmentScore = 0;
    }

    return {
      zpid,
      address,
      propertyType,
      bedrooms,
      bathrooms,
      purchasePrice,
      monthlyRent,
      analysis: {
        mortgagePayment: this.calculateMortgagePayment(purchasePrice, downPaymentPercent, interestRate, loanTermYears),
        propertyTaxes: estimatedMonthlyTaxes,
        insurance: estimatedMonthlyInsurance,
        hoa: monthlyHOA,
        maintenance: monthlyMaintenance,
        vacancy: monthlyVacancy,
        propertyManagement: monthlyPropertyManagement,
        totalMonthlyCost: totalMonthlyExpenses,
        monthlyCashFlow,
        annualCashFlow,
        cashOnCashReturn: parseFloat(cashOnCashReturn.toFixed(2)),
        capRate: parseFloat(capRate.toFixed(2)),
        downPayment,
        closingCosts,
        totalCashInvested
      },
      investmentQuality,
      investmentScore,
      rentToMortgageRatio: parseFloat((monthlyRent / this.calculateMortgagePayment(purchasePrice, downPaymentPercent, interestRate, loanTermYears)).toFixed(2)),
      isPositiveCashFlow: monthlyCashFlow > 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Search and analyze properties for investment opportunities
   * @param {string} location - Property location
   * @param {object} filters - Search filters
   * @param {object} analysisOptions - Investment analysis options
   * @returns {Promise<object>} Analysis results
   */
  async analyzeMarketOpportunities(location, filters = {}, analysisOptions = {}) {
    try {
      console.log('[MarketAnalyzer] Analyzing market opportunities in:', location);

      // Search for properties
      const rawSearchResults = await zillowService.searchProperties({
        location,
        filters: {
          status_type: 'ForRent',
          ...filters
        }
      });

      // Transform results
      const transformedResults = transformService.transformSearchResults(rawSearchResults, false);
      const properties = transformedResults.data.properties || [];

      if (!properties || properties.length === 0) {
        console.log('[MarketAnalyzer] No properties found in:', location);
        return {
          location,
          totalPropertiesAnalyzed: 0,
          positiveOpportunities: [],
          allAnalysis: [],
          summary: {
            averageCashFlow: 0,
            averageCashOnCashReturn: 0,
            averageCapRate: 0,
            opportunityCount: 0,
            opportunityPercentage: 0
          }
        };
      }

      console.log('[MarketAnalyzer] Analyzing', properties.length, 'properties');

      // Analyze each property
      const analysisResults = properties.map(property => 
        this.analyzePropertyInvestment(property, analysisOptions)
      );

      // Filter positive cash flow opportunities
      const positiveOpportunities = analysisResults.filter(result => result.isPositiveCashFlow);

      // Calculate summary statistics
      const summary = {
        averageCashFlow: analysisResults.length > 0 
          ? analysisResults.reduce((sum, r) => sum + r.analysis.monthlyCashFlow, 0) / analysisResults.length 
          : 0,
        averageCashOnCashReturn: analysisResults.length > 0 
          ? analysisResults.reduce((sum, r) => sum + r.analysis.cashOnCashReturn, 0) / analysisResults.length 
          : 0,
        averageCapRate: analysisResults.length > 0 
          ? analysisResults.reduce((sum, r) => sum + r.analysis.capRate, 0) / analysisResults.length 
          : 0,
        opportunityCount: positiveOpportunities.length,
        opportunityPercentage: analysisResults.length > 0 
          ? (positiveOpportunities.length / analysisResults.length) * 100 
          : 0
      };

      // Sort opportunities by cash flow (highest first)
      positiveOpportunities.sort((a, b) => b.analysis.monthlyCashFlow - a.analysis.monthlyCashFlow);

      return {
        location,
        totalPropertiesAnalyzed: analysisResults.length,
        positiveOpportunities,
        allAnalysis: analysisResults,
        summary: {
          averageCashFlow: parseFloat(summary.averageCashFlow.toFixed(2)),
          averageCashOnCashReturn: parseFloat(summary.averageCashOnCashReturn.toFixed(2)),
          averageCapRate: parseFloat(summary.averageCapRate.toFixed(2)),
          opportunityCount: summary.opportunityCount,
          opportunityPercentage: parseFloat(summary.opportunityPercentage.toFixed(2))
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[MarketAnalyzer] Error analyzing market opportunities:', error.message);
      throw new Error(`Market analysis failed: ${error.message}`);
    }
  }
}

module.exports = new MarketAnalyzerService();
