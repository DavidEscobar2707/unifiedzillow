const axios = require('axios');
const config = require('../config');

/**
 * Zillow API Client Service
 * Handles all communication with the Zillow RapidAPI
 */
class ZillowService {
  constructor() {
    this.apiKey = config.api.key;
    this.apiHost = config.api.host;
    this.baseURL = `https://${this.apiHost}`;
    
    // Create axios instance with default headers
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': this.apiHost
      },
      timeout: 10000
    });
  }

  /**
   * Generic method to make HTTP requests to Zillow API
   * @param {string} endpoint - API endpoint path
   * @param {object} params - Query parameters
   * @returns {Promise<object>} API response data
   * @throws {Error} If request fails
   */
  async makeRequest(endpoint, params = {}) {
    try {
      console.log(`[ZillowService] Making request to ${endpoint}`, { params });
      
      const response = await this.client.get(endpoint, { params });
      
      console.log(`[ZillowService] Request successful to ${endpoint}`);
      return response.data;
    } catch (error) {
      this.handleError(error, endpoint, params);
    }
  }

  /**
   * Search for properties by location and filters
   * @param {object} searchParams - Search parameters
   * @param {string} searchParams.location - Location (city, address, or zip)
   * @param {object} searchParams.filters - Optional filters (price range, bedrooms, etc.)
   * @returns {Promise<object>} Search results
   */
  async searchProperties(searchParams) {
    const { location, filters = {} } = searchParams;

    if (!location) {
      throw new Error('Location parameter is required for property search');
    }

    // Add default parameters for extended search
    const params = {
      location,
      status_type: filters.status_type || 'ForSale',
      home_type: filters.home_type || 'Houses',
      ...filters
    };

    return this.makeRequest('/propertyExtendedSearch', params);
  }

  /**
   * Fetch details for a specific property
   * @param {string} propertyId - Property ID
   * @returns {Promise<object>} Property details
   */
  async getPropertyDetails(propertyId) {
    if (!propertyId) {
      throw new Error('Property ID is required');
    }

    const params = {
      zpid: propertyId
    };

    return this.makeRequest('/property', params);
  }

  /**
   * Get price estimate for a property
   * @param {string} address - Property address
   * @returns {Promise<object>} Price estimate data
   */
  async getPropertyEstimate(address) {
    if (!address) {
      throw new Error('Address parameter is required for price estimate');
    }

    const params = {
      address
    };

    return this.makeRequest('/propertyEstimate', params);
  }

  /**
   * Search for recently sold properties by location
   * @param {object} searchParams - Search parameters
   * @param {string} searchParams.location - Location (city, address, or zip)
   * @param {object} searchParams.filters - Optional filters (price range, bedrooms, etc.)
   * @returns {Promise<object>} Recently sold properties
   */
  async getRecentlySoldProperties(searchParams) {
    const { location, filters = {} } = searchParams;

    if (!location) {
      throw new Error('Location parameter is required for recently sold search');
    }

    // Set status_type to RecentlySold for this search
    const params = {
      location,
      status_type: 'RecentlySold',
      home_type: filters.home_type || 'Houses',
      ...filters
    };

    return this.makeRequest('/propertyExtendedSearch', params);
  }

  /**
   * Handle API errors with standardized logging
   * @param {Error} error - Error object
   * @param {string} endpoint - API endpoint
   * @param {object} params - Request parameters
   * @throws {Error} Formatted error
   */
  handleError(error, endpoint, params) {
    const errorInfo = {
      endpoint,
      params,
      timestamp: new Date().toISOString()
    };

    if (error.response) {
      // API returned an error response
      const { status, data } = error.response;
      errorInfo.statusCode = status;
      errorInfo.apiError = data;

      console.error(`[ZillowService] API Error (${status}) at ${endpoint}:`, errorInfo);

      const errorMessage = data?.message || `Zillow API returned status ${status}`;
      const apiError = new Error(errorMessage);
      apiError.statusCode = status;
      apiError.apiError = data;
      throw apiError;
    } else if (error.request) {
      // Request made but no response received
      console.error(`[ZillowService] No response from API at ${endpoint}:`, errorInfo);
      
      const apiError = new Error('No response from Zillow API');
      apiError.statusCode = 503;
      throw apiError;
    } else {
      // Error in request setup
      console.error(`[ZillowService] Request error at ${endpoint}:`, {
        ...errorInfo,
        message: error.message
      });

      const apiError = new Error(`Request error: ${error.message}`);
      apiError.statusCode = 500;
      throw apiError;
    }
  }
}

module.exports = new ZillowService();
