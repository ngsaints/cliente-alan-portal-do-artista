# Backlog — Portal do Artista

> **Última atualização**: 26/09/2026

---

## Como funciona (combinado com o Alan)

1. **Uma lista só**: todo pedido novo entra aqui na **Fila**. Nada é começado fora da fila.
2. **Ciclo fixo**: entrega na **sexta-feira**. 1 a 2 itens por ciclo.
3. **Escopo dito antes**: cada item tem estimativa (S = até 1 dia, M = 2–3 dias, L = 1 semana).
4. **Regra**: nunca começar algo novo antes de fechar o item em andamento.
5. Pedido novo = "está na fila, entra no ciclo X". Sem entrar no meio.

---

## Ciclo atual (em andamento)

| # | Item | Tamanho | Status |
|---|------|---------|--------|
| 1 | **Tutorial completo do painel** — 5 → 13 balões, ensina abas, Estúdio Vivi, diagnóstico, músicas, playlists, galeria, perfil, **temas/aparência**, VIP, plano, interesses e conclusão. Troca de aba automática durante o tour (chave `pd_onboarding_tour_v2` para quem já viu a versão antiga rever). | M | ✅ feito 26/09 |
| 2 | **Vivi proativa** — quando o diagnóstico mostra perfil incompleto, a Vivi manda mensagem sugerindo o próximo passo (segura o artista no painel) | M | ⬜ fila |
| 3 | **PWA instalável** — manifest + service worker: ícone na tela do celular e notificação push (é o que mais prende gente pelo custo) | M | ⬜ fila |
| 4 | **Admin acompanha o chat da Vivi** — admin vê as threads e pode assumir a conversa do artista | L | ⬜ fila |

---

## Fila (próximos ciclos — ordem decidida a cada sexta)

> Pedido novo: anexar aqui com estimativa. Só entra no ciclo quando sai da fila para "Ciclo atual".

- [ ] **Trial com créditos grátis** (S/M) — artista testa o Estúdio Vivi sem cartão
- [ ] **Bug: aba "Meus Artigos" vazia** — a aba aparece quando `canPostArticles`, mas o `ArtistDashboard` não renderiza conteúdo nela (S)
- [ ] **Trilha de onboarding com progresso** (%) — o tutorial vira checklist visível
- [ ] **Retorno semanal** — conteúdo novo + lembrete para o artista voltar (M)
- [ ] **Moderação de palavras no chat da Vivi** (S)
- [ ] **App nativo (Capacitor)** — só depois do PWA, decidir com base em uso real (L)
- [ ] Registro de marca / domínios extras (fora de código)

---

## Concluído (recente)

- [x] Remove plano free; listas e limites gerenciáveis pelo admin
- [x] Limites de IA seguem 100% o cadastro de planos do admin
- [x] Fundo claro volta a funcionar; cota de IA só do admin
- [x] Chat da Vivi com cota por plano e hits de IA rastreados
- [x] Tutorial de boas-vindas com balões no primeiro acesso (`OnboardingTour`)
- [x] Chaves VIP/Reservado ligáveis no admin (`Configurações → Portal`)
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
- [x] Sessão de artistas com city filter padronizado (tabela `cities`)
- [x] Carrossel de banners CTA
- [x] Hero da home reformulado (foco em artista, CTAs duplos)
- [x] Upload/edição de músicas via `/api/artist/:id/songs`
- [x] Preço para compositores (checkbox "definir valor", badge "A combinar")
- [x] Botão "Tenho Interesse" no topo do card
- [x] Curtir música (`POST /api/songs/:id/like`)
- [x] Dashboard de metas do CRM (`docs/CRM_METAS_*.md`)
- [x] **Player no celular**: `artifacts/player-app-mobile/`

---

## Arquivo — itens antigos (21/04/2026), revisar antes de usar

> Itens abaixo são da versão antiga deste backlog. Alguns podem já estar feitos (ex.: sitemap.xml,
> robots.txt, pagamento). **Revisar um por um antes de mover para a fila.**

**Bugs (prioridade alta)**
- Race condition de sessão após cadastro (`artists.ts` — `req.session.save()` antes da resposta)
- Typo `artistaId` vs `artistId` em `interests.ts`
- Sessão não declara tipos (`artistId`, `artistEmail`, `artistName`)

**Pagamento**
- MercadoPago: preferência, webhook, `/planos`, ativação automática (hoje o portal usa Asaas)

**SEO**
- OG tags dinâmicas, Twitter cards, sitemap.xml, robots.txt, imagem OG por artista

**Email**
- SMTP (Resend/SendGrid), boas-vindas, novo interesse

**Social**
- Compartilhar (WhatsApp/Twitter), seguir artista, contador de plays

**Analytics**
- Gráficos de plays, top músicas, origem dos ouvintes, artistas ativos

**Técnico**
- Rate limiting em auth, Zod em todos os endpoints, paginação, cache, backup automático,
  skeleton loaders, error boundaries, lazy loading de imagens

**Mobile**
- Home responsiva, grid 1 coluna, player acessível, touch targets 44px

**Segurança**
- bcrypt salt 12, rate limit login, CSRF, CORS, sanitização XSS, Helmet,
  sessões com Redis, log de auditoria

**Slug**
- Edição pelo painel, redirect 301 `/artista/{id}` → `/a/{slug}`, validação

**Música**
- Fila de reprodução, shuffle/repeat, progresso salvo, drag & drop, upload em batch

---

## API Routes — Artistas (Artist Session)

| Method | Path | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/api/artist/:id/songs` | Upload música | session.artistId == id |
| `PUT` | `/api/artist/:id/songs/:songId` | Editar música | session.artistId == id |
| `DELETE` | `/api/artist/:id/songs/:songId` | Deletar música | session.artistId == id |

---

## Migrations

| Migration | Descrição |
|----------|-----------|
| `004_cta_banners.sql` | Tabela e seed de banners CTA |
| `006_cities.sql` | Tabela de cidades gerenciadas pelo admin |
