/**
 * Express server initialization
 * Sets up the main application with middleware and routes
 */

const express = require('express');
const config = require('./config');
const logger = require('./middleware/logger');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { corsMiddleware } = require('./middleware/cors');
const propertiesRouter = require('./routes/properties');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);
app.use(logger);
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount routes
app.use('/api/properties', propertiesRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const port = config.server.port;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port} in ${config.server.nodeEnv} mode`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
