# Sessão de Desenvolvimento — 14 de Abril de 2026 (Parte 2)

## Visão Geral

Sessão de correções estruturais e novas funcionalidades. Foco em: dashboard admin, upload de arquivos, integração YouTube, sistema de interesses e pagamento.

---

## 1. Dashboard Admin (`/admin`) — Reconstrução

**Problema:** `Admin.tsx` só tinha CRUD de músicas. O backend já tinha todas as rotas admin implementadas, mas o frontend não as consumia.

**Solução:** Reescrita completa com sistema de abas.

### Abas adicionadas

| Aba | Endpoint(s) | Funcionalidade |
|-----|------------|----------------|
| Dashboard | `GET /api/admin/stats` | 8 cards de estatísticas + atalhos |
| Músicas | `GET/POST/PUT/DELETE /api/songs` | CRUD com search bar e modal unificado |
| Artistas | `GET/PUT/DELETE /api/admin/artists/:id` | Tabela com edição inline de plano/status |
| Planos | `GET/PUT /api/admin/plans/:id` | Cards editáveis |
| Interesses | `GET /api/admin/recent-interests` + `PUT /api/admin/interests/:id/mark-read` | Leads recebidos |
| Configurações | `GET/PUT /api/admin/settings/:category` | MercadoPago, R2, Portal — campos mascarados |

### Modal de Músicas (`SongModal`)

- Modo `add` e `edit` no mesmo componente
- **Áudio:** upload de capa (com preview) + MP3
- **Vídeo:** campo de URL YouTube + preview de thumbnail em tempo real
- Em modo `edit`: capa pode ser trocada (PUT aceita `multipart/form-data`); MP3 não (requer delete + readd)

---

## 2. OpenAPI Spec + Orval — Atualização Crítica

**Problema:** Schema OpenAPI estava desatualizado. O hook `useCreateSong` gerado pelo Orval não incluía `tipoMidia`, `youtubeUrl`, `vipCode` e `artistaId` no FormData — esses campos eram silenciosamente descartados.

**Solução:** Atualização de `lib/api-spec/openapi.yaml` + regeneração com `pnpm --filter @workspace/api-spec run codegen`.

### Campos adicionados ao schema

```yaml
CreateSongBody:  tipoMidia, youtubeUrl, vipCode, artistaId
UpdateSongBody:  tipoMidia, youtubeUrl, vipCode
Song (response): tipoMidia, youtubeUrl, vipCode, artistaId, likes, plays
```

> **Regra:** Sempre que o backend receber novos campos, atualizar `openapi.yaml` e regenerar.

---

## 3. Multer — Bug de Buffer com R2

**Problema:** Todos os routes de upload usavam `multer.diskStorage`. Com disk storage, `file.buffer` é `undefined`. O código tentava passar `file.buffer` para `uploadToR2()` → uploads falhavam silenciosamente.

**Arquivos corrigidos:**

- `artifacts/api-server/src/routes/songs.ts`
- `artifacts/api-server/src/routes/artist-songs.ts`
- `artifacts/api-server/src/routes/profile.ts`
- `artifacts/api-server/src/routes/settings.ts`
- `artifacts/api-server/src/routes/artists.ts`

**Fix:** Trocar `diskStorage` por `memoryStorage()` em todos. O fallback local agora usa `fs.writeFileSync(path, file.buffer)`.

```ts
// ANTES (quebrado com R2)
const upload = multer({ storage: multer.diskStorage({...}) });
// file.buffer === undefined → uploadToR2(undefined) falha

// DEPOIS (correto)
const upload = multer({ storage: multer.memoryStorage() });
// file.buffer disponível → funciona com R2 e com disco local
```

Helper extraído para módulo:
```ts
function saveLocal(buffer: Buffer, folder: string, originalname: string): string
// Salva em /uploads/{folder}/ e retorna URL /api/uploads/{folder}/filename
```

---

## 4. Nginx — Upload 413

**Problema:** Nginx bloqueava uploads acima de 1 MB (padrão).

**Fix em** `/etc/nginx/sites-available/portal-do-artista`:
```nginx
location /api/ {
    client_max_body_size 60M;
    proxy_read_timeout   120s;
    proxy_send_timeout   120s;
    ...
}
```

---

## 5. R2 Storage — Configuração

O upload usa R2 automaticamente se as 4 variáveis estiverem preenchidas no `.env`. Caso contrário, salva local.

```env
R2_ACCOUNT_ID=       # ID da conta Cloudflare
R2_ACCESS_KEY_ID=    # Chave de acesso R2
R2_SECRET_ACCESS_KEY=# Chave secreta R2
R2_BUCKET_NAME=      # Nome do bucket
R2_PUBLIC_URL=       # URL pública (https://pub-xxx.r2.dev)
```

Detecção em `r2-storage.ts`:
```ts
export const r2Enabled = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);
```

---

## 6. MercadoPago — Reescrita

**Problemas no código anterior:**
- `require("@workspace/db")` dentro de função async (incorreto)
- Sandbox hardcoded em vez de detectado pelo token
- `notification_url` com IP hardcoded
- Webhook sem verificação de assinatura (falha de segurança)
- Tabela `app_settings` com 5 campos MP desnecessários

**Estado atual — `app_settings` (categoria `mercadopago`):**

| key | is_secret | Descrição |
|-----|-----------|-----------|
| `mp_access_token` | true | Token MP (`APP_USR-...` = produção, `TEST-...` = sandbox) |
| `mp_webhook_secret` | true | Chave para validar assinatura dos webhooks |

**Detecção de ambiente:** automática pelo prefixo do token.

**Verificação de webhook** (`artifacts/api-server/src/routes/payments.ts`):
```ts
// Header: x-signature = "ts=<timestamp>,v1=<hmac>"
// Template: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
// Validação: HMAC-SHA256(template, mp_webhook_secret)
```

**URLs dinâmicas:** lidas da configuração `portal_url` da tabela `app_settings` (categoria `portal`).

---

## 7. Sistema de Interesses — Fluxo Completo

**Problema:** `InterestModal` nunca chamava a API — apenas atualizava estado local. Dados desapareciam no reload. Nenhum vínculo com o artista.

### Mudanças

**Banco de dados:**
```sql
ALTER TABLE interests ADD COLUMN artista_id integer;
```

**Schema Drizzle** (`lib/db/src/schema/interests.ts`):
```ts
artistaId: integer("artista_id")   // nullable, para compatibilidade com registros antigos
```

**Backend** (`artifacts/api-server/src/routes/interests.ts`):

| Endpoint | Auth | Descrição |
|----------|------|-----------|
| `POST /interests` | Público | Salva interesse com `artistaId` |
| `GET /interests/artist/:id` | Artista ou Admin | Interesses do artista |
| `PATCH /interests/:id/read` | Artista dono ou Admin | Marca como lido |
| `DELETE /interests/:id` | Artista dono ou Admin | Remove interesse |

**Frontend:**
- `InterestModal.tsx` → chama `POST /api/interests` diretamente com `songId` + `artistaId`
- `Home.tsx` / `ArtistProfile.tsx` → passam `song.id` e `song.artistaId` ao abrir o modal
- `ArtistDashboard.tsx` → nova aba **Interesses** com lista, badges "Novo", botões "Lido" e "Cancelar"

### Fluxo atual
```
Visitante → clica "Tenho Interesse" em uma música
  → Modal pede nome, email, telefone, mensagem, tipo de interesse
  → POST /api/interests { songId, artistaId, ... }
  → Salvo no banco com artista_id
  → Artista vê na aba "Interesses" do painel /artista/dashboard
  → Pode marcar como lido ou remover
```

---

## 8. YouTube — Detecção de Erro de Incorporação

**Problema:** Vídeos com incorporação desativada pelo dono exibiam "Vídeo indisponível / Assistir no YouTube" dentro do iframe, sem saída clara para o usuário.

**Solução** (`MusicCard.tsx`):

1. URL do iframe inclui `enablejsapi=1&origin=<domínio>` → habilita eventos via `postMessage`
2. `window.addEventListener('message', handler)` escuta erros do YouTube
3. Erros `101` e `150` = incorporação não permitida → detectados automaticamente
4. Ao detectar erro: iframe é substituído por tela de fallback com botão "Abrir no YouTube"

```ts
// Códigos de erro YouTube
// 101 / 150 = embedding not allowed by video owner
if (data?.event === 'onError' && (data?.info === 101 || data?.info === 150)) {
  setEmbedError(true);
}
```

**Card de vídeo agora tem dois botões:**
- `▶ Assistir` — tenta incorporar inline
- `↗` (ExternalLink) — abre no YouTube diretamente (sempre funciona)

---

## Estrutura de Arquivos Relevantes

```
Portal-do-Artista/
├── lib/
│   ├── api-spec/openapi.yaml          ← Schema da API (manter atualizado!)
│   ├── api-zod/src/generated/         ← Gerado automaticamente pelo Orval
│   ├── api-client-react/src/generated/← Gerado automaticamente pelo Orval
│   └── db/src/schema/                 ← Schemas Drizzle (interesses, artistas, etc.)
│
├── artifacts/
│   ├── api-server/src/
│   │   ├── routes/
│   │   │   ├── songs.ts           ← CRUD músicas + upload (memoryStorage)
│   │   │   ├── payments.ts        ← MercadoPago (preference + webhook)
│   │   │   ├── interests.ts       ← Sistema de interesses por artista
│   │   │   ├── admin.ts           ← Stats, artistas, planos, settings admin
│   │   │   ├── artists.ts         ← Cadastro/perfil de artistas
│   │   │   ├── artist-songs.ts    ← Upload músicas pelo artista
│   │   │   └── profile.ts         ← Atualização de perfil do artista
│   │   └── lib/
│   │       └── r2-storage.ts      ← Cliente R2 (S3-compatible)
│   │
│   └── alan-ribeiro-catalog/src/
│       ├── pages/
│       │   ├── Admin.tsx          ← Painel admin com 6 abas
│       │   ├── ArtistDashboard.tsx← Painel artista com 5 abas (+ Interesses)
│       │   ├── Home.tsx           ← Catálogo público
│       │   └── ArtistProfile.tsx  ← Perfil público do artista
│       └── components/
│           ├── MusicCard.tsx      ← Card com player áudio/vídeo
│           └── InterestModal.tsx  ← Modal de interesse (chama API)
│
├── .env                               ← Credenciais (DB, R2, sessão)
└── docs/                              ← Esta pasta
```

---

## Comandos Úteis

```bash
# Regenerar types/client após mudar openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Build e deploy do frontend
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/alan-ribeiro-catalog run build
rm -rf /var/www/portal-do-artista && cp -r artifacts/alan-ribeiro-catalog/dist/public /var/www/portal-do-artista
chown -R www-data:www-data /var/www/portal-do-artista && systemctl reload nginx

# Reiniciar API
systemctl restart portal-artista-api

# Ver logs da API
journalctl -u portal-artista-api -f
```

---

## Estado do Projeto ao Final da Sessão

| Componente | Status |
|-----------|--------|
| API (`portal-artista-api`) | Rodando na porta 3001 |
| Frontend | Deployado em `/var/www/portal-do-artista` via Nginx |
| PostgreSQL | Ativo |
| R2 Storage | Configurado no código, aguardando credenciais no `.env` |
| MercadoPago | Configurado no código, aguardando token no painel admin |
