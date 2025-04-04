#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Ripple Exchange deployment with PM2...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo -e "${RED}PM2 is not installed. Installing PM2 globally...${NC}"
  sudo npm install -g pm2 --legacy-peer-deps
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install PM2. Exiting.${NC}"
    exit 1
  fi
fi

# Install serve package for serving the frontend
echo -e "${YELLOW}Installing serve package...${NC}"
sudo npm install -g serve --legacy-peer-deps
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to install serve package. Exiting.${NC}"
  exit 1
fi

# Stop existing PM2 processes for this app
echo -e "${YELLOW}Stopping existing PM2 processes...${NC}"
pm2 stop ripple-exchange-server 2>/dev/null
pm2 delete ripple-exchange-server 2>/dev/null
pm2 stop ripple-frontend 2>/dev/null
pm2 delete ripple-frontend 2>/dev/null

# Set environment variables for production
export REACT_APP_API_URL=http://localhost:3001
export PUBLIC_URL=/
export NODE_ENV=production
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,https://rippleexchange.org"

# Build the frontend
echo -e "${GREEN}Building the frontend...${NC}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to build the frontend. Exiting.${NC}"
  exit 1
fi

# Copy manifest.json to the build directory
echo -e "${GREEN}Copying manifest.json to build directory...${NC}"
cp public/manifest.json build/

# Start the server using PM2
echo -e "${GREEN}Starting the server with PM2...${NC}"
pm2 start ecosystem.config.js

# Save the PM2 process list
echo -e "${GREEN}Saving PM2 process list...${NC}"
pm2 save

# Set up PM2 to start on system boot
echo -e "${YELLOW}Setting up PM2 to start on system boot...${NC}"
echo -e "${YELLOW}Run the following command as root if needed:${NC}"
echo -e "${YELLOW}sudo pm2 startup${NC}"

# Display status
echo -e "${GREEN}PM2 Status:${NC}"
pm2 status

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Server is running on port 3001${NC}"
echo -e "${GREEN}Frontend is running on port 3000${NC}"
echo -e "${GREEN}To monitor logs: pm2 logs${NC}"
echo -e "${GREEN}To restart: pm2 restart all${NC}"
echo -e "${GREEN}To stop: pm2 stop all${NC}" 