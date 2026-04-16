#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24 > /dev/null 2>&1
cd /root/Portal-do-Artista/artifacts/alan-ribeiro-catalog
exec npx vite --config vite.config.ts --host 0.0.0.0 --port 3000
