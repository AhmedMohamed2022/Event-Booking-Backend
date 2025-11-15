# CORS Setup Guide for Production

## Environment Variables

Make sure to set these environment variables in your production environment (Replit):

```bash
NODE_ENV=production
CORS_ORIGIN=https://monasabatcm.netlify.app
```

## URL Structure

Your frontend should call the backend with the correct URL structure:

**❌ Incorrect (causing CORS error):**

```
https://your-backend-url//auth/send-otp
```

**✅ Correct:**

```
https://your-backend-url/api/auth/send-otp
```

## Testing CORS

After deployment, test the CORS configuration by visiting:

```
https://your-backend-url/api/cors-test
```

This will show you the current CORS configuration and help debug any issues.

## Common Issues

1. **Double slashes in URL**: Make sure your frontend is calling `/api/auth/send-otp` not `//auth/send-otp`
2. **Missing CORS_ORIGIN**: Set the environment variable to your frontend domain
3. **Wrong NODE_ENV**: Ensure NODE_ENV is set to "production"

## Frontend Configuration

Make sure your frontend API calls include the `/api` prefix:

```javascript
// Example API call
const response = await fetch("https://your-backend-url/api/auth/send-otp", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(data),
});
```
