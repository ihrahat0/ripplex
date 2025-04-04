#!/bin/bash

# Stop on errors
set -e

echo "Starting production deployment process..."

# Ensure we have the build-production.sh script
if [ ! -f build-production.sh ]; then
  echo "Error: build-production.sh script not found!"
  exit 1
fi

# Step 1: Build the production version
echo "Building production version..."
./build-production.sh

# Step 2: Set up SSH connection variables
SSH_USER="your-ssh-user"
SSH_HOST="rippleexchange.org"
REMOTE_FRONTEND_DIR="/var/www/rippleexchange.org/build"
REMOTE_BACKEND_DIR="/var/www/rippleexchange.org/server"

# Step 3: Deploy frontend to server
echo "Deploying frontend to $SSH_HOST..."
ssh $SSH_USER@$SSH_HOST "mkdir -p $REMOTE_FRONTEND_DIR"
rsync -avz --delete build/ $SSH_USER@$SSH_HOST:$REMOTE_FRONTEND_DIR/

# Step 4: Deploy backend to server
echo "Deploying backend to $SSH_HOST..."
ssh $SSH_USER@$SSH_HOST "mkdir -p $REMOTE_BACKEND_DIR"
rsync -avz --delete server-build/ $SSH_USER@$SSH_HOST:$REMOTE_BACKEND_DIR/

# Step 5: Set up Nginx if nginx.conf exists
if [ -f nginx.conf ]; then
  echo "Setting up Nginx configuration..."
  scp nginx.conf $SSH_USER@$SSH_HOST:/tmp/rippleexchange-nginx.conf
  ssh $SSH_USER@$SSH_HOST "sudo mv /tmp/rippleexchange-nginx.conf /etc/nginx/sites-available/rippleexchange.org.conf && \
    sudo ln -sf /etc/nginx/sites-available/rippleexchange.org.conf /etc/nginx/sites-enabled/ && \
    sudo nginx -t && sudo systemctl reload nginx"
fi

# Step 6: Restart the Node.js application
echo "Restarting the application..."
ssh $SSH_USER@$SSH_HOST "cd $REMOTE_BACKEND_DIR && npm install --production && \
  pm2 delete rippleexchange 2>/dev/null || true && \
  pm2 start server.js --name rippleexchange"

echo "Deployment completed successfully!"
echo "Your application should now be running at https://rippleexchange.org"
echo ""
echo "IMPORTANT: Make sure to edit this script with your actual SSH credentials before using it." 