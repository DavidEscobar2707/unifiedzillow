/**
 * Properties Routes
 * Handles all property-related API endpoints
 */

const express = require('express');
const zillowService = require('../services/zillowService');
const cacheService = require('../services/cacheService');
const transformService = require('../services/transformService');
const visualInspector = require('../services/visualInspector');
const leadQualityService = require('../services/leadQualityService');
const responseFormatter = require('../services/responseFormatter');
const batchLeadService = require('../services/batchLeadService');
const marketAnalyzerService = require('../services/marketAnalyzerService');

const router = express.Router();

/**
 * Validate search parameters
 * @param {object} params - Request parameters
 * @throws {Error} If validation fails
 */
function validateSearchParams(params) {
  const { location, filters } = params;

  if (!location || typeof location !== 'string' || location.trim() === '') {
    throw new Error('Location parameter is required and must be a non-empty string');
  }

  // Validate filter parameters if provided
  if (filters) {
    if (filters.minPrice !== undefined && isNaN(Number(filters.minPrice))) {
      throw new Error('minPrice must be a valid number');
    }
    if (filters.maxPrice !== undefined && isNaN(Number(filters.maxPrice))) {
      throw new Error('maxPrice must be a valid number');
    }
    if (filters.minBedrooms !== undefined && isNaN(Number(filters.minBedrooms))) {
      throw new Error('minBedrooms must be a valid number');
    }
    if (filters.maxBedrooms !== undefined && isNaN(Number(filters.maxBedrooms))) {
      throw new Error('maxBedrooms must be a valid number');
    }
  }
}

/**
 * Validate property ID parameter
 * @param {string} propertyId - Property ID to validate
 * @throws {Error} If validation fails
 */
function validatePropertyId(propertyId) {
  if (!propertyId || typeof propertyId !== 'string' || propertyId.trim() === '') {
    throw new Error('Property ID parameter is required and must be a non-empty string');
  }
}

/**
 * Validate address parameter
 * @param {string} address - Address to validate
 * @throws {Error} If validation fails
 */
function validateAddress(address) {
  if (!address || typeof address !== 'string' || address.trim() === '') {
    throw new Error('Address parameter is required and must be a non-empty string');
  }
}

/**
 * Validate visual validation parameters
 * @param {object} params - Request parameters
 * @throws {Error} If validation fails
 */
function validateVisualValidationParams(params) {
  const { latitude, longitude, lead_type } = params;

  if (latitude === undefined || latitude === null) {
    throw new Error('Latitude parameter is required');
  }

  if (typeof latitude !== 'number' && isNaN(Number(latitude))) {
    throw new Error('Latitude must be a valid number');
  }

  const lat = Number(latitude);
  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }

  if (longitude === undefined || longitude === null) {
    throw new Error('Longitude parameter is required');
  }

  if (typeof longitude !== 'number' && isNaN(Number(longitude))) {
    throw new Error('Longitude must be a valid number');
  }

  const lon = Number(longitude);
  if (lon < -180 || lon > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }

  if (!lead_type || typeof lead_type !== 'string' || lead_type.trim() === '') {
    throw new Error('Lead type parameter is required and must be a non-empty string');
  }

  if (!['PoolLeadGen', 'BackyardBoost'].includes(lead_type)) {
    throw new Error('Lead type must be either PoolLeadGen or BackyardBoost');
  }
}

/**
 * Get project-specific search configuration
 * @param {string} project - Project type (backyard, pool, market)
 * @returns {object} Project-specific configuration
 */
function getProjectConfig(project) {
  const configs = {
    backyard: {
      status_type: 'RecentlySold',
      home_type: 'Houses',
      keywords: 'backyard',
      minPrice: 200000,
      maxPrice: 1500000,
      minBedrooms: 2,
      maxBedrooms: 5
    },
    pool: {
      status_type: 'RecentlySold',
      home_type: 'Houses',
      keywords: 'pool',
      minPrice: 300000,
      maxPrice: 2000000,
      minBedrooms: 3,
      maxBedrooms: 6
    },
    market: {
      status_type: 'ForRent',
      home_type: 'All',
      minPrice: 500,
      maxPrice: 5000,
      minBedrooms: 1,
      maxBedrooms: 4
    }
  };

  return configs[project] || null;
}

/**
 * GET /api/properties/search
 * Search for properties by location and optional filters
 * Returns old format for backward compatibility
 * 
 * Query Parameters:
 *   - location (required): City, address, or zip code
 *   - project (optional): Project type (backyard, pool, market) - applies predefined filters
 *   - minPrice (optional): Minimum price filter
 *   - maxPrice (optional): Maximum price filter
 *   - minBedrooms (optional): Minimum bedrooms filter
 *   - maxBedrooms (optional): Maximum bedrooms filter
 *   - propertyType (optional): Type of property (house, condo, etc.)
 *   - sortBy (optional): Sort results by (price, date, relevance)
 *   - includeVisualValidation (optional): Include visual validation for results (PoolLeadGen or BackyardBoost)
 */
router.get('/search', async (req, res, next) => {
  try {
    const { location, project, minPrice, maxPrice, minBedrooms, maxBedrooms, propertyType, sortBy, includeVisualValidation } = req.query;

    // Validate required parameters
    validateSearchParams({
      location,
      filters: { minPrice, maxPrice, minBedrooms, maxBedrooms, propertyType, sortBy }
    });

    // Start with project-specific configuration if provided
    let filters = {};
    if (project) {
      const projectConfig = getProjectConfig(project);
      if (!projectConfig) {
        throw new Error('Invalid project type. Must be one of: backyard, pool, market');
      }
      filters = { ...projectConfig };
    }

    // Override with explicit query parameters if provided
    if (minPrice !== undefined) filters.minPrice = minPrice;
    if (maxPrice !== undefined) filters.maxPrice = maxPrice;
    if (minBedrooms !== undefined) filters.minBedrooms = minBedrooms;
    if (maxBedrooms !== undefined) filters.maxBedrooms = maxBedrooms;
    if (propertyType !== undefined) filters.propertyType = propertyType;
    if (sortBy !== undefined) filters.sortBy = sortBy;

    // Generate cache key including project parameter
    const cacheKey = cacheService.generateKey('search', { location, project, ...filters });

    // Check cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log('[PropertiesRoute] Returning cached search results for project:', project || 'general');
      return res.status(200).json(cachedResult);
    }

    // Call Zillow API service
    console.log('[PropertiesRoute] Fetching search results from Zillow API for project:', project || 'general');
    const rawResults = await zillowService.searchProperties({
      location,
      filters
    });

    // Transform response
    let transformedResponse = transformService.transformSearchResults(rawResults, false);

    // Add visual validation if requested
    if (includeVisualValidation && transformedResponse.data.properties.length > 0) {
      console.log('[PropertiesRoute] Adding visual validation to search results');
      
      try {
        // Add visual validation results to each property
        const propertiesWithValidation = await Promise.all(
          transformedResponse.data.properties.map(async (property) => {
            try {
              // Only validate if property has coordinates
              if (property.latitude && property.longitude) {
                const validationCacheKey = cacheService.generateKey('visual-validation', {
                  latitude: property.latitude,
                  longitude: property.longitude,
                  lead_type: includeVisualValidation
                });

                let validation = cacheService.get(validationCacheKey);
                
                if (!validation) {
                  const validationResult = await visualInspector.verify_property_visually(
                    property.latitude,
                    property.longitude,
                    includeVisualValidation,
                    property
                  );
                  validation = validationResult.validation;
                  cacheService.set(validationCacheKey, validation, 1800);
                }

                return {
                  ...property,
                  visualValidation: validation
                };
              }
              return property;
            } catch (validationError) {
              console.warn(`[PropertiesRoute] Visual validation failed for property ${property.id}:`, validationError.message);
              return property;
            }
          })
        );

        transformedResponse.data.properties = propertiesWithValidation;
      } catch (validationError) {
        console.warn('[PropertiesRoute] Visual validation post-processing failed:', validationError.message);
        // Continue with results without validation rather than failing the entire request
      }
    }

    // Cache the result
    cacheService.set(cacheKey, transformedResponse);

    res.status(200).json(transformedResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/properties/estimate
 * Get price estimate for a property by address
 * 
 * Query Parameters:
 *   - address (required): Property address
 */
router.get('/estimate', async (req, res, next) => {
  try {
    const { address } = req.query;

    // Validate address parameter
    validateAddress(address);

    // Generate cache key
    const cacheKey = cacheService.generateKey('estimate', { address });

    // Check cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log('[PropertiesRoute] Returning cached property estimate');
      return res.status(200).json(cachedResult);
    }

    // Call Zillow API service
    console.log('[PropertiesRoute] Fetching property estimate from Zillow API');
    const rawEstimateData = await zillowService.getPropertyEstimate(address);

    // Transform response
    const transformedResponse = transformService.wrapResponse(rawEstimateData, false);

    // Cache the result
    cacheService.set(cacheKey, transformedResponse);

    res.status(200).json(transformedResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/properties/validate-visual
 * Validate property characteristics using satellite imagery and LLM analysis
 * 
 * Request Body:
 *   - latitude (required): Property latitude
 *   - longitude (required): Property longitude
 *   - lead_type (required): Type of lead ('PoolLeadGen' or 'BackyardBoost')
 *   - property_id (optional): Zillow property ID for comparison
 *   - zillow_data (optional): Zillow property data for comparison
 */
router.post('/validate-visual', async (req, res, next) => {
  try {
    const { latitude, longitude, lead_type, property_id, zillow_data } = req.body;

    // Validate required parameters
    validateVisualValidationParams({
      latitude,
      longitude,
      lead_type
    });

    // Convert latitude and longitude to numbers
    const lat = Number(latitude);
    const lon = Number(longitude);

    // Generate cache key for visual validation
    const cacheKey = cacheService.generateKey('visual-validation', {
      latitude: lat,
      longitude: lon,
      lead_type
    });

    // Check cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log('[PropertiesRoute] Returning cached visual validation result');
      return res.status(200).json(cachedResult);
    }

    // Call Visual Inspector service
    console.log('[PropertiesRoute] Performing visual validation');
    const validationResult = await visualInspector.verify_property_visually(
      lat,
      lon,
      lead_type,
      zillow_data || {}
    );

    // Wrap response with metadata
    const transformedResponse = transformService.wrapResponse(validationResult.validation, false);

    // Cache the result with appropriate TTL (shorter than regular cache for visual data)
    cacheService.set(cacheKey, transformedResponse, 1800); // 30 minutes

    res.status(200).json(transformedResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to analyze a single backyard property
 * @param {object} property - Property data with zpid, latitude, longitude, address, zillow_data
 * @returns {Promise<object>} Analysis result for the property
 */
async function analyzeBackyardProperty(property) {
  const { zpid, latitude, longitude, address, zillow_data } = property;

  // Validate required parameters
  if (!zpid || typeof zpid !== 'string' || zpid.trim() === '') {
    throw new Error('ZPID parameter is required and must be a non-empty string');
  }

  validateVisualValidationParams({
    latitude,
    longitude,
    lead_type: 'BackyardBoost'
  });

  if (!address || typeof address !== 'string' || address.trim() === '') {
    throw new Error('Address parameter is required and must be a non-empty string');
  }

  // Convert latitude and longitude to numbers
  const lat = Number(latitude);
  const lon = Number(longitude);

  // Generate cache key for backyard analysis
  const cacheKey = cacheService.generateKey('backyard-analysis', {
    zpid,
    latitude: lat,
    longitude: lon
  });

  // Check cache first (24-hour TTL)
  const cachedResult = cacheService.get(cacheKey);
  if (cachedResult) {
    console.log('[PropertiesRoute] Returning cached backyard analysis result for zpid:', zpid);
    return cachedResult.data;
  }

  console.log('[PropertiesRoute] Starting BackyardBoost analysis for property:', zpid);

  // Step 1: Perform visual validation
  const visualValidation = await visualInspector.verify_property_visually(
    lat,
    lon,
    'BackyardBoost',
    zillow_data || {}
  );

  // Step 2: Generate quality report comparing visual results with Zillow data
  const qualityReport = leadQualityService.generateQualityReport(
    zpid,
    zillow_data || {},
    visualValidation.validation,
    'BackyardBoost'
  );

  // Step 3: Build enriched response with analysis results
  const analysisResult = {
    zpid,
    address,
    latitude: lat,
    longitude: lon,
    visualValidation: visualValidation.validation,
    qualityReport: {
      qualityScore: qualityReport.qualityScore,
      confidence: qualityReport.confidence,
      reasoning: qualityReport.reasoning,
      recommendation: qualityReport.recommendation,
      discrepancy: qualityReport.discrepancy,
      flag: qualityReport.flag || null
    },
    analysis: {
      leadType: 'BackyardBoost',
      backyardAssessment: {
        isEmpty: visualValidation.validation.analysis.is_empty_backyard,
        surfaceType: visualValidation.validation.analysis.surface_type,
        estimatedFreeArea: visualValidation.validation.analysis.estimated_free_area,
        structuresDetected: visualValidation.validation.analysis.structures_detected || [],
        confidence: visualValidation.validation.analysis.confidence
      },
      satelliteImageUrl: visualValidation.validation.satelliteImageUrl
    }
  };

  // Cache the result with 24-hour TTL (86400 seconds)
  const enrichedResponse = {
    success: true,
    data: analysisResult,
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'zillow-visual-inspector',
      cached: false,
      analysisType: 'BackyardBoost'
    }
  };
  cacheService.set(cacheKey, enrichedResponse, 86400);

  console.log('[PropertiesRoute] BackyardBoost analysis completed successfully for zpid:', zpid);
  return analysisResult;
}

/**
 * POST /api/properties/analyze-backyard
 * Analyze property backyard(s) using satellite imagery and visual validation
 * Supports both single property and batch processing
 * 
 * Request Body (Single):
 *   - zpid (required): Zillow property ID
 *   - latitude (required): Property latitude
 *   - longitude (required): Property longitude
 *   - address (required): Property address
 *   - zillow_data (optional): Zillow property data for comparison
 * 
 * Request Body (Batch):
 *   - properties (required): Array of property objects with same fields as single request
 */
router.post('/analyze-backyard', async (req, res, next) => {
  try {
    const { zpid, latitude, longitude, address, zillow_data, properties } = req.body;

    // Check if batch processing (properties array) or single property
    if (properties && Array.isArray(properties)) {
      console.log('[PropertiesRoute] Processing batch backyard analysis for', properties.length, 'properties');

      // Process all properties in parallel
      const results = await Promise.allSettled(
        properties.map(prop => analyzeBackyardProperty(prop))
      );

      // Build response with results and errors
      const analysisResults = [];
      const errors = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          analysisResults.push(result.value);
        } else {
          errors.push({
            propertyIndex: index,
            zpid: properties[index].zpid,
            error: result.reason.message
          });
        }
      });

      // Format leads for response
      const formattedLeads = analysisResults.map(result =>
        responseFormatter.formatLead(result, 'BackyardBoost')
      );

      // Extract location from first property or use default
      const location = properties[0]?.address?.split(',').pop()?.trim() || 'Unknown';

      const batchResponse = responseFormatter.formatBatchResponse(
        formattedLeads,
        location,
        'BackyardBoost'
      );

      // Add error information if any
      if (errors.length > 0) {
        batchResponse.errors = errors;
        batchResponse.success = false;
      } else {
        batchResponse.success = true;
      }

      console.log('[PropertiesRoute] Batch backyard analysis completed:', {
        total: properties.length,
        success: analysisResults.length,
        errors: errors.length
      });

      return res.status(errors.length === 0 ? 200 : 207).json(batchResponse);
    }

    // Single property processing
    if (!zpid || typeof zpid !== 'string' || zpid.trim() === '') {
      throw new Error('ZPID parameter is required and must be a non-empty string');
    }

    const analysisResult = await analyzeBackyardProperty({
      zpid,
      latitude,
      longitude,
      address,
      zillow_data
    });

    // Format lead for response
    const formattedLead = responseFormatter.formatLead(analysisResult, 'BackyardBoost');

    // Extract location from address
    const location = address?.split(',').pop()?.trim() || 'Unknown';

    const enrichedResponse = responseFormatter.formatBatchResponse(
      [formattedLead],
      location,
      'BackyardBoost'
    );

    enrichedResponse.success = true;

    console.log('[PropertiesRoute] BackyardBoost analysis completed successfully');
    res.status(200).json(enrichedResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to analyze a single pool property
 * @param {object} property - Property data with zpid, latitude, longitude, address, zillow_data
 * @returns {Promise<object>} Analysis result for the property
 */
async function analyzePoolProperty(property) {
  const { zpid, latitude, longitude, address, zillow_data } = property;

  // Validate required parameters
  if (!zpid || typeof zpid !== 'string' || zpid.trim() === '') {
    throw new Error('ZPID parameter is required and must be a non-empty string');
  }

  validateVisualValidationParams({
    latitude,
    longitude,
    lead_type: 'PoolLeadGen'
  });

  if (!address || typeof address !== 'string' || address.trim() === '') {
    throw new Error('Address parameter is required and must be a non-empty string');
  }

  // Convert latitude and longitude to numbers
  const lat = Number(latitude);
  const lon = Number(longitude);

  // Generate cache key for pool analysis
  const cacheKey = cacheService.generateKey('pool-analysis', {
    zpid,
    latitude: lat,
    longitude: lon
  });

  // Check cache first (24-hour TTL)
  const cachedResult = cacheService.get(cacheKey);
  if (cachedResult) {
    console.log('[PropertiesRoute] Returning cached pool analysis result for zpid:', zpid);
    return cachedResult.data;
  }

  console.log('[PropertiesRoute] Starting PoolLeadGen analysis for property:', zpid);

  // Step 1: Perform visual validation
  const visualValidation = await visualInspector.verify_property_visually(
    lat,
    lon,
    'PoolLeadGen',
    zillow_data || {}
  );

  // Step 2: Generate quality report comparing visual results with Zillow data
  const qualityReport = leadQualityService.generateQualityReport(
    zpid,
    zillow_data || {},
    visualValidation.validation,
    'PoolLeadGen'
  );

  // Step 3: Build enriched response with analysis results
  const analysisResult = {
    zpid,
    address,
    latitude: lat,
    longitude: lon,
    visualValidation: visualValidation.validation,
    qualityReport: {
      qualityScore: qualityReport.qualityScore,
      confidence: qualityReport.confidence,
      reasoning: qualityReport.reasoning,
      recommendation: qualityReport.recommendation,
      discrepancy: qualityReport.discrepancy,
      flag: qualityReport.flag || null
    },
    analysis: {
      leadType: 'PoolLeadGen',
      poolAssessment: {
        hasPool: visualValidation.validation.analysis.has_pool,
        poolType: visualValidation.validation.analysis.pool_type || null,
        poolSizeEstimate: visualValidation.validation.analysis.pool_size_estimate || null,
        waterBodies: visualValidation.validation.analysis.water_bodies || null,
        confidence: visualValidation.validation.analysis.confidence
      },
      satelliteImageUrl: visualValidation.validation.satelliteImageUrl
    }
  };

  // Cache the result with 24-hour TTL (86400 seconds)
  const enrichedResponse = {
    success: true,
    data: analysisResult,
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'zillow-visual-inspector',
      cached: false,
      analysisType: 'PoolLeadGen'
    }
  };
  cacheService.set(cacheKey, enrichedResponse, 86400);

  console.log('[PropertiesRoute] PoolLeadGen analysis completed successfully for zpid:', zpid);
  return analysisResult;
}

/**
 * POST /api/properties/analyze-pool
 * Analyze property pool(s) using satellite imagery and visual validation
 * Supports both single property and batch processing
 * 
 * Request Body (Single):
 *   - zpid (required): Zillow property ID
 *   - latitude (required): Property latitude
 *   - longitude (required): Property longitude
 *   - address (required): Property address
 *   - zillow_data (optional): Zillow property data for comparison
 * 
 * Request Body (Batch):
 *   - properties (required): Array of property objects with same fields as single request
 */
router.post('/analyze-pool', async (req, res, next) => {
  try {
    const { zpid, latitude, longitude, address, zillow_data, properties } = req.body;

    // Check if batch processing (properties array) or single property
    if (properties && Array.isArray(properties)) {
      console.log('[PropertiesRoute] Processing batch pool analysis for', properties.length, 'properties');

      // Process all properties in parallel
      const results = await Promise.allSettled(
        properties.map(prop => analyzePoolProperty(prop))
      );

      // Build response with results and errors
      const analysisResults = [];
      const errors = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          analysisResults.push(result.value);
        } else {
          errors.push({
            propertyIndex: index,
            zpid: properties[index].zpid,
            error: result.reason.message
          });
        }
      });

      // Format leads for response
      const formattedLeads = analysisResults.map(result =>
        responseFormatter.formatLead(result, 'PoolLeadGen')
      );

      // Extract location from first property or use default
      const location = properties[0]?.address?.split(',').pop()?.trim() || 'Unknown';

      const batchResponse = responseFormatter.formatBatchResponse(
        formattedLeads,
        location,
        'PoolLeadGen'
      );

      // Add error information if any
      if (errors.length > 0) {
        batchResponse.errors = errors;
        batchResponse.success = false;
      } else {
        batchResponse.success = true;
      }

      console.log('[PropertiesRoute] Batch pool analysis completed:', {
        total: properties.length,
        success: analysisResults.length,
        errors: errors.length
      });

      return res.status(errors.length === 0 ? 200 : 207).json(batchResponse);
    }

    // Single property processing
    if (!zpid || typeof zpid !== 'string' || zpid.trim() === '') {
      throw new Error('ZPID parameter is required and must be a non-empty string');
    }

    const analysisResult = await analyzePoolProperty({
      zpid,
      latitude,
      longitude,
      address,
      zillow_data
    });

    // Format lead for response
    const formattedLead = responseFormatter.formatLead(analysisResult, 'PoolLeadGen');

    // Extract location from address
    const location = address?.split(',').pop()?.trim() || 'Unknown';

    const enrichedResponse = responseFormatter.formatBatchResponse(
      [formattedLead],
      location,
      'PoolLeadGen'
    );

    enrichedResponse.success = true;

    console.log('[PropertiesRoute] PoolLeadGen analysis completed successfully');
    res.status(200).json(enrichedResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/properties/search-and-analyze-pool
 * Search for properties and analyze them for pool presence
 * 
 * Request Body:
 *   - location (required): City, address, or zip code
 *   - filters (optional): Price, bedrooms, bathrooms filters
 *   - count (optional): Maximum number of properties to analyze (default: all found)
 */
router.post('/search-and-analyze-pool', async (req, res, next) => {
  try {
    const { location, filters = {}, count } = req.body;

    // Validate location
    if (!location || typeof location !== 'string' || location.trim() === '') {
      throw new Error('Location parameter is required and must be a non-empty string');
    }

    console.log('[PropertiesRoute] Searching for properties in:', location, count ? `(limit: ${count})` : '');

    // Convert numeric filters to numbers
    const cleanFilters = { ...filters };
    if (cleanFilters.minPrice) cleanFilters.minPrice = Number(cleanFilters.minPrice);
    if (cleanFilters.maxPrice) cleanFilters.maxPrice = Number(cleanFilters.maxPrice);
    if (cleanFilters.minBedrooms) cleanFilters.minBedrooms = Number(cleanFilters.minBedrooms);
    if (cleanFilters.maxBedrooms) cleanFilters.maxBedrooms = Number(cleanFilters.maxBedrooms);

    // Step 1: Search for properties
    const rawSearchResults = await zillowService.searchProperties({
      location,
      filters: cleanFilters
    });

    // Transform search results to extract properties array
    const transformedResults = transformService.transformSearchResults(rawSearchResults, false);
    const properties = transformedResults.data.properties || [];

    // Log first property to debug structure
    if (properties.length > 0) {
      console.log('[PropertiesRoute] First property structure:', JSON.stringify(properties[0]).substring(0, 500));
    }

    if (!properties || properties.length === 0) {
      return res.status(200).json({
        success: true,
        location,
        count: 0,
        leads: [],
        csv: {
          filename: `poolleadgen_leads_${new Date().toISOString().split('T')[0]}.csv`,
          base64: Buffer.from('Address,Latitude,Longitude,ZPID,Lead Score,Quality Score,Confidence,Image URL,Pool Present,Pool Type,Pool Size,Water Bodies\n').toString('base64')
        }
      });
    }

    console.log('[PropertiesRoute] Found', properties.length, 'properties, starting pool analysis');

    // Filter properties that have required coordinates
    const propertiesWithCoords = properties.filter(p => p.latitude && p.longitude);
    
    if (propertiesWithCoords.length === 0) {
      console.warn('[PropertiesRoute] No properties with coordinates found');
      return res.status(200).json({
        success: true,
        location,
        count: 0,
        leads: [],
        csv: {
          filename: `poolleadgen_leads_${new Date().toISOString().split('T')[0]}.csv`,
          base64: Buffer.from('Address,Latitude,Longitude,ZPID,Lead Score,Quality Score,Confidence,Image URL,Pool Present,Pool Type,Pool Size,Water Bodies\n').toString('base64')
        }
      });
    }

    console.log('[PropertiesRoute] Found', propertiesWithCoords.length, 'properties with coordinates');

    // Limit properties if count is specified
    const propertiesToAnalyze = count && count > 0 
      ? propertiesWithCoords.slice(0, count) 
      : propertiesWithCoords;

    console.log('[PropertiesRoute] Analyzing', propertiesToAnalyze.length, 'properties for pools');

    // Step 2: Analyze each property for pools
    const analysisPromises = propertiesToAnalyze.map(property =>
      analyzePoolProperty({
        zpid: property.id || property.zpid,
        latitude: property.latitude,
        longitude: property.longitude,
        address: property.address,
        zillow_data: property
      }).catch(error => {
        console.warn('[PropertiesRoute] Pool analysis failed for property:', property.id || property.zpid, error.message);
        return null;
      })
    );

    const analysisResults = await Promise.all(analysisPromises);
    const successfulResults = analysisResults.filter(r => r !== null);

    // Step 3: Format response
    const formattedLeads = successfulResults.map(result =>
      responseFormatter.formatLead(result, 'PoolLeadGen')
    );

    const batchResponse = responseFormatter.formatBatchResponse(
      formattedLeads,
      location,
      'PoolLeadGen'
    );

    batchResponse.success = true;

    console.log('[PropertiesRoute] Pool analysis completed:', {
      total: properties.length,
      analyzed: successfulResults.length
    });

    res.status(200).json(batchResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/properties/search-and-analyze-backyard
 * Search for properties and analyze them for backyard potential
 * 
 * Request Body:
 *   - location (required): City, address, or zip code
 *   - filters (optional): Price, bedrooms, bathrooms filters
 *   - count (optional): Maximum number of properties to analyze (default: all found)
 */
router.post('/search-and-analyze-backyard', async (req, res, next) => {
  try {
    const { location, filters = {}, count } = req.body;

    // Validate location
    if (!location || typeof location !== 'string' || location.trim() === '') {
      throw new Error('Location parameter is required and must be a non-empty string');
    }

    console.log('[PropertiesRoute] Searching for properties in:', location, count ? `(limit: ${count})` : '');

    // Convert numeric filters to numbers
    const cleanFilters = { ...filters };
    if (cleanFilters.minPrice) cleanFilters.minPrice = Number(cleanFilters.minPrice);
    if (cleanFilters.maxPrice) cleanFilters.maxPrice = Number(cleanFilters.maxPrice);
    if (cleanFilters.minBedrooms) cleanFilters.minBedrooms = Number(cleanFilters.minBedrooms);
    if (cleanFilters.maxBedrooms) cleanFilters.maxBedrooms = Number(cleanFilters.maxBedrooms);

    // Step 1: Search for properties
    const rawSearchResults = await zillowService.searchProperties({
      location,
      filters: cleanFilters
    });

    // Transform search results to extract properties array
    const transformedResults = transformService.transformSearchResults(rawSearchResults, false);
    const properties = transformedResults.data.properties || [];

    if (!properties || properties.length === 0) {
      return res.status(200).json({
        success: true,
        location,
        count: 0,
        leads: [],
        csv: {
          filename: `backyardboost_leads_${new Date().toISOString().split('T')[0]}.csv`,
          base64: Buffer.from('Address,Latitude,Longitude,ZPID,Lead Score,Quality Score,Confidence,Image URL,Empty Backyard,Surface Type,Free Area,Structures\n').toString('base64')
        }
      });
    }

    console.log('[PropertiesRoute] Found', properties.length, 'properties, starting backyard analysis');

    // Filter properties that have required coordinates
    const propertiesWithCoords = properties.filter(p => p.latitude && p.longitude);
    
    if (propertiesWithCoords.length === 0) {
      console.warn('[PropertiesRoute] No properties with coordinates found');
      return res.status(200).json({
        success: true,
        location,
        count: 0,
        leads: [],
        csv: {
          filename: `backyardboost_leads_${new Date().toISOString().split('T')[0]}.csv`,
          base64: Buffer.from('Address,Latitude,Longitude,ZPID,Lead Score,Quality Score,Confidence,Image URL,Empty Backyard,Surface Type,Free Area,Structures\n').toString('base64')
        }
      });
    }

    console.log('[PropertiesRoute] Found', propertiesWithCoords.length, 'properties with coordinates');

    // Limit properties if count is specified
    const propertiesToAnalyze = count && count > 0 
      ? propertiesWithCoords.slice(0, count) 
      : propertiesWithCoords;

    console.log('[PropertiesRoute] Analyzing', propertiesToAnalyze.length, 'properties for backyards');

    // Step 2: Analyze each property for backyard
    const analysisPromises = propertiesToAnalyze.map(property =>
      analyzeBackyardProperty({
        zpid: property.id || property.zpid,
        latitude: property.latitude,
        longitude: property.longitude,
        address: property.address,
        zillow_data: property
      }).catch(error => {
        console.warn('[PropertiesRoute] Backyard analysis failed for property:', property.id || property.zpid, error.message);
        return null;
      })
    );

    const analysisResults = await Promise.all(analysisPromises);
    const successfulResults = analysisResults.filter(r => r !== null);

    // Step 3: Format response
    const formattedLeads = successfulResults.map(result =>
      responseFormatter.formatLead(result, 'BackyardBoost')
    );

    const batchResponse = responseFormatter.formatBatchResponse(
      formattedLeads,
      location,
      'BackyardBoost'
    );

    batchResponse.success = true;

    console.log('[PropertiesRoute] Backyard analysis completed:', {
      total: properties.length,
      analyzed: successfulResults.length
    });

    res.status(200).json(batchResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/properties/search-and-analyze
 * Search for properties and analyze them with specified lead type
 * 
 * Request Body:
 *   - location (required): City, address, or zip code
 *   - lead_type (required): 'PoolLeadGen' or 'BackyardBoost'
 *   - filters (optional): Price, bedrooms, bathrooms filters
 *   - count (optional): Maximum number of properties to analyze (default: all found)
 */
router.post('/search-and-analyze', async (req, res, next) => {
  try {
    const { location, lead_type, filters = {}, count } = req.body;

    // Validate location
    if (!location || typeof location !== 'string' || location.trim() === '') {
      throw new Error('Location parameter is required and must be a non-empty string');
    }

    // Validate lead type
    if (!lead_type || !['PoolLeadGen', 'BackyardBoost'].includes(lead_type)) {
      throw new Error('Lead type must be either PoolLeadGen or BackyardBoost');
    }

    console.log('[PropertiesRoute] Searching for properties in:', location, 'with lead type:', lead_type, count ? `(limit: ${count})` : '');

    // Step 1: Search for properties
    const rawSearchResults = await zillowService.searchProperties({
      location,
      filters
    });

    // Transform search results to extract properties array
    const transformedResults = transformService.transformSearchResults(rawSearchResults, false);
    const properties = transformedResults.data.properties || [];

    if (!properties || properties.length === 0) {
      const filename = lead_type === 'PoolLeadGen' 
        ? `poolleadgen_leads_${new Date().toISOString().split('T')[0]}.csv`
        : `backyardboost_leads_${new Date().toISOString().split('T')[0]}.csv`;
      
      return res.status(200).json({
        success: true,
        location,
        count: 0,
        leads: [],
        csv: {
          filename,
          base64: Buffer.from('Address,Latitude,Longitude,ZPID,Lead Score,Quality Score,Confidence,Image URL\n').toString('base64')
        }
      });
    }

    console.log('[PropertiesRoute] Found', properties.length, 'properties, starting', lead_type, 'analysis');

    // Filter properties that have required coordinates
    const propertiesWithCoords = properties.filter(p => p.latitude && p.longitude);
    
    if (propertiesWithCoords.length === 0) {
      console.warn('[PropertiesRoute] No properties with coordinates found');
      const filename = lead_type === 'PoolLeadGen' 
        ? `poolleadgen_leads_${new Date().toISOString().split('T')[0]}.csv`
        : `backyardboost_leads_${new Date().toISOString().split('T')[0]}.csv`;
      
      return res.status(200).json({
        success: true,
        location,
        count: 0,
        leads: [],
        csv: {
          filename,
          base64: Buffer.from('Address,Latitude,Longitude,ZPID,Lead Score,Quality Score,Confidence,Image URL\n').toString('base64')
        }
      });
    }

    console.log('[PropertiesRoute] Found', propertiesWithCoords.length, 'properties with coordinates');

    // Limit properties if count is specified
    const propertiesToAnalyze = count && count > 0 
      ? propertiesWithCoords.slice(0, count) 
      : propertiesWithCoords;

    console.log('[PropertiesRoute] Analyzing', propertiesToAnalyze.length, 'properties');

    // Step 2: Analyze each property based on lead type
    const analyzeFunction = lead_type === 'PoolLeadGen' ? analyzePoolProperty : analyzeBackyardProperty;
    
    const analysisPromises = propertiesToAnalyze.map(property =>
      analyzeFunction({
        zpid: property.id || property.zpid,
        latitude: property.latitude,
        longitude: property.longitude,
        address: property.address,
        zillow_data: property
      }).catch(error => {
        console.warn('[PropertiesRoute] Analysis failed for property:', property.id || property.zpid, error.message);
        return null;
      })
    );

    const analysisResults = await Promise.all(analysisPromises);
    const successfulResults = analysisResults.filter(r => r !== null);

    // Step 3: Format response
    const formattedLeads = successfulResults.map(result =>
      responseFormatter.formatLead(result, lead_type)
    );

    const batchResponse = responseFormatter.formatBatchResponse(
      formattedLeads,
      location,
      lead_type
    );

    batchResponse.success = true;

    console.log('[PropertiesRoute] Analysis completed:', {
      total: properties.length,
      analyzed: successfulResults.length,
      leadType: lead_type
    });

    res.status(200).json(batchResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/properties/batch-leads
 * Get batch of valid leads with automatic validation
 * Fetches more leads than requested to ensure quality
 * 
 * Request Body:
 *   - location (required): Property location
 *   - leadType (required): Type of lead (PoolLeadGen or BackyardBoost)
 *   - requestedLeads (required): Number of leads (10, 25, 50, or 100)
 */
router.post('/batch-leads', async (req, res, next) => {
  try {
    const { location, leadType, requestedLeads } = req.body;

    // Validate required parameters
    if (!location || typeof location !== 'string' || location.trim() === '') {
      throw new Error('Location parameter is required and must be a non-empty string');
    }

    if (!['PoolLeadGen', 'BackyardBoost'].includes(leadType)) {
      throw new Error('Lead type must be PoolLeadGen or BackyardBoost');
    }

    const validRequestedLeads = [10, 25, 50, 100];
    if (!validRequestedLeads.includes(requestedLeads)) {
      throw new Error('Requested leads must be 10, 25, 50, or 100');
    }

    console.log('[PropertiesRoute] Batch leads request:', {
      location,
      leadType,
      requestedLeads
    });

    // Generate cache key
    const cacheKey = cacheService.generateKey('batch-leads', {
      location,
      leadType,
      requestedLeads
    });

    // Check cache first (cache for 1 hour)
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log('[PropertiesRoute] Returning cached batch leads');
      return res.status(200).json(cachedResult);
    }

    // Get batch leads
    const batchResult = await batchLeadService.getBatchLeads(
      location,
      leadType,
      requestedLeads
    );

    // Wrap response
    const response = {
      success: true,
      data: batchResult,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'zillow-batch-lead-service',
        cached: false
      }
    };

    // Cache the result
    cacheService.set(cacheKey, response, 3600); // 1 hour

    console.log('[PropertiesRoute] Batch leads completed:', {
      location,
      leadType,
      requested: requestedLeads,
      delivered: batchResult.leads.length
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/properties/batch-leads-multiple
 * Get batch of valid leads for multiple lead types
 * 
 * Request Body:
 *   - location (required): Property location
 *   - leadTypes (required): Array of lead types (PoolLeadGen, BackyardBoost)
 *   - requestedLeads (required): Number of leads per type (10, 25, 50, or 100)
 */
router.post('/batch-leads-multiple', async (req, res, next) => {
  try {
    const { location, leadTypes, requestedLeads } = req.body;

    // Validate required parameters
    if (!location || typeof location !== 'string' || location.trim() === '') {
      throw new Error('Location parameter is required and must be a non-empty string');
    }

    if (!Array.isArray(leadTypes) || leadTypes.length === 0) {
      throw new Error('Lead types must be a non-empty array');
    }

    for (const leadType of leadTypes) {
      if (!['PoolLeadGen', 'BackyardBoost'].includes(leadType)) {
        throw new Error('Each lead type must be PoolLeadGen or BackyardBoost');
      }
    }

    const validRequestedLeads = [10, 25, 50, 100];
    if (!validRequestedLeads.includes(requestedLeads)) {
      throw new Error('Requested leads must be 10, 25, 50, or 100');
    }

    console.log('[PropertiesRoute] Batch leads multiple request:', {
      location,
      leadTypes,
      requestedLeads
    });

    // Get batch leads for multiple types
    const batchResult = await batchLeadService.getBatchLeadsMultiple(
      location,
      leadTypes,
      requestedLeads
    );

    // Wrap response
    const response = {
      success: true,
      data: batchResult,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'zillow-batch-lead-service',
        cached: false
      }
    };

    console.log('[PropertiesRoute] Batch leads multiple completed:', {
      location,
      leadTypes,
      requestedLeads
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/properties/:id
 * Fetch details for a specific property by ID
 * 
 * Path Parameters:
 *   - id (required): Property ID (zpid)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate property ID parameter
    validatePropertyId(id);

    // Generate cache key
    const cacheKey = cacheService.generateKey('property', { id });

    // Check cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log('[PropertiesRoute] Returning cached property details');
      return res.status(200).json(cachedResult);
    }

    // Call Zillow API service
    console.log('[PropertiesRoute] Fetching property details from Zillow API');
    const rawPropertyData = await zillowService.getPropertyDetails(id);

    // Transform response
    const transformedProperty = transformService.transformProperty(rawPropertyData, false);
    const transformedResponse = transformService.wrapResponse(transformedProperty, false);

    // Cache the result
    cacheService.set(cacheKey, transformedResponse);

    res.status(200).json(transformedResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/properties/market-analyzer
 * Analyze market opportunities - find properties where rent is higher than mortgage
 * 
 * Request Body:
 *   - location (required): Property location (city, zip code, etc.)
 *   - filters (optional): Search filters (minPrice, maxPrice, minBedrooms, maxBedrooms)
 *   - analysisOptions (optional): Investment analysis parameters
 *     - downPaymentPercent: Down payment percentage (default 20)
 *     - interestRate: Annual interest rate (default 6.5)
 *     - loanTermYears: Loan term in years (default 30)
 *     - maintenancePercent: Annual maintenance as % of property value (default 1)
 *     - vacancyPercent: Vacancy rate percentage (default 5)
 *     - propertyManagementPercent: Property management as % of rental income (default 8)
 */
router.post('/market-analyzer', async (req, res, next) => {
  try {
    const { location, filters = {}, analysisOptions = {} } = req.body;

    // Validate location
    if (!location || typeof location !== 'string' || location.trim() === '') {
      throw new Error('Location parameter is required and must be a non-empty string');
    }

    console.log('[PropertiesRoute] Market analysis request for location:', location);

    // Generate cache key
    const cacheKey = cacheService.generateKey('market-analysis', {
      location,
      filters,
      analysisOptions
    });

    // Check cache first (cache for 6 hours)
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log('[PropertiesRoute] Returning cached market analysis');
      return res.status(200).json(cachedResult);
    }

    // Perform market analysis
    const analysisResult = await marketAnalyzerService.analyzeMarketOpportunities(
      location,
      filters,
      analysisOptions
    );

    // Wrap response
    const response = {
      success: true,
      data: analysisResult,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'zillow-market-analyzer',
        cached: false
      }
    };

    // Cache the result (6 hours)
    cacheService.set(cacheKey, response, 21600);

    console.log('[PropertiesRoute] Market analysis completed:', {
      location,
      totalAnalyzed: analysisResult.totalPropertiesAnalyzed,
      opportunities: analysisResult.summary.opportunityCount
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
