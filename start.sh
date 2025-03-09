#!/bin/bash

# Start Options Visualizer with Alpaca Integration

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Options Visualizer with Alpaca Trading ===${NC}"
echo -e "${YELLOW}Starting servers...${NC}"

# Check if .env file exists for backend
if [ ! -f "./backend/.env" ]; then
  echo -e "${YELLOW}Creating .env file from template...${NC}"
  cp ./backend/.env.example ./backend/.env
  echo -e "${YELLOW}Please update the .env file with your Alpaca API credentials before using trading features.${NC}"
fi

# Start backend server in the background
echo -e "${GREEN}Starting backend server on port 8080...${NC}"
cd backend
python3 -m pip install -r requirements.txt
cd api
# Explicitly set port to 8080
PORT=8080 python3 main.py &
BACKEND_PID=$!
cd ../..

# Wait a moment for backend to initialize
sleep 2

# Start frontend server
echo -e "${GREEN}Starting frontend server...${NC}"
# Use PORT=3001 to avoid conflicts with other React apps
PORT=3001 npm start

# When frontend is stopped, also stop the backend
kill $BACKEND_PID
echo -e "${BLUE}All servers stopped.${NC}"
