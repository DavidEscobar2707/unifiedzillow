require('dotenv').config();

const requiredEnvVars = [
  'RAPIDAPI_KEY',
  'RAPIDAPI_HOST'
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file or set these variables in your environment.');
  process.exit(1);
}

module.exports = {
  // API Configuration
  api: {
    key: process.env.RAPIDAPI_KEY,
    host: process.env.RAPIDAPI_HOST
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 3600
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  // Visual Inspector Configuration
  visualInspector: {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL || 'llama-2-90b-vision-preview'
  }
};
