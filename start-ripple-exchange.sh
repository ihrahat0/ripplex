#!/bin/bash

# Start Ripple Exchange Server and Frontend
# This script starts the Node.js server and serves the frontend

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Ripple Exchange...${NC}"

# Check if the build directory exists
if [ ! -d "build" ]; then
  echo -e "${YELLOW}Build directory not found. Building the frontend...${NC}"
  
  # Set environment variables for production
  export REACT_APP_API_URL=https://rippleexchange.org
  export PUBLIC_URL=https://rippleexchange.org
  export REACT_APP_BASE_URL=https://rippleexchange.org
  export NODE_ENV=production
  
  # Build the frontend
  npm run build
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build the frontend. Exiting.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Frontend built successfully.${NC}"
else
  echo -e "${GREEN}Using existing build directory.${NC}"
fi

# Check if the server.js file exists
if [ ! -f "server.js" ]; then
  echo -e "${RED}server.js not found. Exiting.${NC}"
  exit 1
fi

# Set environment variables for the server
export NODE_ENV=production
export PORT=3001

# Start the server
echo -e "${GREEN}Starting the server on port 3001...${NC}"
node server.js

# Note: This script will keep running until the server is stopped
# To stop the server, press Ctrl+C 