#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Ripple Exchange API server...${NC}"

# Check if port 3001 is in use and kill the process if needed
PORT_CHECK=$(lsof -ti:3001)
if [ ! -z "$PORT_CHECK" ]; then
  echo -e "${YELLOW}Port 3001 is already in use. Stopping existing process...${NC}"
  kill -9 $PORT_CHECK
  sleep 1
fi

# Start the server in the background
echo -e "${GREEN}Starting API server on port 3001...${NC}"
node server.js 