#!/bin/bash
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24 > /dev/null 2>&1

echo "🔨 Building frontend..."
cd /root/Portal-do-Artista/artifacts/alan-ribeiro-catalog
PORT=3000 BASE_PATH=/ pnpm run build

echo "📦 Deploying to /var/www/portal-do-artista..."
rm -rf /var/www/portal-do-artista
cp -r dist/public /var/www/portal-do-artista
chown -R www-data:www-data /var/www/portal-do-artista
chmod -R 755 /var/www/portal-do-artista

echo "🔄 Reloading Nginx..."
nginx -t && systemctl reload nginx

echo "✅ Deploy complete!"
echo "   https://94.141.97.95"
echo ""
echo "Rotas:"
echo "  /         → Home (Portal)"
echo "  /artistas → Lista de artistas"
echo "  /artista/:id → Perfil do artista"
echo "  /admin    → Painel admin"
echo "  /vip      → Área VIP"
