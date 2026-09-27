# Backlog — Portal do Artista

> **Última atualização**: 27/09/2026

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
| 2 | **Vivi proativa** — card "Vivi diz" no Diagnóstico com a mensagem da Vivi (percentual + próximo passo), botão que leva ao lugar certo e o mesmo contexto já dentro do chat do Estúdio. Sem chamada de IA (custo zero). Bonus: pergunta rápida do dashboard agora cai na conversa da Vivi (antes era enviada e a resposta não aparecia — queimava cota à toa). | M | ✅ feito 27/09 |
| 3 | **PWA instalável** — manifest + service worker: ícone na tela do celular e notificação push (é o que mais prende gente pelo custo) | M | ⬜ fila |
| 4 | **Admin acompanha o chat da Vivi** — admin vê as threads e pode assumir a conversa do artista | L | ⬜ fila |

---

## Fila (próximos ciclos — ordem decidida a cada sexta)

> Pedido novo: anexar aqui com estimativa. Só entra no ciclo quando sai da fila para "Ciclo atual".

- [ ] **TV de novidades ("TVzinha")** (M) — pedido do Alan em 27/09. **Na fila, ainda falta detalhar.** Ver detalhes em [TV de novidades](#tv-de-novidades-pedido-do-alan-2709)
- [ ] **Trial com créditos grátis** (S/M) — artista testa o Estúdio Vivi sem cartão
- [ ] **Bug: aba "Meus Artigos" vazia** — a aba aparece quando `canPostArticles`, mas o `ArtistDashboard` não renderiza conteúdo nela (S)
- [ ] **Trilha de onboarding com progresso** (%) — o tutorial vira checklist visível
- [ ] **Retorno semanal** — conteúdo novo + lembrete para o artista voltar (M)
- [ ] **Moderação de palavras no chat da Vivi** (S)
- [ ] **App nativo (Capacitor)** — só depois do PWA, decidir com base em uso real (L)
- [ ] Registro de marca / domínios extras (fora de código)

---

## TV de novidades (pedido do Alan, 27/09)

> Status: **na fila — ainda falta detalhar com ele antes de estimar de verdade.**
> Tamanho provável: **M (2–3 dias)**.

### O que ele pediu (resumo do áudio)
- Uma **"televisãozinha"** que apareça **em todas as páginas**: home, perfil do compositor, perfil do artista, página da música — tudo.
- Nele ele posta **vídeos**: tutorial ("como mexer no perfil"), novidade, lançamento.
- Funciona como **newsletter em vídeo** — jeito dele comunicar sem responder um a um.
- Motivo: ~20 assinantes (maioria R$10) e ele está **respondendo dúvidas 24h**. Precisa reter a base: "entraram, não podem sair".

### Desenho preliminar (não aprovado ainda)
- Widget fixo (canto inferior) em todas as páginas + **badge de novidade**
- Clicou → vídeo em modal; **"não mostrar de novo"** grava no navegador
- Admin cadastra vídeo (tabela `tv_videos`: título, url, descrição, link, ativo, ordem) — mesmo padrão do CRUD de banners (`routes/banners.ts`)
- Vídeo por **link do YouTube (unlisted)** em vez de upload: não pesa no servidor, custo R$0
- Widget `TVWidget.tsx` montado no layout público + painel
- Opcional: painel de "quem assistiu" (senão é chute, não métrica)

### Decisões pendentes (preciso da Dani/Alan respondendo)
1. **Onde aparece**: todas as páginas públicas, painel do artista, ou as duas?
2. **Formato**: YouTube unlisted (recomendado) ou upload de MP4 no servidor?
3. **Posição/comportamento**: flutuante no canto, banner no topo, ou os dois? Some depois de assistir?
4. **Quem publica**: só o Alan no admin? Precisa agendar data de publicação?
5. **Texto + CTA** junto do vídeo (ex.: botão "Ver tutorial no painel")?
6. **Métrica**: precisa saber quem assistiu? (se não, é só visual)
7. **Ciclo**: em qual sexta ela entra?

### Atenção
- A TV **ensina e comunica**, mas **não** substitui a **Vivi proativa** (item 2), que é o que responde dúvida pessoal sem o Alan. Ela também **não** substitui o **PWA push** (item 3), que é o que mais segura assinante no dia a dia.

---

## Concluído (recente)

- [x] **Vivi proativa** (27/09) — card "Vivi diz" no Diagnóstico + contexto no chat do Estúdio; pergunta rápida do dashboard agora responde na conversa (antes a resposta não aparecia e queimava cota de IA)
- [x] **Tutorial do painel expandido** (26/09) — 13 balões, troca de aba automática, chave `pd_onboarding_tour_v2`
- [x] **Backlog reescrito** (26/09) — regras do ciclo de entrega, fila única e pedido da TV de novidades anotado
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
