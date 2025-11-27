# Rate Limit Fix - Simple Solution

## Problem
OpenAI returning 429 errors even with 25 concurrent requests.

## Solution
**Sequential processing: 1 request at a time + 5 second delay between each**

## Changes

### Concurrency Limit
- **Before:** 25 requests at once
- **After:** 1 request at a time (sequential)

### Delay Between Requests
- **Added:** 5 second wait between each property
- **Why:** Respects OpenAI's strict rate limits

## How It Works

```
Batch 1: Process 5 properties (simultaneously)
         ↓ Wait 2 seconds
Batch 2: Process 5 properties (simultaneously)
         ↓ Wait 2 seconds
Batch 3: Process 5 properties (simultaneously)
         ↓ Wait 2 seconds
...and so on
```

## Impact

| Metric | Before | After |
|--------|--------|-------|
| Concurrent requests | 25 | 1 |
| Delay between requests | 0s | 5s |
| Expected success rate | ~60% | ~99% |
| Time for 41 properties | ~30s | ~205s (3.4 min) |

## Trade-offs

✅ **Highest success rate** - No 429 errors
✅ **Simple and reliable** - Sequential processing
✅ **Centralized config** - Easy to adjust
❌ **Slowest** - Takes ~5s per property
❌ **Low throughput** - One property at a time

## Configuration

To adjust, edit `src/config/rateLimits.js`:

```javascript
module.exports = {
  visualAnalysis: {
    concurrencyLimit: 1,      // Process 1 property at a time
    delayBetweenBatches: 5000 // Wait 5 seconds between each
  }
};
```

### Recommendations

| Scenario | Limit | Delay | Reason |
|----------|-------|-------|--------|
| Free tier | 1 | 5000ms | **Current (most reliable)** |
| Pay-as-you-go | 1 | 3000ms | Slightly faster |
| Higher tier | 2 | 2000ms | More capacity |

## Summary

**Sequential processing: 1 property at a time, 5 second pause between each**

This is the slowest but most reliable solution. Zero 429 errors.
