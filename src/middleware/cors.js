/**
 * CORS Middleware
 * Configures Cross-Origin Resource Sharing for the API
 */

/**
 * CORS middleware configuration
 * Allows requests from any origin with proper headers
 */
function corsMiddleware(req, res, next) {
  // Allow requests from any origin
  res.header('Access-Control-Allow-Origin', '*');

  // Allow specific HTTP methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');

  // Allow specific headers
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key'
  );

  // Allow credentials if needed
  res.header('Access-Control-Allow-Credentials', 'true');

  // Cache preflight requests for 24 hours
  res.header('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}

/**
 * CORS middleware with specific origin whitelist
 * Use this if you want to restrict to specific origins
 * @param {array} allowedOrigins - Array of allowed origins
 */
function corsMiddlewareWithWhitelist(allowedOrigins = []) {
  return (req, res, next) => {
    const origin = req.headers.origin;

    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key'
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  };
}

module.exports = {
  corsMiddleware,
  corsMiddlewareWithWhitelist
};
