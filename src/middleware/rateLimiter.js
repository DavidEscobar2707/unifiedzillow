/**
 * Rate limiting middleware
 * Limits requests per IP address to prevent API quota exhaustion
 * Returns 429 status code when limit is exceeded
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');

// Create rate limiter instance with configuration from environment
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  
  // Use IP address as the key for rate limiting
  keyGenerator: (req, res) => {
    return req.ip || req.connection.remoteAddress;
  },

  // Custom handler for when rate limit is exceeded
  handler: (req, res, options) => {
    const requestId = req.id || 'unknown';
    const timestamp = new Date().toISOString();
    const clientIp = req.ip || req.connection.remoteAddress;

    // Log rate limit violation
    console.warn(`[${timestamp}] [${requestId}] Rate limit exceeded for IP: ${clientIp}`);

    // Return 429 response with retry-after header
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        statusCode: 429,
        timestamp: timestamp,
        requestId: requestId
      }
    });
  },

  // Skip rate limiting for health check endpoint
  skip: (req, res) => {
    return req.path === '/health';
  },

  // Store configuration for in-memory store
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false    // Disable `X-RateLimit-*` headers
});

module.exports = rateLimiter;
