const zillowService = require('./zillowService');
const transformService = require('./transformService');
const visualInspector = require('./visualInspector');
const leadQualityService = require('./leadQualityService');
const cacheService = require('./cacheService');

/**
 * Expanded Search Service
 * Handles expanded searches when initial results don't meet quality thresholds
 */
class ExpandedSearchService {
  /**
   * Search with expansion strategy - tries multiple searches if needed
   * @param {string} location - Initial location
   * @param {string} leadType - Type of lead ('PoolLeadGen' or 'BackyardBoost')
   * @param {object} filters - Initial search filters
   * @param {number} minQualityLeads - Minimum number of high-quality leads needed
   * @returns {Promise<object>} Expanded search results
   */
  async searchWithExpansion(location, leadType, filters = {}, minQualityLeads = 5) {
    console.log(`[ExpandedSearchService] Starting expanded search for ${leadType} in ${location}`);

    // Step 1: Initial search
    let allResults = [];
    let qualityLeads = [];
    let searchAttempt = 1;
    const maxAttempts = 3;

    // Try initial search
    const initialResults = await this.performSearch(location, leadType, filters);
    allResults = initialResults;
    qualityLeads = this.filterQualityLeads(initialResults, leadType);

    console.log(`[ExpandedSearchService] Attempt ${searchAttempt}: Found ${initialResults.length} properties, ${qualityLeads.length} quality leads`);

    // Step 2: If not enough quality leads, try expanded searches
    while (qualityLeads.length < minQualityLeads && searchAttempt < maxAttempts) {
      searchAttempt++;
      console.log(`[ExpandedSearchService] Attempt ${searchAttempt}: Expanding search criteria`);

      // Expand search by adjusting filters
      const expandedFilters = this.expandSearchFilters(filters, searchAttempt);
      const expandedResults = await this.performSearch(location, leadType, expandedFilters);

      // Add new results (avoid duplicates)
      const newResults = expandedResults.filter(
        newProp => !allResults.some(existing => existing.id === newProp.id)
      );

      allResults = [...allResults, ...newResults];
      qualityLeads = this.filterQualityLeads(allResults, leadType);

      console.log(`[ExpandedSearchService] Attempt ${searchAttempt}: Found ${newResults.length} new properties, total quality leads: ${qualityLeads.length}`);
    }

    // Step 3: Try nearby areas if still not enough
    if (qualityLeads.length < minQualityLeads && searchAttempt < maxAttempts) {
      searchAttempt++;
      console.log(`[ExpandedSearchService] Attempt ${searchAttempt}: Searching nearby areas`);

      const nearbyLocations = this.getNearbyLocations(location);
      
      for (const nearbyLocation of nearbyLocations) {
        if (qualityLeads.length >= minQualityLeads) break;

        const nearbyResults = await this.performSearch(nearbyLocation, leadType, filters);
        const newResults = nearbyResults.filter(
          newProp => !allResults.some(existing => existing.id === newProp.id)
        );

        allResults = [...allResults, ...newResults];
        qualityLeads = this.filterQualityLeads(allResults, leadType);

        console.log(`[ExpandedSearchService] Searched ${nearbyLocation}: Found ${newResults.length} new properties, total quality leads: ${qualityLeads.length}`);
      }
    }

    console.log(`[ExpandedSearchService] Expanded search completed: ${qualityLeads.length} quality leads from ${allResults.length} total properties`);

    return {
      allResults,
      qualityLeads,
      searchAttempts: searchAttempt,
      success: qualityLeads.length > 0
    };
  }

  /**
   * Perform a single search
   * @param {string} location - Location to search
   * @param {string} leadType - Type of lead
   * @param {object} filters - Search filters
   * @returns {Promise<array>} Array of properties
   */
  async performSearch(location, leadType, filters = {}) {
    try {
      const cacheKey = cacheService.generateKey('expanded-search', { location, leadType, ...filters });
      
      // Check cache first
      const cachedResult = cacheService.get(cacheKey);
      if (cachedResult) {
        console.log(`[ExpandedSearchService] Returning cached search for ${location}`);
        return cachedResult;
      }

      // Perform search
      const rawResults = await zillowService.searchProperties({
        location,
        filters
      });

      // Transform results
      const transformedResults = transformService.transformSearchResults(rawResults, false);
      const properties = transformedResults.data.properties || [];

      // Cache results
      cacheService.set(cacheKey, properties, 3600);

      return properties;
    } catch (error) {
      console.error(`[ExpandedSearchService] Search failed for ${location}:`, error.message);
      return [];
    }
  }

  /**
   * Filter properties by quality score
   * @param {array} properties - Array of properties
   * @param {string} leadType - Type of lead
   * @returns {array} Filtered high-quality properties
   */
  filterQualityLeads(properties, leadType) {
    return properties.filter(property => {
      // Check if property has quality report
      if (!property.qualityReport) {
        return false;
      }

      const qualityScore = property.qualityReport.qualityScore;
      const confidence = property.qualityReport.confidence || 0;

      // For BackyardBoost: accept high and medium quality with decent confidence
      if (leadType === 'BackyardBoost') {
        return (qualityScore === 'high' && confidence >= 70) ||
               (qualityScore === 'medium' && confidence >= 60);
      }

      // For PoolLeadGen: stricter criteria
      if (leadType === 'PoolLeadGen') {
        return (qualityScore === 'high' && confidence >= 75) ||
               (qualityScore === 'medium' && confidence >= 70);
      }

      return false;
    });
  }

  /**
   * Expand search filters for broader results
   * @param {object} filters - Current filters
   * @param {number} attempt - Search attempt number
   * @returns {object} Expanded filters
   */
  expandSearchFilters(filters, attempt) {
    const expanded = { ...filters };

    if (attempt === 2) {
      // Second attempt: expand price range
      if (expanded.minPrice) {
        expanded.minPrice = Math.max(0, expanded.minPrice - 50000);
      }
      if (expanded.maxPrice) {
        expanded.maxPrice = expanded.maxPrice + 100000;
      }
      
      // Expand bedroom range
      if (expanded.minBedrooms) {
        expanded.minBedrooms = Math.max(1, expanded.minBedrooms - 1);
      }
      if (expanded.maxBedrooms) {
        expanded.maxBedrooms = expanded.maxBedrooms + 2;
      }

      console.log(`[ExpandedSearchService] Expanded filters (attempt 2):`, expanded);
    } else if (attempt === 3) {
      // Third attempt: remove most filters for maximum results
      delete expanded.minPrice;
      delete expanded.maxPrice;
      delete expanded.minBedrooms;
      delete expanded.maxBedrooms;

      console.log(`[ExpandedSearchService] Removed filters (attempt 3) for maximum results`);
    }

    return expanded;
  }

  /**
   * Get nearby locations for expanded search
   * @param {string} location - Original location
   * @returns {array} Array of nearby location strings
   */
  getNearbyLocations(location) {
    // Extract city/area from location
    const parts = location.split(',').map(p => p.trim());
    
    // Common nearby areas for major cities
    const nearbyMap = {
      'Miami': ['Miami Beach', 'Coral Gables', 'Hialeah', 'Doral', 'Aventura'],
      'New York': ['Brooklyn', 'Queens', 'Bronx', 'Manhattan', 'Staten Island'],
      'Los Angeles': ['Santa Monica', 'Pasadena', 'Long Beach', 'Glendale', 'Burbank'],
      'Chicago': ['Evanston', 'Oak Park', 'Cicero', 'Arlington Heights', 'Naperville'],
      'Houston': ['Spring', 'The Woodlands', 'Pearland', 'Sugar Land', 'Katy'],
      'Phoenix': ['Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Gilbert'],
      'Philadelphia': ['Camden', 'Cherry Hill', 'Bensalem', 'Cheltenham', 'Norriton'],
      'San Antonio': ['New Braunfels', 'Boerne', 'Schertz', 'Cibolo', 'Universal City'],
      'San Diego': ['La Jolla', 'Coronado', 'Chula Vista', 'Oceanside', 'Carlsbad'],
      'Dallas': ['Arlington', 'Irving', 'Plano', 'Frisco', 'McKinney']
    };

    const city = parts[0];
    const state = parts[parts.length - 1];

    // Return nearby cities if available
    if (nearbyMap[city]) {
      return nearbyMap[city].map(nearby => `${nearby}, ${state}`);
    }

    // Fallback: return empty array (no nearby locations known)
    return [];
  }

  /**
   * Analyze properties with quality assessment
   * @param {array} properties - Array of properties to analyze
   * @param {string} leadType - Type of lead
   * @param {function} analyzeFunction - Function to analyze each property
   * @returns {Promise<array>} Array of analyzed properties with quality reports
   */
  async analyzePropertiesWithQuality(properties, leadType, analyzeFunction) {
    console.log(`[ExpandedSearchService] Analyzing ${properties.length} properties for quality`);

    const analysisPromises = properties.map(property =>
      analyzeFunction({
        zpid: property.id || property.zpid,
        latitude: property.latitude,
        longitude: property.longitude,
        address: property.address,
        zillow_data: property
      }).catch(error => {
        console.warn(`[ExpandedSearchService] Analysis failed for property ${property.id}:`, error.message);
        return null;
      })
    );

    const analysisResults = await Promise.all(analysisPromises);
    const successfulResults = analysisResults.filter(r => r !== null);

    console.log(`[ExpandedSearchService] Analysis completed: ${successfulResults.length}/${properties.length} successful`);

    return successfulResults;
  }

  /**
   * Get search statistics
   * @param {array} allResults - All search results
   * @param {array} qualityLeads - Quality filtered leads
   * @param {string} leadType - Type of lead
   * @returns {object} Statistics object
   */
  getSearchStats(allResults, qualityLeads, leadType) {
    const stats = {
      totalProperties: allResults.length,
      qualityLeads: qualityLeads.length,
      conversionRate: allResults.length > 0 
        ? ((qualityLeads.length / allResults.length) * 100).toFixed(2) + '%'
        : '0%',
      leadType,
      timestamp: new Date().toISOString()
    };

    // Quality breakdown
    const highQuality = qualityLeads.filter(l => l.qualityReport?.qualityScore === 'high').length;
    const mediumQuality = qualityLeads.filter(l => l.qualityReport?.qualityScore === 'medium').length;

    stats.qualityBreakdown = {
      high: highQuality,
      medium: mediumQuality,
      low: qualityLeads.length - highQuality - mediumQuality
    };

    return stats;
  }
}

module.exports = new ExpandedSearchService();
