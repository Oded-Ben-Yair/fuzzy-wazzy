#!/usr/bin/env bash
set -euo pipefail

# Kill any process on port 5002
echo "Checking for processes on port 5002..."
lsof -ti:5002 2>/dev/null | xargs -r kill -9 2>/dev/null || true
pkill -f "node src/index.js" 2>/dev/null || true

# Start the server in background
echo "Starting Fuzzy Wazzy server..."
nohup npm start >/tmp/fuzzy-wazzy.log 2>&1 &
echo "Server starting with PID: $!"

# Wait for server to be ready
echo "Waiting for server to be ready..."
sleep 2

# Check health endpoint
echo "Checking health endpoint..."
curl -s http://localhost:5002/health | jq . 2>/dev/null || curl -s http://localhost:5002/health

echo ""
echo "Server is running on http://localhost:5002"
echo "Logs are available at: /tmp/fuzzy-wazzy.log"
echo "Demo page: http://localhost:5002/docs/demo.html"