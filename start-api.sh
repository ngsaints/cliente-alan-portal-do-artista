#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24 > /dev/null 2>&1
cd /root/Portal-do-Artista/artifacts/api-server
exec PORT=3001 pnpm run dev
