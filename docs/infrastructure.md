# Infraestrutura — Setup de Producao e Guia de Migracao

> VPS Ubuntu 24.04 + systemd + Nginx + PostgreSQL

---

## Visao Geral da Arquitetura

```
[Internet] → [Nginx :443/:80] → [Frontend estatico /var/www/portal-do-artista]
                                → [proxy /api/] → [Express :3001] → [PostgreSQL :5432]
```

- **Frontend**: Build estatico servido pelo Nginx
- **API**: Express 5 com tsx (transpilado em runtime)
- **Banco**: PostgreSQL 16 com Drizzle ORM
- **Storage**: Cloudflare R2 (producao) ou local (desenvolvimento)

---

## Servicos systemd

### 1. PostgreSQL

```
Service: postgresql
Status: active + enabled
Port: 5432
```

```bash
systemctl status postgresql
systemctl restart postgresql
```

---

### 2. API Server (Express)

```
Service: portal-artista-api
Status: active + enabled
Port: 3001
```

- **Working dir**: `/root/Portal-do-Artista/artifacts/api-server`
- **ExecStart**: `run-api.sh` (wrapper com NVM -> Node 24)
- **Restart**: always, 5s delay
- **Logs**: `journalctl -u portal-artista-api -f`

**Variaveis de ambiente** (definidas no service ou `.env`):
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://artista:artista123@localhost:5432/portal_do_artista
SESSION_SECRET=<gerado>
```

**Arquivo de service**: `/etc/systemd/system/portal-artista-api.service`

```bash
systemctl status portal-artista-api
systemctl restart portal-artista-api
journalctl -u portal-artista-api -f
```

---

### 3. Nginx (Proxy Reverso + SSL)

```
Service: nginx
Status: active + enabled
Ports: 80 (redirect) -> 443 (SSL)
```

**Configuracao** (`/etc/nginx/sites-available/portal-do-artista`):

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name 94.141.97.95;
    location / { return 301 https://$host$request_uri; }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name 94.141.97.95;

    ssl_certificate /etc/nginx/ssl/portal.crt;
    ssl_certificate_key /etc/nginx/ssl/portal.key;

    # Frontend - static files
    location / {
        root /var/www/portal-do-artista;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API - reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
nginx -t                    # Test config
systemctl reload nginx      # Reload config
systemctl restart nginx     # Full restart
tail -f /var/log/nginx/error.log
```

---

## Frontend (Build Estatico)

O frontend **nao roda como servico**. Ele e compilado e servido como arquivos estaticos pelo Nginx:

```bash
# Build
cd /root/Portal-do-Artista/artifacts/alan-ribeiro-catalog
PORT=3000 BASE_PATH=/ pnpm run build

# Deploy
rm -rf /var/www/portal-do-artista
cp -r dist/public /var/www/portal-do-artista
chown -R www-data:www-data /var/www/portal-do-artista
systemctl reload nginx

# Ou usar o script automatico:
/root/Portal-do-Artista/deploy.sh
```

**Path dos builds**: `/var/www/portal-do-artista/`
- `index.html`
- `assets/index-*.js` (bundle React)
- `assets/index-*.css` (Tailwind + custom)
- `favicon.svg`, `opengraph.jpg`

---

## SSL

### Atual: Self-signed
- **Certificado**: `/etc/nginx/ssl/portal.crt`
- **Key**: `/etc/nginx/ssl/portal.key`
- **Validade**: 10 anos
- **SAN**: IP 94.141.97.95
- **Aviso**: Browser mostra alerta de seguranca

### Para producao real (Let's Encrypt):
```bash
# Quando tiver dominio configurado:
apt install certbot python3-certbot-nginx
certbot --nginx -d seu-dominio.com.br

# Auto-renew
certbot renew --dry-run
```

---

## Guia de Migracao para Nova VPS

### 1. Provisionar nova VPS

```bash
# Ubuntu 24.04 LTS
apt update && apt upgrade -y
apt install -y nginx postgresql postgresql-contrib nodejs npm curl git
```

### 2. Instalar Node.js 24 via NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
nvm alias default 24
```

### 3. Instalar pnpm

```bash
npm install -g pnpm
```

### 4. Configurar PostgreSQL

```bash
sudo -u postgres psql
CREATE DATABASE portal_do_artista;
CREATE USER artista WITH PASSWORD 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON DATABASE portal_do_artista TO artista;
\q
```

### 5. Clonar o repositorio

```bash
cd /root
git clone https://github.com/ngsaints/cliente-alan-portal-do-artista.git Portal-do-Artista
cd Portal-do-Artista
pnpm install
```

### 6. Configurar variaveis de ambiente

```bash
cp .env.example .env
nano .env
```

Preencha:
```
DATABASE_URL=postgresql://artista:sua_senha@localhost:5432/portal_do_artista
SESSION_SECRET=uma-chave-secreta-longa-e-aleatoria
PORT=3001
# Opcional - Cloudflare R2:
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

### 7. Aplicar migrations e seed

```bash
cd /root/Portal-do-Artista
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed
```

Ou rodar SQL manualmente:
```bash
psql -U artista -d portal_do_artista -f migrations/001_new_tables.sql
```

### 8. Build do frontend

```bash
cd /root/Portal-do-Artista/artifacts/alan-ribeiro-catalog
PORT=3000 BASE_PATH=/ pnpm run build
```

### 9. Deploy dos arquivos estaticos

```bash
rm -rf /var/www/portal-do-artista
cp -r dist/public /var/www/portal-do-artista
chown -R www-data:www-data /var/www/portal-do-artista
chmod -R 755 /var/www/portal-do-artista
```

### 10. Configurar systemd para a API

Criar `/etc/systemd/system/portal-artista-api.service`:

```ini
[Unit]
Description=Portal do Artista API
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/Portal-do-Artista/artifacts/api-server
EnvironmentFile=/root/Portal-do-Artista/.env
ExecStart=/root/Portal-do-Artista/run-api.sh
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable portal-artista-api
systemctl start portal-artista-api
systemctl status portal-artista-api
```

### 11. Configurar Nginx

Copiar a configuracao para `/etc/nginx/sites-available/portal-do-artista` e criar symlink:

```bash
ln -s /etc/nginx/sites-available/portal-do-artista /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # remover default se necessario
nginx -t
systemctl restart nginx
```

### 12. SSL (auto-assinado para teste)

```bash
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/portal.key \
  -out /etc/nginx/ssl/portal.crt \
  -subj "/CN=seu-ip-ou-dominio"
systemctl reload nginx
```

### 13. Verificar tudo

```bash
systemctl status postgresql portal-artista-api nginx
curl -sk https://localhost/api/healthz
```

---

## Diretorios Importantes

| Path | Descricao |
|------|-----------|
| `/root/Portal-do-Artista/` | Codigo fonte do projeto |
| `/var/www/portal-do-artista/` | Frontend build (servido pelo Nginx) |
| `/etc/nginx/sites-available/` | Config Nginx |
| `/etc/nginx/ssl/` | Certificados SSL |
| `/var/lib/postgresql/16/main/` | Dados do PostgreSQL |
| `/etc/systemd/system/portal-artista-api.service` | Service da API |

---

## Network

| Servico | Porta Interna | Porta Externa |
|---------|--------------|---------------|
| Frontend (Nginx) | - | 443 (HTTPS) |
| API (Express) | 3001 | Via proxy Nginx `/api/` |
| PostgreSQL | 5432 | localhost only |

---

## Seguranca

### systemd security options:
```ini
NoNewPrivileges=true
PrivateTmp=true
```

### Nginx security headers:
```nginx
add_header X-Frame-Options SAMEORIGIN always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000" always;
```

### Session:
- express-session com memory store (single process)
- Cookie: `httpOnly: true`, `secure: false` (HTTP internal)
- Max age: 24 horas

---

## Comandos Rapidos

```bash
# Status completo
systemctl status postgresql portal-artista-api nginx

# Restart tudo
systemctl restart portal-artista-api nginx

# Ver logs da API
journalctl -u portal-artista-api -f --no-pager

# Deploy novo frontend
/root/Portal-do-Artista/deploy.sh

# Testar endpoints
curl -sk https://localhost/api/healthz
curl -sk -o /dev/null -w "%{http_code}" https://localhost/
```

---

## Troubleshooting

### API nao sobe
```bash
journalctl -u portal-artista-api -n 50
# Verificar .env, DATABASE_URL, permissao dos arquivos
```

### Erro de banco
```bash
systemctl status postgresql
sudo -u postgres psql -c "SELECT 1;"
# Verificar se DATABASE_URL esta correta no .env
```

### Frontend nao atualiza
```bash
cd /root/Portal-do-Artista/artifacts/alan-ribeiro-catalog
PORT=3000 BASE_PATH=/ pnpm run build
rm -rf /var/www/portal-do-artista
cp -r dist/public /var/www/portal-do-artista
chown -R www-data:www-data /var/www/portal-do-artista
systemctl reload nginx
```

### SSL
```bash
# Para Let's Encrypt (com dominio):
certbot --nginx -d seu-dominio.com.br
```