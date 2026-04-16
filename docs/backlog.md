# Backlog — O Que Falta Fazer

> **Ultima atualizacao**: 16/04/2026

---

## Concluido

- [x] Pagina de cadastro de artista (multi-step)
- [x] Login/logout de artista com sessao
- [x] Dashboard do artista (gerenciamento de musicas)
- [x] Perfil publico do artista (`/a/:slug` e `/artista/:id`)
- [x] Slug de URL customizado
- [x] Personalizacao de perfil (cores, fonte, layout, player)
- [x] Upload de capa e banner
- [x] Links sociais (Instagram, TikTok, Spotify)
- [x] Contatos no perfil (telefone/WhatsApp + email)
- [x] Sistema de recuperacao de senha
- [x] Sistema de interesses/leads (formulario de contato)
- [x] Painel admin (CRUD de musicas, uploads, interesses)
- [x] Area VIP
- [x] Player de audio global persistente
- [x] API endpoints para artistas (CRUD, auth, perfil)

---

## Prioridade Alta

### 1. Bug: Race condition de sessao apos cadastro
- Apos cadastro, redirect para dashboard pode acontecer antes da sessao ser salva
- `GET /api/artists/status` retorna `loggedIn: false` intermitentemente
- **Fix**: chamar `req.session.save()` explicitamente antes do `res.status(201)` no registro
- **Arquivo**: `artifacts/api-server/src/routes/artists.ts`

### 2. Bug: Typo `artistaId` vs `artistId` em interests
- `interests.ts` usa `req.session.artistaId` mas login/registro seta `req.session.artistId`
- Resultado: autorizacao de artista em interesses sempre falha (401)
- **Arquivo**: `artifacts/api-server/src/routes/interests.ts`

### 3. Bug: Sessao nao declara tipos corretos
- `declare module "express-session"` so declara `logado: boolean`
- Faltam `artistId`, `artistEmail`, `artistName`
- **Arquivo**: `artifacts/api-server/src/routes/auth.ts`

### 4. Melhoria: Adicionar campo `contato` no cadastro (FEITO)
- Campo telefone/WhatsApp ja esta no form e na API
- Verificar que aparece no perfil publico

---

## Prioridade Media

### 5. Sistema de Pagamento (MercadoPago)
- [ ] Instalar SDK `mercadopago`
- [ ] `POST /api/payments/create-preference` — Criar preferencia
- [ ] `POST /api/webhooks/mercadopago` — Notificacoes
- [ ] Pagina `/planos` — Cards com botao "Assinar"
- [ ] Checkout Pro (redirect para MP)
- [ ] Ativacao automatica do plano apos pagamento
- [ ] Tabela `subscriptions` no banco
- [ ] Logica de expiracao/cancelamento

### 6. Open Graph / SEO
- [ ] OG tags dinamicas por artista
- [ ] Twitter cards
- [ ] Sitemap.xml
- [ ] robots.txt
- [ ] Imagem OG dinamica com nome/foto do artista

### 7. Sistema de Email
- [ ] Configurar SMTP (Resend, SendGrid)
- [ ] Email de boas-vindas ao artista
- [ ] Email de reset de senha (ja funcional)
- [ ] Email de novo interesse

### 8. Sistema Social
- [ ] Curtir musica
- [ ] Compartilhar (link, WhatsApp, Twitter)
- [ ] Seguir artista
- [ ] Contador de plays

---

## Prioridade Baixa

### 9. Analytics / Dashboard de Stats
- [ ] Graficos de plays por dia/sema/mes
- [ ] Top musicas mais ouvidas
- [ ] Origem dos ouvintes
- [ ] Total de artistas ativos (admin)

### 10. Melhorias Tecnicas
- [ ] Rate limiting em rotas de auth
- [ ] Validacao Zod em todos os endpoints
- [ ] Pagination em listagens grandes
- [ ] Cache de queries frequentes (Redis)
- [ ] Upload com validacao (tipo, tamanho)
- [ ] Backup automatico do banco (cron)
- [ ] Skeleton loaders no frontend
- [ ] Error boundaries (React)
- [ ] Toast de sucesso em todas as acoes
- [ ] PWA / offline support
- [ ] Lazy loading de imagens

### 11. Mobile / Responsividade
- [ ] Verificar home responsiva
- [ ] Cards em grid 1-coluna no mobile
- [ ] Player acessivel no mobile
- [ ] Touch targets adequados (min 44px)

### 12. Seguranca
- [ ] Hash bcrypt com salt round 12
- [ ] Rate limiting em login (max 5/min)
- [ ] CSRF protection
- [ ] CORS configurado
- [ ] Input sanitization (XSS)
- [ ] Helmet.js headers
- [ ] Sessoes com Redis (ao inves de memory store)
- [ ] Log de auditoria

### 13. URL Customizada (Slug) — Melhorias
- [ ] Artista pode editar o slug no painel
- [ ] Redirect de `/artista/{id}` para `/a/{slug}` (301)
- [ ] Validacao: so letras, numeros, hifens

### 14. Funcionalidades de Musica
- [ ] 4 tipos de player (Padrao, Minimalista, Waveform, Lista)
- [ ] Fila de reproducao
- [ ] Shuffle / Repeat
- [ ] Progresso salvo
- [ ] Upload com drag & drop
- [ ] Upload em batch