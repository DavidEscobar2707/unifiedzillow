/**
 * Error handling middleware
 * Catches all errors and returns standardized error responses
 */

const errorHandler = (err, req, res, next) => {
  const requestId = req.id || 'unknown';
  const timestamp = new Date().toISOString();

  // Log the error
  console.error(`[${timestamp}] [${requestId}] Error:`, {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Determine error code
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  // Build error response
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'An unexpected error occurred',
      statusCode: statusCode,
      timestamp: timestamp,
      requestId: requestId
    }
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
