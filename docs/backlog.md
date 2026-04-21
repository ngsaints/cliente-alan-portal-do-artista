# Backlog — O Que Falta Fazer

> **Última atualização**: 21/04/2026

---

## Concluído

- [x] Página de cadastro de artista (multi-step)
- [x] Login/logout de artista com sessão
- [x] Dashboard do artista (gerenciamento de músicas)
- [x] Perfil público do artista (`/a/:slug` e `/artista/:id`)
- [x] Slug de URL customizado
- [x] Personalização de perfil (cores, fonte, layout, player)
- [x] Upload de capa e banner
- [x] Links sociais (Instagram, TikTok, Spotify)
- [x] Contatos no perfil (telefone/WhatsApp + email)
- [x] Sistema de recuperação de senha
- [x] Sistema de interesses/leads (formulário de contato)
- [x] Painel admin (CRUD de músicas, uploads, interesses)
- [x] Área VIP
- [x] Player de áudio global persistente
- [x] API endpoints para artistas (CRUD, auth, perfil)
- [x] **Sessão de artistas com city filter padronizado** (cidades gerenciadas pelo admin via tabela `cities`)
- [x] **Carrossel de banners CTA** (sistema de banners configuráveis)
- [x] **Hero da home reformulado** (foco em artista, CTAs duplos)
- [x] **Upload de músicas via `/api/artist/:id/songs`** (autenticação via sessão artista)
- [x] **Edição de músicas pelo artista** (`PUT /api/artist/:id/songs/:songId`)
- [x] **Preço para compositores** (checkbox "definir valor", badge "A combinar")
- [x] **Fix: ArtistProfile filtering songs by artistId numérico** (antes usava slug como id)
- [x] **Botão "Tenho Interesse" no topo do card** (posição top-3 right-3)

---

## Prioridade Alta

### 1. Bug: Race condition de sessão após cadastro
- Após cadastro, redirect para dashboard pode acontecer antes da sessão ser salva
- `GET /api/artists/status` retorna `loggedIn: false` intermitentemente
- **Fix**: chamar `req.session.save()` explicitamente antes do `res.status(201)` no registro
- **Arquivo**: `artifacts/api-server/src/routes/artists.ts`

### 2. Bug: Typo `artistaId` vs `artistId` em interests
- `interests.ts` usa `req.session.artistaId` mas login/registro seta `req.session.artistId`
- Resultado: autorização de artista em interesses sempre falha (401)
- **Arquivo**: `artifacts/api-server/src/routes/interests.ts`

### 3. Bug: Sessão não declara tipos corretos
- `declare module "express-session"` só declara `logado: boolean`
- Faltam `artistId`, `artistEmail`, `artistName`
- **Arquivo**: `artifacts/api-server/src/routes/auth.ts`

---

## Prioridade Média

### 4. Sistema de Pagamento (MercadoPago)
- [ ] Instalar SDK `mercadopago`
- [ ] `POST /api/payments/create-preference` — Criar preferência
- [ ] `POST /api/webhooks/mercadopago` — Notificações
- [ ] Página `/planos` — Cards com botão "Assinar"
- [ ] Checkout Pro (redirect para MP)
- [ ] Ativação automática do plano após pagamento
- [ ] Tabela `subscriptions` no banco
- [ ] Lógica de expiração/cancelamento

### 5. Open Graph / SEO
- [ ] OG tags dinâmicas por artista
- [ ] Twitter cards
- [ ] Sitemap.xml
- [ ] robots.txt
- [ ] Imagem OG dinâmica com nome/foto do artista

### 6. Sistema de Email
- [ ] Configurar SMTP (Resend, SendGrid)
- [ ] Email de boas-vindas ao artista
- [ ] Email de reset de senha (já funcional)
- [ ] Email de novo interesse

### 7. Sistema Social
- [x] Curtir música (já implementado — `POST /api/songs/:id/like`)
- [ ] Compartilhar (link, WhatsApp, Twitter)
- [ ] Seguir artista
- [ ] Contador de plays

---

## Prioridade Baixa

### 8. Analytics / Dashboard de Stats
- [ ] Gráficos de plays por dia/semana/mês
- [ ] Top músicas mais ouvidas
- [ ] Origem dos ouvintes
- [ ] Total de artistas ativos (admin)

### 9. Melhorias Técnicas
- [ ] Rate limiting em rotas de auth
- [ ] Validação Zod em todos os endpoints
- [ ] Pagination em listagens grandes
- [ ] Cache de queries frequentes (Redis)
- [ ] Upload com validação (tipo, tamanho)
- [ ] Backup automático do banco (cron)
- [ ] Skeleton loaders no frontend
- [ ] Error boundaries (React)
- [ ] Toast de sucesso em todas as ações
- [ ] PWA / offline support
- [ ] Lazy loading de imagens

### 10. Mobile / Responsividade
- [ ] Verificar home responsiva
- [ ] Cards em grid 1-coluna no mobile
- [ ] Player acessível no mobile
- [ ] Touch targets adequados (min 44px)

### 11. Segurança
- [ ] Hash bcrypt com salt round 12
- [ ] Rate limiting em login (max 5/min)
- [ ] CSRF protection
- [ ] CORS configurado
- [ ] Input sanitization (XSS)
- [ ] Helmet.js headers
- [ ] Sessões com Redis (ao invés de memory store)
- [ ] Log de auditoria

### 12. URL Customizada (Slug) — Melhorias
- [ ] Artista pode editar o slug no painel
- [ ] Redirect de `/artista/{id}` para `/a/{slug}` (301)
- [ ] Validação: só letras, números, hifens

### 13. Funcionalidades de Música
- [ ] 4 tipos de player (Padrão, Minimalista, Waveform, Lista)
- [ ] Fila de reprodução
- [ ] Shuffle / Repeat
- [ ] Progresso salvo
- [ ] Upload com drag & drop
- [ ] Upload em batch

---

## Migrations Recentes

| Migration | Descrição |
|----------|-----------|
| `004_cta_banners.sql` | Tabela e seed de banners CTA |
| `006_cities.sql` | Tabela de cidades gerenciadas pelo admin |

---

## API Routes — Artistas (Artist Session)

| Method | Path | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/api/artist/:id/songs` | Upload música | session.artistId == id |
| `PUT` | `/api/artist/:id/songs/:songId` | Editar música | session.artistId == id |
| `DELETE` | `/api/artist/:id/songs/:songId` | Deletar música | session.artistId == id |

---

## Features Recentes (21/04/2026)

### Carrossel de Banners CTA
- Banners configurados via tabela `cta_banners` no admin
- Campos: texto, cor_fundo, cor_texto, botao_texto, botao_link, imagem_fundo_url, intervalo_segundos
- Padrão: links apuntan para `/artista/login?tab=cadastro`

### Cidade Padronizada
- Tabela `cities` gerenciada pelo admin
- Filtro de artistas por cidade usa a tabela oficial (não mais extração do cadastro)
- Combobox com busca (cmdk + Popover)

### Preço para Compositores
- Checkbox "Definir valor" no formulário de música
- Se desmarcado: badge "A combinar" no card
- Se marcado: campos Valor X (Uso Livre) e Valor Y (Uso Exclusivo)

### Hero da Home
- Headline foca em "cantores e compositores"
- CTAs duplos: "Criar Meu Portal" + "Ver Catálogo"
- Search abaixo dos CTAs

### Botão "Tenho Interesse"
- Posicionado no topo direito do card (top-3 right-3)
- Presente em Home.tsx e ArtistProfile.tsx
