#!/bin/bash

# Stop on errors
set -e

echo "Starting production build process..."

# Ensure we have the production environment file
if [ ! -f .env.production ]; then
  echo "Error: .env.production file not found!"
  exit 1
fi

# Copy production environment file to .env for the build
echo "Copying production environment file..."
cp .env.production .env

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Build the React app with production settings
echo "Building React application..."
REACT_APP_API_URL=https://rippleexchange.org/api \
PUBLIC_URL=https://rippleexchange.org \
REACT_APP_BASE_URL=https://rippleexchange.org \
NODE_ENV=production \
npm run build

# Make a directory for the server build
mkdir -p server-build

# Copy necessary server files
echo "Preparing server files..."
cp server.js server-build/
cp -r server/ server-build/
cp package.json server-build/
cp .env.production server-build/.env

# Create a start script for the server
echo "#!/bin/bash
NODE_ENV=production node server.js" > server-build/start.sh
chmod +x server-build/start.sh

echo "Production build completed successfully!"
echo "Deploy the 'build' folder for the frontend and 'server-build' for the backend." 