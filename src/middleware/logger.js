/**
 * Request logging middleware
 * Logs incoming requests and outgoing responses with timestamps and status codes
 */

const logger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Attach request ID to request object for use in other middleware/handlers
  req.id = requestId;

  // Log incoming request
  console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.path}`);

  // Capture the original res.end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );

    // Call the original end function
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = logger;
