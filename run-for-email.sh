#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Ripple Exchange with Email Support${NC}"

# Store the process ID of this script
SCRIPT_PID=$$

# Function to clean up when the script is terminated
cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  
  # Kill the API server if it's running
  if [ ! -z "$API_PID" ]; then
    echo -e "Stopping API server (PID: $API_PID)"
    kill -9 $API_PID 2>/dev/null
  fi
  
  # Kill any process on port 3001 (API server)
  PORT_3001_PID=$(lsof -ti:3001)
  if [ ! -z "$PORT_3001_PID" ]; then
    echo -e "Stopping process on port 3001 (PID: $PORT_3001_PID)"
    kill -9 $PORT_3001_PID 2>/dev/null
  fi
  
  echo -e "${GREEN}All services stopped. Goodbye!${NC}"
  exit 0
}

# Set up the cleanup function to run on script termination
trap cleanup EXIT INT TERM

# Check if port 3001 is already in use
PORT_CHECK=$(lsof -ti:3001)
if [ ! -z "$PORT_CHECK" ]; then
  echo -e "${YELLOW}Port 3001 is already in use. Stopping existing process...${NC}"
  kill -9 $PORT_CHECK
  sleep 2
fi

# Start the API server
echo -e "${GREEN}Starting API server on port 3001...${NC}"
node server.js > server.log 2>&1 &
API_PID=$!

# Wait a moment for the server to start
echo -e "${YELLOW}Waiting for API server to start...${NC}"
sleep 3

# Check if the API server started successfully
if curl -s http://localhost:3001/api/health-check > /dev/null; then
  echo -e "${GREEN}API server started successfully on port 3001${NC}"
  echo -e "${GREEN}API server PID: $API_PID${NC}"
else
  echo -e "${RED}API server failed to start properly. Check server.log for details.${NC}"
  echo -e "${YELLOW}Most recent server log entries:${NC}"
  tail -n 20 server.log
  echo
  echo -e "${YELLOW}Do you want to continue anyway? (y/n)${NC}"
  read answer
  if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo -e "${RED}Aborting...${NC}"
    exit 1
  fi
fi

# Start the React development server on port 3000
echo -e "${GREEN}Starting React development server on port 3000...${NC}"
echo -e "${YELLOW}Press Ctrl+C when you're finished to stop all services${NC}"
PORT=3000 npm start

# This point will only be reached if npm start exits on its own
echo -e "${YELLOW}React development server has stopped.${NC}"
cleanup 