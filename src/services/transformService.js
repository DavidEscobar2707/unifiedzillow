/**
 * Transform Service
 * Standardizes API responses into consistent format
 */
class TransformService {
  /**
   * Transform raw Zillow property data to standard format
   * @param {object} rawData - Raw property data from Zillow API
   * @param {boolean} cached - Whether this data came from cache
   * @returns {object} Transformed property object
   */
  transformProperty(rawData, cached = false) {
    if (!rawData) {
      return null;
    }

    //prueba

    // Extract and map relevant fields from raw Zillow data
    const transformed = {
      id: rawData.zpid || rawData.id,
      address: rawData.address || '',
      city: rawData.city || '',
      state: rawData.state || '',
      zipCode: rawData.zipcode || rawData.zip || '',
      price: this.parseNumber(rawData.price || rawData.unformattedPrice),
      bedrooms: this.parseNumber(rawData.bedrooms),
      bathrooms: this.parseNumber(rawData.bathrooms),
      squareFeet: this.parseNumber(rawData.squareFeet || rawData.sqft || rawData.livingArea),
      propertyType: rawData.propertyType || rawData.type || rawData.homeType || '',
      yearBuilt: this.parseNumber(rawData.yearBuilt),
      listingUrl: rawData.url || rawData.listingUrl || rawData.detailUrl || '',
      imageUrl: rawData.imageUrl || rawData.image || rawData.imgSrc || '',
      latitude: this.parseNumber(rawData.latitude || rawData.lat),
      longitude: this.parseNumber(rawData.longitude || rawData.lng || rawData.lon),
      has_pool: rawData.has_pool || false,
      has_backyard: rawData.has_backyard !== false,
      lastUpdated: rawData.lastUpdated || new Date().toISOString()
    };

    return transformed;
  }

  /**
   * Transform search results from Zillow API
   * @param {object} rawResults - Raw search results from Zillow API
   * @param {boolean} cached - Whether this data came from cache
   * @returns {object} Transformed search response with metadata
   */
  transformSearchResults(rawResults, cached = false) {
    if (!rawResults) {
      return {
        success: true,
        data: {
          properties: [],
          totalCount: 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'zillow',
          cached
        }
      };
    }

    // Log raw response for debugging
    console.log('[TransformService] Raw API response:', JSON.stringify(rawResults).substring(0, 500));

    // Handle different response structures from Zillow API
    let properties = [];
    
    if (Array.isArray(rawResults)) {
      properties = rawResults;
    } else if (rawResults.props && Array.isArray(rawResults.props)) {
      properties = rawResults.props;
    } else if (rawResults.results && Array.isArray(rawResults.results)) {
      properties = rawResults.results;
    } else if (rawResults.properties && Array.isArray(rawResults.properties)) {
      properties = rawResults.properties;
    } else if (rawResults.data && Array.isArray(rawResults.data)) {
      properties = rawResults.data;
    } else if (rawResults.zpids && Array.isArray(rawResults.zpids)) {
      properties = rawResults.zpids;
    } else {
      // If response is an object with property data, try to extract it
      console.warn('[TransformService] Unexpected response structure:', Object.keys(rawResults));
    }

    const transformedProperties = properties.map(prop =>
      this.transformProperty(prop, cached)
    ).filter(prop => prop !== null);

    return {
      success: true,
      data: {
        properties: transformedProperties,
        totalCount: transformedProperties.length
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'zillow',
        cached
      }
    };
  }

  /**
   * Transform error to standardized error response
   * @param {Error} error - Error object
   * @param {string} requestId - Request ID for tracking
   * @returns {object} Standardized error response
   */
  transformError(error, requestId = '') {
    const statusCode = error.statusCode || 500;
    const errorCode = this.getErrorCode(statusCode, error.message);
    const message = error.message || 'An unexpected error occurred';

    return {
      success: false,
      error: {
        code: errorCode,
        message,
        statusCode,
        timestamp: new Date().toISOString(),
        requestId: requestId || this.generateRequestId()
      }
    };
  }

  /**
   * Wrap successful response with metadata
   * @param {object} data - Response data
   * @param {boolean} cached - Whether data came from cache
   * @returns {object} Response with metadata
   */
  wrapResponse(data, cached = false) {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'zillow',
        cached
      }
    };
  }

  /**
   * Parse a value to number, return null if invalid
   * @param {*} value - Value to parse
   * @returns {number|null} Parsed number or null
   */
  parseNumber(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Determine error code based on status code and message
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @returns {string} Error code
   */
  getErrorCode(statusCode, message = '') {
    const messageLower = message.toLowerCase();

    switch (statusCode) {
      case 400:
        if (messageLower.includes('location')) return 'INVALID_LOCATION';
        if (messageLower.includes('parameter')) return 'INVALID_PARAMETER';
        return 'VALIDATION_ERROR';
      case 401:
      case 403:
        return 'AUTHENTICATION_ERROR';
      case 404:
        return 'NOT_FOUND';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      case 504:
        return 'GATEWAY_TIMEOUT';
      default:
        return 'API_ERROR';
    }
  }

  /**
   * Generate a unique request ID for tracking
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new TransformService();
