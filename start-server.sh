#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v ^# | xargs)
fi

# Start server with nodemon for auto-restart
nodemon server.js
