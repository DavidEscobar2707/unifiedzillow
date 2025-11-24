# Railway Deployment Guide

## Prerequisites

- Railway account (https://railway.app)
- GitHub account with this repository
- API Keys:
  - RapidAPI Key (for Zillow API)
  - Google Maps API Key
  - OpenAI API Key

## Step-by-Step Deployment

### 1. Connect GitHub Repository

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize Railway to access your GitHub account
5. Select this repository (`zillow-api-backend`)
6. Click "Deploy"

### 2. Configure Environment Variables

Once the project is created in Railway:

1. Go to your project dashboard
2. Click on the service (should be named after your repo)
3. Go to the "Variables" tab
4. Add the following environment variables:

```
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=zillow56.p.rapidapi.com
PORT=3000
NODE_ENV=production
CACHE_TTL=3600
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o
```

### 3. Monitor Deployment

1. Go to the "Deployments" tab
2. Watch the build and deployment logs
3. Once deployment is complete, you'll see a green checkmark
4. Your service URL will be displayed (e.g., `https://your-service.railway.app`)

### 4. Test Your Deployment

Once deployed, test the health endpoint:

```bash
curl https://your-service.railway.app/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2025-11-21T22:30:00.000Z",
  "uptime": 123.456
}
```

## Obtaining API Keys

### RapidAPI Key (Zillow)

1. Go to [RapidAPI](https://rapidapi.com)
2. Sign up or log in
3. Search for "Zillow"
4. Subscribe to the Zillow API
5. Copy your API Key from the dashboard

### Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable "Maps Static API"
4. Create an API key (Credentials > Create Credentials > API Key)
5. Copy the API key

### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (save it securely)

## Troubleshooting

### Build Fails

1. Check the build logs in Railway dashboard
2. Ensure all environment variables are set
3. Verify Node.js version compatibility (16+)

### Service Not Starting

1. Check the deployment logs
2. Verify all required environment variables are present
3. Check that PORT is not hardcoded (should use `process.env.PORT`)

### API Errors

1. Verify API keys are correct and have sufficient quota
2. Check rate limiting isn't being triggered
3. Review logs in Railway dashboard

## Monitoring

### View Logs

1. Go to your service in Railway
2. Click "Logs" tab
3. View real-time logs

### Set Up Alerts

1. Go to project settings
2. Configure alerts for deployment failures
3. Set up email notifications

## Scaling

### Increase Resources

1. Go to your service settings
2. Adjust CPU and Memory allocation
3. Changes take effect on next deployment

### Auto-Scaling

Railway automatically handles scaling based on demand.

## Updating Your Service

### Deploy Updates

1. Push changes to your GitHub repository
2. Railway automatically detects changes
3. New deployment starts automatically
4. Old deployment is replaced once new one is healthy

### Rollback

1. Go to "Deployments" tab
2. Find the previous deployment
3. Click "Redeploy" to rollback

## Cost Considerations

- Railway offers a free tier with limited resources
- Monitor your usage in the Railway dashboard
- Paid plans available for production workloads

## Support

- Railway Documentation: https://docs.railway.app
- Railway Community: https://discord.gg/railway
- GitHub Issues: Create an issue in this repository

## Next Steps

After deployment:

1. Test all API endpoints
2. Monitor logs for errors
3. Set up monitoring and alerts
4. Configure custom domain (optional)
5. Set up CI/CD pipeline (optional)
