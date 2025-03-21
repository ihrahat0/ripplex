# Production Deployment Guide for Ripple Exchange

This guide explains how to properly deploy the Ripple Exchange application to production.

## Issues Fixed

1. **API Routing Issues**: 
   - Fixed duplicate `/api` path in URLs that was causing 502 errors
   - Properly configured the server to handle API requests with consistent paths

2. **Environment Configuration**:
   - Created a proper `.env.production` file with correct URLs
   - Ensured React app uses the correct API base URL in production

3. **Nginx Configuration**:
   - Updated to correctly proxy API requests to the Node.js server
   - Added proper MIME type handling for CSS and other assets
   - Added caching and performance optimizations

## Deployment Steps

### 1. Prepare for Deployment

```bash
# Make sure you have the latest code
git pull

# Install dependencies
npm install --legacy-peer-deps

# Fix API routes in server.js
node fix-api-routes.js
```

### 2. Build for Production

```bash
# Build with production settings
REACT_APP_API_URL=https://rippleexchange.org \
PUBLIC_URL=https://rippleexchange.org \
REACT_APP_BASE_URL=https://rippleexchange.org \
NODE_ENV=production \
npm run build
```

### 3. Deploy to Server

```bash
# Copy frontend build to server
rsync -avz --delete build/ user@rippleexchange.org:/var/www/rippleexchange.org/build/

# Copy server files
rsync -avz server.js package.json .env.production user@rippleexchange.org:/var/www/rippleexchange.org/server/
```

### 4. Set Up Nginx

Copy the `nginx.conf` file to your server and set it up:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/rippleexchange.org.conf
sudo ln -sf /etc/nginx/sites-available/rippleexchange.org.conf /etc/nginx/sites-enabled/
sudo nginx -t  # Test the configuration
sudo systemctl reload nginx
```

### 5. Start the Node.js Server

```bash
cd /var/www/rippleexchange.org/server
npm install --production
pm2 delete rippleexchange || true
NODE_ENV=production pm2 start server.js --name rippleexchange
```

## Monitoring and Maintenance

- Check server logs: `pm2 logs rippleexchange`
- Monitor Nginx logs: `tail -f /var/log/nginx/rippleexchange.error.log`
- Restart server: `pm2 restart rippleexchange`

## Troubleshooting

If you encounter 502 Bad Gateway errors:
1. Check if the Node.js server is running: `pm2 status`
2. Verify Nginx is running: `systemctl status nginx`
3. Check for errors in the logs: `pm2 logs` and `/var/log/nginx/error.log`
4. Ensure port 3001 is available and not blocked by a firewall

## Important Configuration

- The frontend at `https://rippleexchange.org` makes API requests to `https://rippleexchange.org/api/`
- Nginx proxies `/api/*` requests to the Node.js server running on port 3001
- API routes in server.js now use `apiRouter` instead of `app` to handle requests

---

For any issues or questions, refer to the documentation or contact the development team. 