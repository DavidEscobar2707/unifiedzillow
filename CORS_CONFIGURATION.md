# CORS Configuration Guide

## Overview

CORS (Cross-Origin Resource Sharing) has been configured on the Zillow API backend to allow your frontend to access the API from any domain.

**Base URL:** `https://web-production-13c17.up.railway.app`

---

## Current Configuration

### Allowed Origins
- ✅ **All origins** (`*`)
- Requests from any domain are accepted

### Allowed Methods
- ✅ GET
- ✅ POST
- ✅ PUT
- ✅ DELETE
- ✅ OPTIONS
- ✅ PATCH

### Allowed Headers
- ✅ Origin
- ✅ X-Requested-With
- ✅ Content-Type
- ✅ Accept
- ✅ Authorization
- ✅ X-API-Key

### Credentials
- ✅ Allowed (if needed)

### Preflight Cache
- ✅ 24 hours (86400 seconds)

---

## How It Works

### Preflight Request (OPTIONS)
When your frontend makes a cross-origin request, the browser first sends an OPTIONS request to check if the request is allowed.

```
Browser sends OPTIONS request
    ↓
Server responds with CORS headers
    ↓
Browser checks if request is allowed
    ↓
If allowed, browser sends actual request
```

### CORS Headers Sent by Server

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

---

## Frontend Usage

### JavaScript Fetch
```javascript
// Simple GET request
const response = await fetch(
  'https://web-production-13c17.up.railway.app/api/properties/search?location=Austin,TX',
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
console.log(data);
```

### POST Request
```javascript
const response = await fetch(
  'https://web-production-13c17.up.railway.app/api/properties/batch-leads',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      location: 'Austin, TX',
      leadType: 'BackyardBoost',
      requestedLeads: 25
    })
  }
);

const data = await response.json();
console.log(data);
```

### React Example
```javascript
import React, { useState } from 'react';

function MyComponent() {
  const [data, setData] = useState(null);

  const fetchData = async () => {
    try {
      const response = await fetch(
        'https://web-production-13c17.up.railway.app/api/properties/search?location=Austin,TX'
      );
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <button onClick={fetchData}>Fetch Data</button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

export default MyComponent;
```

### Vue.js Example
```javascript
export default {
  data() {
    return {
      data: null
    };
  },
  methods: {
    async fetchData() {
      try {
        const response = await fetch(
          'https://web-production-13c17.up.railway.app/api/properties/search?location=Austin,TX'
        );
        this.data = await response.json();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  }
};
```

### Axios Example
```javascript
import axios from 'axios';

const API_BASE = 'https://web-production-13c17.up.railway.app';

// GET request
axios.get(`${API_BASE}/api/properties/search?location=Austin,TX`)
  .then(response => console.log(response.data))
  .catch(error => console.error(error));

// POST request
axios.post(`${API_BASE}/api/properties/batch-leads`, {
  location: 'Austin, TX',
  leadType: 'BackyardBoost',
  requestedLeads: 25
})
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

---

## Common CORS Issues and Solutions

### Issue 1: "No 'Access-Control-Allow-Origin' header"

**Problem:**
```
Access to XMLHttpRequest at 'https://web-production-13c17.up.railway.app/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
- ✅ CORS is already configured on the server
- Make sure you're using the correct base URL
- Check that your request headers are correct

### Issue 2: Preflight Request Fails

**Problem:**
```
OPTIONS request returns 404 or 500
```

**Solution:**
- ✅ The server now handles OPTIONS requests
- Make sure you're sending the correct headers
- Check the browser console for details

### Issue 3: Credentials Not Sent

**Problem:**
```
Cookies or authorization headers not being sent
```

**Solution:**
```javascript
// Add credentials to fetch request
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include credentials
  body: JSON.stringify(data)
});
```

### Issue 4: Custom Headers Blocked

**Problem:**
```
Custom header 'X-Custom-Header' is not allowed
```

**Solution:**
- ✅ Common headers are already allowed
- If you need custom headers, add them to the CORS configuration
- Contact support if you need additional headers

---

## Testing CORS

### Test with cURL
```bash
# Simple GET request
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://web-production-13c17.up.railway.app/api/properties/search

# Actual GET request
curl https://web-production-13c17.up.railway.app/api/properties/search?location=Austin,TX
```

### Test with Browser DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Make a request to the API
4. Check the response headers for CORS headers

### Test with Postman
1. Open Postman
2. Create a new request
3. Set URL to `https://web-production-13c17.up.railway.app/api/properties/search?location=Austin,TX`
4. Send the request
5. Check the response headers

---

## Advanced Configuration

### Restrict to Specific Origins

If you want to restrict CORS to specific origins, modify `src/middleware/cors.js`:

```javascript
const { corsMiddlewareWithWhitelist } = require('./middleware/cors');

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://yourdomain.com',
  'https://www.yourdomain.com'
];

app.use(corsMiddlewareWithWhitelist(allowedOrigins));
```

### Add Custom Headers

To allow additional custom headers, modify `src/middleware/cors.js`:

```javascript
res.header(
  'Access-Control-Allow-Headers',
  'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Custom-Header'
);
```

### Modify Preflight Cache

To change the preflight cache duration:

```javascript
res.header('Access-Control-Max-Age', '3600'); // 1 hour instead of 24 hours
```

---

## Security Considerations

### Current Setup
- ✅ Allows all origins (suitable for public APIs)
- ✅ Allows common HTTP methods
- ✅ Allows standard headers
- ✅ Credentials are allowed

### For Production
Consider:
1. **Restrict origins** if you have a specific frontend domain
2. **Use HTTPS** (already configured on Railway)
3. **Implement rate limiting** (already configured)
4. **Validate input** (already implemented)
5. **Use authentication** if needed

---

## Troubleshooting Checklist

- ✅ CORS middleware is installed
- ✅ CORS middleware is applied before routes
- ✅ Server responds to OPTIONS requests
- ✅ Response includes CORS headers
- ✅ Frontend uses correct base URL
- ✅ Frontend sends correct headers
- ✅ Browser allows the request

---

## Files Modified

- ✅ `src/middleware/cors.js` - New CORS middleware
- ✅ `src/server.js` - Added CORS middleware

---

## Testing Your Frontend

### Step 1: Test with cURL
```bash
curl https://web-production-13c17.up.railway.app/health
```

### Step 2: Test with Browser
```javascript
fetch('https://web-production-13c17.up.railway.app/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

### Step 3: Test with Your Framework
- React: Use the example above
- Vue.js: Use the example above
- Angular: Use HttpClient
- Next.js: Use fetch or axios

---

## Support

If you encounter CORS issues:

1. **Check the error message** - It usually tells you what's wrong
2. **Check browser console** - Look for CORS-related errors
3. **Check response headers** - Use DevTools Network tab
4. **Test with cURL** - Isolate the issue
5. **Review this guide** - Most issues are covered above

---

## Quick Reference

| Issue | Solution |
|-------|----------|
| CORS blocked | ✅ Already configured |
| OPTIONS fails | ✅ Server handles it |
| Headers blocked | ✅ Common headers allowed |
| Credentials not sent | Add `credentials: 'include'` |
| Custom headers | Modify CORS middleware |
| Specific origins only | Use whitelist configuration |

---

## Next Steps

1. ✅ CORS is configured
2. Test your frontend with the API
3. If issues arise, check this guide
4. Deploy your frontend

---

**CORS Configuration Status:** ✅ Complete and Ready

