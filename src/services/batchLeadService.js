/**
 * Batch Lead Service
 * Handles batch processing of leads with validation
 * Fetches more leads than requested to ensure quality
 */

const zillowService = require('./zillowService');
const visualInspector = require('./visualInspector');
const leadQualityService = require('./leadQualityService');
const cacheService = require('./cacheService');

/**
 * Price ranges for breaking down searches
 * Helps get more results by dividing into price groups
 */
const PRICE_RANGES = [
  { min: 0, max: 100000 },
  { min: 100001, max: 300000 },
  { min: 300001, max: 500000 },
  { min: 500001, max: 750000 },
  { min: 750001, max: 1000000 },
  { min: 1000001, max: 1500000 },
  { min: 1500001, max: 2000000 },
  { min: 2000001, max: 5000000 }
];

/**
 * Get buffer size based on requested leads
 * Always fetch 15 more leads to ensure we have enough valid ones
 * @param {number} requestedLeads - Number of leads requested
 * @returns {number} Total leads to fetch
 */
function getBufferSize(requestedLeads) {
  return requestedLeads + 15;
}

/**
 * Validate a lead based on lead type
 * @param {object} property - Property data
 * @param {string} leadType - Type of lead (PoolLeadGen or BackyardBoost)
 * @param {object} visualValidation - Visual validation result
 * @returns {boolean} True if lead is valid
 */
function isValidLead(property, leadType, visualValidation) {
  if (!property || !visualValidation || !visualValidation.analysis) {
    return false;
  }

  const analysis = visualValidation.analysis;

  if (leadType === 'PoolLeadGen') {
    // For pool leads: must have a pool
    return analysis.has_pool === true && analysis.confidence >= 60;
  } else if (leadType === 'BackyardBoost') {
    // For backyard leads: must have a backyard that's not empty and is modifiable
    return (
      analysis.is_empty_backyard === false &&
      analysis.confidence >= 60 &&
      analysis.surface_type !== 'concrete' // Concrete is not modifiable
    );
  }

  return false;
}

/**
 * Search properties across multiple price ranges
 * @param {string} location - Property location
 * @param {string} leadType - Type of lead
 * @param {number} totalNeeded - Total properties needed
 * @returns {Promise<array>} Array of properties
 */
async function searchAcrossPriceRanges(location, leadType, totalNeeded) {
  const allProperties = [];
  const seenIds = new Set();

  console.log(`[BatchLeadService] Searching for ${totalNeeded} properties across price ranges`);

  for (const priceRange of PRICE_RANGES) {
    if (allProperties.length >= totalNeeded) {
      break;
    }

    try {
      console.log(
        `[BatchLeadService] Searching price range: $${priceRange.min} - $${priceRange.max}`
      );

      const results = await zillowService.searchProperties({
        location,
        filters: {
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
          minBedrooms: leadType === 'PoolLeadGen' ? 3 : 2,
          maxBedrooms: 6
        }
      });

      if (results && results.data && results.data.properties) {
        for (const property of results.data.properties) {
          // Avoid duplicates
          if (!seenIds.has(property.id)) {
            allProperties.push(property);
            seenIds.add(property.id);

            if (allProperties.length >= totalNeeded) {
              break;
            }
          }
        }
      }
    } catch (error) {
      console.warn(
        `[BatchLeadService] Error searching price range $${priceRange.min}-$${priceRange.max}:`,
        error.message
      );
      // Continue with next price range
    }
  }

  console.log(`[BatchLeadService] Found ${allProperties.length} properties`);
  return allProperties;
}

/**
 * Validate properties and return valid leads
 * @param {array} properties - Array of properties to validate
 * @param {string} leadType - Type of lead
 * @param {number} requestedLeads - Number of leads requested
 * @returns {Promise<array>} Array of valid leads
 */
async function validateAndFilterLeads(properties, leadType, requestedLeads) {
  const validLeads = [];
  const invalidLeads = [];

  console.log(
    `[BatchLeadService] Validating ${properties.length} properties for ${leadType}`
  );

  for (const property of properties) {
    if (validLeads.length >= requestedLeads) {
      break;
    }

    try {
      // Skip if missing coordinates
      if (!property.latitude || !property.longitude) {
        invalidLeads.push({
          id: property.id,
          reason: 'Missing coordinates'
        });
        continue;
      }

      // Check cache first
      const cacheKey = cacheService.generateKey('visual-validation', {
        latitude: property.latitude,
        longitude: property.longitude,
        lead_type: leadType
      });

      let validation = cacheService.get(cacheKey);

      if (!validation) {
        // Perform visual validation
        const validationResult = await visualInspector.verify_property_visually(
          property.latitude,
          property.longitude,
          leadType,
          property
        );
        validation = validationResult.validation;
        cacheService.set(cacheKey, validation, 1800); // Cache for 30 minutes
      }

      // Check if lead is valid
      if (isValidLead(property, leadType, validation)) {
        // Generate quality report
        const qualityReport = leadQualityService.generateQualityReport(
          property.id,
          property,
          validation,
          leadType
        );

        validLeads.push({
          ...property,
          visualValidation: validation,
          qualityReport: qualityReport,
          leadType: leadType
        });

        console.log(
          `[BatchLeadService] Valid lead found: ${property.address} (${property.id})`
        );
      } else {
        invalidLeads.push({
          id: property.id,
          address: property.address,
          reason: 'Failed validation criteria'
        });
      }
    } catch (error) {
      console.warn(
        `[BatchLeadService] Error validating property ${property.id}:`,
        error.message
      );
      invalidLeads.push({
        id: property.id,
        address: property.address,
        reason: error.message
      });
    }
  }

  console.log(
    `[BatchLeadService] Validation complete: ${validLeads.length} valid, ${invalidLeads.length} invalid`
  );

  return {
    validLeads,
    invalidLeads,
    totalValidated: properties.length
  };
}

/**
 * Get batch of valid leads
 * @param {string} location - Property location
 * @param {string} leadType - Type of lead (PoolLeadGen or BackyardBoost)
 * @param {number} requestedLeads - Number of leads requested (10, 25, 50, or 100)
 * @returns {Promise<object>} Object with valid leads and metadata
 */
async function getBatchLeads(location, leadType, requestedLeads) {
  // Validate inputs
  if (!location || typeof location !== 'string') {
    throw new Error('Location is required');
  }

  if (!['PoolLeadGen', 'BackyardBoost'].includes(leadType)) {
    throw new Error('Lead type must be PoolLeadGen or BackyardBoost');
  }

  const validRequestedLeads = [10, 25, 50, 100];
  if (!validRequestedLeads.includes(requestedLeads)) {
    throw new Error('Requested leads must be 10, 25, 50, or 100');
  }

  console.log(
    `[BatchLeadService] Starting batch lead retrieval: ${requestedLeads} leads of type ${leadType} in ${location}`
  );

  // Calculate how many to fetch (requested + 15 buffer)
  const totalToFetch = getBufferSize(requestedLeads);

  // Search across price ranges to get enough properties
  const properties = await searchAcrossPriceRanges(location, leadType, totalToFetch);

  if (properties.length === 0) {
    throw new Error('No properties found in the specified location');
  }

  // Validate and filter leads
  const { validLeads, invalidLeads, totalValidated } = await validateAndFilterLeads(
    properties,
    leadType,
    requestedLeads
  );

  // Check if we have enough valid leads
  if (validLeads.length < requestedLeads) {
    console.warn(
      `[BatchLeadService] Only found ${validLeads.length} valid leads, requested ${requestedLeads}`
    );
  }

  // Return results
  return {
    success: true,
    location,
    leadType,
    requestedLeads,
    deliveredLeads: validLeads.length,
    leads: validLeads.slice(0, requestedLeads), // Return only requested amount
    metadata: {
      totalValidated,
      totalValid: validLeads.length,
      totalInvalid: invalidLeads.length,
      bufferUsed: totalToFetch - requestedLeads,
      timestamp: new Date().toISOString(),
      source: 'zillow-batch-lead-service'
    },
    statistics: {
      validationRate: totalValidated > 0 ? ((validLeads.length / totalValidated) * 100).toFixed(2) + '%' : '0%',
      priceRangesSearched: PRICE_RANGES.length,
      averageConfidence: validLeads.length > 0
        ? (validLeads.reduce((sum, lead) => sum + (lead.visualValidation?.analysis?.confidence || 0), 0) / validLeads.length).toFixed(2)
        : 0
    }
  };
}

/**
 * Get batch leads for multiple lead types
 * @param {string} location - Property location
 * @param {array} leadTypes - Array of lead types
 * @param {number} requestedLeads - Number of leads per type
 * @returns {Promise<object>} Object with leads for each type
 */
async function getBatchLeadsMultiple(location, leadTypes, requestedLeads) {
  const results = {};

  for (const leadType of leadTypes) {
    try {
      results[leadType] = await getBatchLeads(location, leadType, requestedLeads);
    } catch (error) {
      console.error(`[BatchLeadService] Error getting ${leadType} leads:`, error.message);
      results[leadType] = {
        success: false,
        error: error.message,
        leadType
      };
    }
  }

  return {
    success: Object.values(results).every(r => r.success !== false),
    location,
    requestedLeads,
    results,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getBatchLeads,
  getBatchLeadsMultiple,
  isValidLead,
  getBufferSize,
  PRICE_RANGES
};
