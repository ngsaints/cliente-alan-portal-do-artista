# 🎛️ Painel Admin — Dashboard

> Interface completa de administração do Portal do Artista

---

## Acesso

| Item | Detalhe |
|------|---------|
| **URL** | `https://94.141.97.95/admin` |
| **Login** | `admin` / `1234` |
| **Autenticação** | express-session (cookie-based, 24h) |

---

## Abas do Dashboard

### 1. 📊 Dashboard (Visão Geral)

Exibe estatísticas em tempo real da plataforma:

| Card | Descrição |
|------|-----------|
| **Total de Músicas** | Todas as músicas cadastradas |
| **Artistas** | Total de artistas na plataforma |
| **Disponíveis** | Músicas com status "Disponível" |
| **VIP** | Músicas exclusivas da área VIP |
| **Planos Ativos** | Número de planos configurados |
| **Artistas Free** | Artistas no plano gratuito |
| **Artistas Pagantes** | Artistas em planos pagos |
| **Interesses/Leads** | Formulários de contato recebidos |

**Atalhos rápidos** para configurações:
- MercadoPago
- Cloudflare R2
- Portal

---

### 2. 🎵 Músicas (CRUD)

Gerenciamento completo das músicas:

#### Listar
- Tabela com capa, título, gênero, status, badge VIP
- Botão de deletar com confirmação

#### Adicionar
- Formulário com campos:
  - Título, Gênero (dropdown), Descrição
  - Upload de Capa (imagem)
  - Upload de MP3 (áudio)
- Submit via `FormData` (multipart)

#### Deletar
- Confirmação antes de excluir
- Remove arquivos do storage (local ou R2)

---

### 3. 💳 MercadoPago (Configuração)

Configuração das credenciais de pagamento:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mp_access_token` | 🔒 Secret | Access Token de produção |
| `mp_public_key` | 🔓 Público | Public Key (exibível no frontend) |
| `mp_client_id` | 🔓 Público | ID da aplicação |
| `mp_client_secret` | 🔒 Secret | Secret da aplicação |
| `mp_sandbox` | 🔓 Boolean | Modo teste (true/false) |

**Como configurar:**
1. Acessar [MercadoPago Developers](https://www.mercadopago.com.br/developers)
2. Criar aplicação no painel
3. Copiar Access Token e Public Key
4. Configurar webhook URL: `https://94.141.97.95/api/webhooks/mercadopago`

**Segurança:** Campos secretos são mascarados (`••••••••`) e só revelados ao clicar no ícone de olho.

---

### 4. ☁️ Cloudflare R2 (Configuração)

Configuração do storage em nuvem:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `r2_account_id` | 🔒 Secret | Account ID do Cloudflare |
| `r2_access_key_id` | 🔒 Secret | Access Key |
| `r2_secret_access_key` | 🔒 Secret | Secret Key |
| `r2_bucket_name` | 🔓 Público | Nome do bucket |
| `r2_public_url` | 🔓 Público | URL pública do bucket |

**Como configurar:**
1. Painel Cloudflare → R2 Object Storage
2. Criar bucket (ex: `portal-do-artista`)
3. Gerar API Tokens (leitura/escrita)
4. Copiar Account ID, Access Key, Secret Key

Quando configurado, o sistema automaticamente:
- Envia capas para `covers/` no bucket
- Envia MP3 para `audio/` no bucket
- Envia fotos de perfil para `photos/` no bucket

---

### 5. ⚙️ Portal (Configurações Gerais)

Configurações da plataforma:

| Campo | Descrição |
|-------|-----------|
| `portal_name` | Nome exibido no site |
| `portal_description` | Descrição/meta description |
| `portal_url` | URL canônica do portal |
| `contact_email` | Email de contato |
| `contact_whatsapp` | WhatsApp para contato |

---

## API Endpoints do Admin

| Method | Path | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/api/admin/stats` | Admin | Estatísticas gerais |
| `GET` | `/api/admin/settings` | Admin | Todas as configurações (secretos mascarados) |
| `PUT` | `/api/admin/settings` | Admin | Atualizar configurações |
| `GET` | `/api/admin/settings/:category` | Admin | Configurações por categoria |
| `GET` | `/api/admin/recent-interests` | Admin | Últimos leads/contatos |
| `PUT` | `/api/admin/interests/:id/mark-read` | Admin | Marcar lead como lido |

### Exemplo de resposta `/api/admin/stats`:
```json
{
  "totalSongs": 3,
  "totalArtists": 0,
  "totalInterests": 0,
  "totalPlans": 5,
  "availableSongs": 3,
  "vipSongs": 0,
  "freeArtists": 0,
  "paidArtists": 0
}
```

---

## Banco: Tabela `app_settings`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | serial | PK |
| `category` | text | Categoria (mercadopago, r2, portal, smtp) |
| `key` | text | UNIQUE — chave da configuração |
| `value` | text | Valor (pode ser vazio) |
| `is_secret` | text | "true" ou "false" |
| `description` | text | Descrição do campo |
| `updated_at` | timestamp | Última atualização |

### Categorias:
- `mercadopago` — Credenciais de pagamento
- `r2` — Cloudflare R2 storage
- `portal` — Configurações gerais do portal
- `smtp` — Email (futuro)

---

## Estrutura de Arquivos

### Backend
```
artifacts/api-server/src/routes/
├── admin.ts          # Stats, settings, interests
└── index.ts          # Registra adminRouter
```

### Frontend
```
artifacts/alan-ribeiro-catalog/src/pages/
└── Admin.tsx         # Dashboard completo (634 linhas)
```

**Componentes internos do Admin.tsx:**
- `LoginForm` — Tela de login
- `AdminDashboard` — Container principal
- `StatCard` — Card de estatística
- `SettingsField` — Campo de configuração (com mask/unmask)
- `ConfigTab` — Tab de configuração genérica (reutilizável)

---

## Fluxo de Salvamento

1. Admin edita campo → `onChange` atualiza estado local
2. Clica em "Salvar Configurações" → `PUT /api/admin/settings`
3. Backend atualiza `app_settings` no banco
4. Frontend recarrega dados → exibe mensagem de sucesso
5. Nginx/API usa novos valores automaticamente (via env ou DB read)

---

## Segurança

### Secret Masking
- Configurações marcadas como `is_secret = "true"` são exibidas como `••••••••`
- Para editar: clicar no ícone 👁 revela o valor real
- Salvar: botão discreto ao lado do campo secreto

### Auth Check
- Todas as rotas `/api/admin/*` verificam `req.session.logado === true`
- Sem sessão → retorna 401 `{"error": "Não autorizado"}`

### HTTPS Only
- Cookies de sessão trafegam apenas via HTTPS
- HTTP redirect 301 → HTTPS

---

## Próximos Passos

- [ ] Upload de banner/foto direto pelo admin
- [ ] CRUD de artistas (criar, editar, deletar)
- [ ] CRUD de planos (editar preços)
- [ ] Webhook MercadoPago (ativoção automática de planos)
- [ ] Logs de auditoria (quem mudou o quê)
- [ ] Backup/restore do banco
- [ ] Testar credenciais R2/MP (botão "Testar conexão")
- [ ] Dashboard de receita (total recebido via MP)
