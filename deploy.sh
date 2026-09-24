#!/bin/bash
set -e


echo "🔨 Building frontend..."
cd /root/portal-do-artista/artifacts/alan-ribeiro-catalog
PORT=3000 BASE_PATH=/ pnpm run build

echo "🔨 Building Portal Play mobile (PWA)..."
cd /root/portal-do-artista/artifacts/player-app-mobile
npm run build

echo "📦 Deploying to /var/www/portal-do-artista..."
# Preserve uploads directory during deploy
if [ -d /var/www/portal-do-artista/uploads ]; then
  cp -r /var/www/portal-do-artista/uploads /tmp/portal-uploads-backup
fi
rm -rf /var/www/portal-do-artista
cp -r /root/portal-do-artista/artifacts/alan-ribeiro-catalog/dist/public /var/www/portal-do-artista
# Portal Play PWA em /play-app (build do player-app-mobile com base './')
mkdir -p /var/www/portal-do-artista/play-app
cp -r /root/portal-do-artista/artifacts/player-app-mobile/dist/* /var/www/portal-do-artista/play-app/
# Restore uploads
if [ -d /tmp/portal-uploads-backup ]; then
  mkdir -p /var/www/portal-do-artista/uploads
  cp -r /tmp/portal-uploads-backup/* /var/www/portal-do-artista/uploads/
  rm -rf /tmp/portal-uploads-backup
fi
chown -R www-data:www-data /var/www/portal-do-artista
chmod -R 755 /var/www/portal-do-artista

echo "🔄 Reloading Nginx..."
nginx -t && systemctl reload nginx

echo "✅ Deploy complete!"
echo "   https://2.24.205.194"
echo ""
echo "Rotas:"
echo "  /         → Home (Portal)"
echo "  /artistas → Lista de artistas"
echo "  /artista/:id → Perfil do artista"
echo "  /admin    → Painel admin"
echo "  /play     → Portal Play (web)"
echo "  /play-app → Portal Play mobile (PWA)"
