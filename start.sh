#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24 > /dev/null 2>&1

cd /root/Portal-do-Artista

echo "Starting API server on port 3001..."
export API_PORT=3001
export FRONTEND_PORT=3000
export BASE_PATH=/

cd /root/Portal-do-Artista/artifacts/api-server
PORT=3001 pnpm run dev > /tmp/api-server.log 2>&1 &
API_PID=$!

cd /root/Portal-do-Artista/artifacts/alan-ribeiro-catalog
PORT=3000 BASE_PATH=/ pnpm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

cd /root/Portal-do-Artista

echo "API server PID: $API_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Services running."

wait $API_PID $FRONTEND_PID
