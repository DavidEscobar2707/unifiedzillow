const NodeCache = require('node-cache');
const config = require('../config');

/**
 * Cache Service
 * Manages in-memory caching of API responses with configurable TTL
 */
class CacheService {
  constructor() {
    // Initialize node-cache with default TTL from config
    this.cache = new NodeCache({ stdTTL: config.cache.ttl });
    
    console.log(`[CacheService] Initialized with TTL: ${config.cache.ttl}s`);
  }

  /**
   * Generate a consistent cache key from parameters
   * @param {string} prefix - Cache key prefix (e.g., 'search', 'property', 'estimate')
   * @param {object} params - Parameters to include in key
   * @returns {string} Generated cache key
   */
  generateKey(prefix, params = {}) {
    // Sort params to ensure consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('|');

    const key = sortedParams ? `${prefix}:${sortedParams}` : prefix;
    
    console.log(`[CacheService] Generated cache key: ${key}`);
    return key;
  }

  /**
   * Retrieve a value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined if not found or expired
   */
  get(key) {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      console.log(`[CacheService] Cache HIT for key: ${key}`);
      return value;
    }

    console.log(`[CacheService] Cache MISS for key: ${key}`);
    return undefined;
  }

  /**
   * Store a value in cache with optional custom TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Optional custom TTL in seconds (uses default if not provided)
   * @returns {boolean} True if set successfully
   */
  set(key, value, ttl = null) {
    try {
      if (ttl !== null) {
        this.cache.set(key, value, ttl);
        console.log(`[CacheService] Cached key: ${key} with custom TTL: ${ttl}s`);
      } else {
        this.cache.set(key, value);
        console.log(`[CacheService] Cached key: ${key} with default TTL`);
      }
      return true;
    } catch (error) {
      console.error(`[CacheService] Error setting cache for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Remove a specific cache entry
   * @param {string} key - Cache key to invalidate
   * @returns {number} Number of keys deleted (0 or 1)
   */
  invalidate(key) {
    const deleted = this.cache.del(key);
    
    if (deleted > 0) {
      console.log(`[CacheService] Invalidated cache key: ${key}`);
    } else {
      console.log(`[CacheService] Cache key not found for invalidation: ${key}`);
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   * @returns {number} Number of keys deleted
   */
  clear() {
    const keys = this.cache.keys();
    const count = keys.length;
    
    this.cache.flushAll();
    
    console.log(`[CacheService] Cleared all cache entries (${count} keys removed)`);
    return count;
  }

  /**
   * Check if a cache key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    const keys = this.cache.keys();
    return {
      keyCount: keys.length,
      keys,
      stats: this.cache.getStats()
    };
  }
}

module.exports = new CacheService();
