/**
 * Rate Limiting Configuration
 * Adjust these values based on your OpenAI plan
 */

module.exports = {
  // Visual analysis rate limits
  visualAnalysis: {
    enabled: false,           // DISABLED: OpenAI rate limit exceeded - enable after 1 hour or upgrade plan
    concurrencyLimit: 1,      // Process 1 property at a time
    delayBetweenBatches: 5000 // Wait 5 seconds between each property
  }
};
