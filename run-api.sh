#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24 > /dev/null 2>&1
cd /root/portal-do-artista/artifacts/api-server
exec npx tsx ./src/index.ts
