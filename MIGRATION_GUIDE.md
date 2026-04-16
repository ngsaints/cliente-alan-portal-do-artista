# Portal do Artista - Guia de Migracao e Deploy

## Resumo

Este guia cobre a migracao completa do projeto para uma nova VPS.

---

## Stack Atual

| Componente | Versao/Tecnologia |
|-------------|-------------------|
| OS | Ubuntu 24.04 LTS |
| Runtime | Node.js 24 (via NVM) |
| Package Manager | pnpm (workspaces) |
| Frontend | React 19 + Vite 7 + TailwindCSS 4 |
| Backend | Express 5 + TypeScript + tsx |
| Banco | PostgreSQL 16 + Drizzle ORM |
| Proxy | Nginx (HTTPS self-signed) |
| Process Manager | systemd |

---

## Passo a Passo para Deploy em Nova VPS

### 1. Provisionar VPS Ubuntu 24.04

```bash
apt update && apt upgrade -y
apt install -y nginx postgresql postgresql-contrib curl git
```

### 2. Instalar Node.js 24

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
CREATE USER artista WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE portal_do_artista TO artista;
\q
```

### 5. Clonar e Instalar

```bash
cd /root
git clone https://github.com/ngsaints/cliente-alan-portal-do-artista.git Portal-do-Artista
cd Portal-do-Artista
pnpm install
```

### 6. Configurar .env

```bash
cp .env.example .env
nano .env
```

Variaveis obrigatorias:
```env
DATABASE_URL=postgresql://artista:sua_senha@localhost:5432/portal_do_artista
SESSION_SECRET=uma-chave-secreta-longa-e-aleatoria
PORT=3001
```

Variaveis opcionais (Cloudflare R2):
```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=portal-do-artista
R2_PUBLIC_URL=
```

### 7. Migrations e Seed

```bash
# Aplicar schema
pnpm --filter @workspace/db run push

# Ou rodar SQL manualmente:
psql -U artista -d portal_do_artista -f migrations/001_new_tables.sql

# Seed dos planos
pnpm --filter @workspace/scripts run seed
```

### 8. Build do Frontend

```bash
cd /root/Portal-do-Artista/artifacts/alan-ribeiro-catalog
PORT=3000 BASE_PATH=/ pnpm run build
```

### 9. Deploy dos Arquivos Estaticos

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
```

### 11. Configurar Nginx

Criar `/etc/nginx/sites-available/portal-do-artista`:

```nginx
server {
    listen 80;
    server_name seu-ip-ou-dominio;
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name seu-ip-ou-dominio;

    ssl_certificate /etc/nginx/ssl/portal.crt;
    ssl_certificate_key /etc/nginx/ssl/portal.key;

    location / {
        root /var/www/portal-do-artista;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/portal-do-Artista /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 12. Gerar SSL (auto-assinado para teste)

```bash
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/portal.key \
  -out /etc/nginx/ssl/portal.crt \
  -subj "/CN=seu-ip-ou-dominio"
systemctl reload nginx
```

Para producao com dominio, use Let's Encrypt:
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d seu-dominio.com.br
```

### 13. Verificar

```bash
systemctl status postgresql portal-artista-api nginx
curl -sk https://localhost/api/healthz
```

---

## Script de Deploy Rapido

O projeto inclui `deploy.sh` para rebuild e deploy do frontend:

```bash
/root/Portal-do-Artista/deploy.sh
```

Este script:
1. Faz build do frontend (`pnpm run build`)
2. Copia para `/var/www/portal-do-artista`
3. Recarrega o Nginx

---

## Estrutura de Arquivos

```
Portal-do-Artista/
├── .env.example                 # Modelo de variaveis de ambiente
├── deploy.sh                    # Script de deploy do frontend
├── run-api.sh                   # Start da API (systemd)
├── start.sh                     # Start dev (API + Frontend)
├── package.json                 # Workspace root
├── pnpm-workspace.yaml          # Monorepo config
├── tsconfig.base.json           # TS config base
├── migrations/
│   └── 001_new_tables.sql       # Migration SQL
├── scripts/
│   └── seed.ts                  # Seed de planos e settings
├── docs/                        # Documentacao completa
├── lib/
│   ├── db/                      # Drizzle ORM + schema
│   ├── api-spec/                # OpenAPI spec
│   ├── api-client-react/        # React Query hooks gerados
│   └── api-zod/                 # Zod schemas gerados
└── artifacts/
    ├── alan-ribeiro-catalog/    # Frontend React 19
    └── api-server/              # Backend Express 5
```

---

## Troubleshooting

| Problema | Solucao |
|----------|---------|
| API nao sobe | `journalctl -u portal-artista-api -n 50` — verificar .env e DATABASE_URL |
| Erro de banco | `systemctl status postgresql` — verificar se PostgreSQL esta rodando |
| Frontend nao atualiza | `./deploy.sh` — rebuild e redeploy |
| SSL warning | Normal com self-signed. Para producao, use Let's Encrypt com dominio |
| Uploads nao funcionam | Verificar permissoes de `artifacts/api-server/uploads/` |
| Sessao perdida | Memory store nao persiste entre restarts. Considerar Redis para producao |

---

## Notas Importantes

- **R2 Storage**: Sem R2 configurado, uploads vao para disco local (`artifacts/api-server/uploads/`)
- **Database**: Rodar migrations antes de iniciar
- **Sessoes**: Admin e artista usam session-based auth com memory store (single process)
- **Backwards Compatible**: O sistema admin existente continua funcionando normalmente
- **Node.js**: Requer Node.js 24+ (testado com 24.x)