#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Ripple Exchange development environment with email support...${NC}"

# Check if port 3001 is in use and kill the process if needed
PORT_CHECK=$(lsof -ti:3001)
if [ ! -z "$PORT_CHECK" ]; then
  echo -e "${YELLOW}Port 3001 is already in use. Stopping existing process...${NC}"
  kill -9 $PORT_CHECK
  sleep 1
fi

# Start the server in the background
echo -e "${GREEN}Starting API server on port 3001...${NC}"
nohup node server.js > server.log 2>&1 &
SERVER_PID=$!

# Give the server a moment to start
sleep 2

# Check if the server started successfully
if curl -s http://localhost:3001/api/health-check > /dev/null; then
  echo -e "${GREEN}API server started successfully on port 3001${NC}"
else
  echo -e "${YELLOW}API server may not have started correctly. Check server.log for details.${NC}"
  tail -n 20 server.log
fi

# Start the React development server
echo -e "${GREEN}Starting React development server...${NC}"
echo -e "${YELLOW}Note: When you're done, press Ctrl+C to stop the React server, then run './stop-dev.sh' to stop the API server${NC}"
npm start

# This part will only execute when npm start is terminated
echo -e "${YELLOW}React development server has been stopped.${NC}"
echo -e "${YELLOW}API server is still running in the background (PID: $SERVER_PID).${NC}"
echo -e "${YELLOW}Run './stop-dev.sh' to stop the API server.${NC}"

# Create a stop script
cat > stop-dev.sh << EOL
#!/bin/bash
echo "Stopping API server..."
kill -9 $SERVER_PID
lsof -ti:3001 | xargs kill -9 2>/dev/null
echo "API server stopped."
EOL

chmod +x stop-dev.sh 