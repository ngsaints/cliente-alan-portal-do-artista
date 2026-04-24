# Portal do Artista — Documentação

> Plataforma de descoberta e divulgação musical para cantores e compositores.

---

## Visao Geral

O **Portal do Artista** e uma plataforma web que conecta cantores e compositores a ouvintes, contratantes e fas. A plataforma funciona como um catalogo musical onde:

- **Ouvintes** descobrem musicas, exploram artistas e ouvem faixas diretamente na plataforma
- **Artistas** criam perfis personalizados com musicas, fotos, banners e links sociais
- **Contratantes** encontram artistas por regiao para eventos e festas

---

## Funcionalidades Atuais

### Ouvinte
- Playlist publica para descobrir musicas
- Navegacao por artistas e musicas
- Player de audio persistente (play/pause/seek)
- Filtros por genero musical e cidade/regiao
- Pagina de destaque com tendencias
- Catalogo de artistas na pagina inicial com cards (foto, nome, profissao, cidade, telefone, email)
- Botao "Contratar Artista" direcionando para pagina de artistas

### Artista
- Cadastro multi-step (dados basicos, localizacao, redes sociais, fotos, plano)
- Login/logout com sessao
- Dashboard com gerenciamento de musicas
- Perfil publico com banner, foto, musicas, contatos e links sociais
- Slug personalizado (`/a/{slug}` ou `/artista/{id}`)
- Recuperacao de senha por email
- Personalizacao de perfil expandida:
  - **30 opcoes de fontes** (Arial, Inter, Roboto, Poppins, Montserrat, Lato, Playfair Display, Oswald, Raleway, Merriweather, Ubuntu, Nunito, Quicksand, Archivo, Bebas Neue, Cinzel, Cormorant Garamond, Dancing Script, Fira Sans, Josefin Sans, Libre Baskerville, Lora, Pacifico, Rouge Script, Satisfy, Spectral, Tangerine, Vollkorn, Zilla Slab, Abril Fatface)
  - **15 opcoes de backgrounds** (gradientes azul/verde/roxo/sol/oceano + solidos: escuro, escuro azul, preto, branco, bege, cinza claro, azul escuro, verde escuro, roxo escuro)
  - **6 opcoes de player** (Padrao, Minimalista, Lista, Waveform, Moderno, Vintage)
  - **24 opcoes de cores** para fontes + color picker custom
  - Visualizacao previa em tempo real
- Upload de capa e banner
- Sistema de interesses (leads) com sino de notificacao em tempo real
- Pagina Demo para visualizacao completa do perfil

### Contatos no Perfil Publico
- **Telefone/WhatsApp** (`contato`) — exibido com icone Phone
- **Email** — exibido com icone Mail
- **Instagram**, **TikTok**, **Spotify** — links clicaveis
- **Cidade** — exibida com icone MapPin
- Todos os campos sao dinamicamente exibidos conforme cadastrados

### Admin
- Painel admin com login/senha
- CRUD de musicas e uploads
- Gerenciamento de interesses/leads
- Gerenciamento de cidades
- Gerenciamento de banners CTA
- Visualizacao de metricas (plays, likes, musica count por artista)

---

## Estrutura do Projeto

```
Portal-do-Artista/
├── artifacts/
│   ├── alan-ribeiro-catalog/    # Frontend React 19 + Vite + TailwindCSS
│   │   └── src/
│   │       ├── pages/           # Home, Admin, Vip, Artists, ArtistProfile, Cadastro, ArtistLogin, ArtistDashboard, etc.
│   │       ├── components/      # UI + custom (AudioPlayer, MusicCard, Navbar, InterestModal)
│   │       ├── contexts/        # PlayerContext (estado global do player)
│   │       ├── hooks/          # useGenres, hooks gerados (React Query)
│   │       └── lib/            # Utils (cn helper)
│   └── api-server/             # Backend Express 5 + TypeScript
│       └── src/
│           ├── routes/         # auth, songs, artists, admin, settings, interests, profile, artist-songs, auth-password, banners, cities
│           └── lib/            # R2 storage helper
├── lib/
│   ├── db/                     # Drizzle ORM + schema do banco
│   │   └── src/schema/         # songs, artists, plans, interests, settings, passwordResets, ctaBanners, cities
│   ├── api-spec/               # OpenAPI spec + Orval config
│   ├── api-client-react/       # Hooks React Query gerados
│   └── api-zod/                # Zod schemas gerados
├── scripts/                    # Scripts utilitarios (seed)
├── migrations/                 # SQL migrations
└── docs/                       # Documentacao completa
```

---

## Stack Tecnologica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 19, Vite 7, TypeScript, TailwindCSS 4, Framer Motion |
| **UI** | Radix UI, shadcn/ui, Lucide Icons |
| **State** | TanStack React Query, Context API (PlayerContext) |
| **Routing** | Wouter |
| **Backend** | Express 5, TypeScript, tsx |
| **Database** | PostgreSQL 16, Drizzle ORM |
| **ORM Codegen** | OpenAPI 3.1 -> Orval -> React Query hooks + Zod |
| **Storage** | Local (fallback) / Cloudflare R2 (producao) |
| **Auth** | express-session (cookie-based) |
| **Pagamento** | MercadoPago (Checkout Pro - planejado) |
| **Server** | Nginx (proxy reverso + SSL) |
| **Process** | systemd (auto-start) |

---

## Variaveis de Ambiente

Veja `.env.example` para a lista completa. Variaveis obrigatorias:

| Variavel | Descricao |
|----------|-----------|
| `DATABASE_URL` | String de conexao PostgreSQL |
| `SESSION_SECRET` | Chave secreta para sessoes |
| `PORT` | Porta da API (default: 3001) |

Variaveis opcionais (Cloudflare R2):

| Variavel | Descricao |
|----------|-----------|
| `R2_ACCOUNT_ID` | Account ID Cloudflare |
| `R2_ACCESS_KEY_ID` | Access Key R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Key R2 |
| `R2_BUCKET_NAME` | Nome do bucket R2 |
| `R2_PUBLIC_URL` | URL publica do bucket |

---

## API Endpoints

### Auth (Admin)
| Method | Path | Descricao |
|--------|------|-----------|
| `POST` | `/api/auth/login` | Login admin |
| `POST` | `/api/auth/logout` | Logout admin |
| `GET` | `/api/auth/status` | Status da sessao admin |

### Artistas
| Method | Path | Descricao |
|--------|------|-----------|
| `POST` | `/api/artists/register` | Cadastro de artista |
| `POST` | `/api/artists/login` | Login artista |
| `POST` | `/api/artists/logout` | Logout artista |
| `GET` | `/api/artists/status` | Status da sessao artista |
| `GET` | `/api/artists/public` | Lista artistas publicos |
| `GET` | `/api/artists/:identifier` | Perfil publico (id ou slug) |
| `PUT` | `/api/artists/profile` | Atualizar perfil (logado) |
| `PUT` | `/api/artists/:id/profile` | Atualizar perfil (admin) |
| `POST` | `/api/artists/vip-verify/:artistId` | Verificacao VIP |

### Recuperacao de Senha
| Method | Path | Descricao |
|--------|------|-----------|
| `POST` | `/api/artists/forgot-password` | Enviar email de recuperacao |
| `POST` | `/api/artists/reset-password` | Resetar senha com token |
| `GET` | `/api/artists/validate-reset-token/:token` | Validar token de reset |

### Musicas
| Method | Path | Descricao |
|--------|------|-----------|
| `GET` | `/api/songs` | Listar musicas |
| `POST` | `/api/songs` | Adicionar musica (admin) |
| `PUT` | `/api/songs/:id` | Editar musica (admin) |
| `DELETE` | `/api/songs/:id` | Deletar musica (admin) |
| `POST` | `/api/songs/:id/like` | Curtir musica |
| `POST` | `/api/songs/:id/play` | Registrar play |

### Musicas — Artista (via sessao)
| Method | Path | Descricao |
|--------|------|-----------|
| `POST` | `/api/artist/:id/songs` | Upload musica (artista) |
| `PUT` | `/api/artist/:id/songs/:songId` | Editar musica (artista) |
| `DELETE` | `/api/artist/:id/songs/:songId` | Deletar musica (artista) |

### Interesses
| Method | Path | Descricao |
|--------|------|-----------|
| `POST` | `/api/interests` | Enviar interesse |
| `GET` | `/api/interests` | Listar interesses (admin) |
| `GET` | `/api/interests/unread-count` | Contar nao lidos |
| `GET` | `/api/interests/artist/:id` | Listar interesses do artista |
| `PATCH` | `/api/interests/:id/read` | Marcar como lido |
| `DELETE` | `/api/interests/:id` | Deletar interesse |

### Pagamentos
| Method | Path | Descricao |
|--------|------|-----------|
| `GET` | `/api/payments/plans` | Listar planos de precos |
| `POST` | `/api/payments/create-preference` | Criar preferencia de pagamento MP |
| `POST` | `/api/webhooks/mercadopago` | Webhook MercadoPago (IPN) |

### Outros
| Method | Path | Descricao |
|--------|------|-----------|
| `GET` | `/api/healthz` | Health check |
| `GET` | `/api/settings` | Configuracoes globais |
| `PUT` | `/api/settings` | Atualizar settings (admin) |
| `GET` | `/api/plans` | Listar planos |
| `GET` | `/api/cities` | Listar cidades ativas (filtro) |
| `GET` | `/api/admin/cities` | Listar todas cidades (admin) |
| `POST` | `/api/admin/cities` | Criar cidade (admin) |
| `PUT` | `/api/admin/cities/:id` | Atualizar cidade (admin) |
| `DELETE` | `/api/admin/cities/:id` | Deletar cidade (admin) |
| `GET` | `/api/banners` | Listar banners ativos |
| `GET` | `/api/admin/banners` | Listar todos banners (admin) |
| `POST` | `/api/admin/banners` | Criar banner (admin) |
| `PUT` | `/api/admin/banners/:id` | Atualizar banner (admin) |
| `DELETE` | `/api/admin/banners/:id` | Deletar banner (admin) |

---

## Rotas do Frontend

| Rota | Descricao |
|------|-----------|
| `/` | Home — Portal de descoberta com catalogo de artistas |
| `/artistas` | Lista de artistas (TODOS ARTISTAS) |
| `/a/:slug` | Perfil do artista (por slug) |
| `/artista/:id` | Perfil do artista (por ID) |
| `/artista/login` | Login do artista |
| `/artista/cadastro` | Cadastro do artista |
| `/artista/dashboard` | Dashboard do artista (logado) |
| `/artista/forgot-password` | Recuperar senha |
| `/artista/reset-password` | Resetar senha |
| `/demo` | Pagina Demo (visualizacao completa do perfil) |
| `/admin` | Painel admin |
| `/vip` | Area VIP |

---

## Comandos Uteis

```bash
# Instalar dependencias
pnpm install

# Desenvolvimento (API + Frontend)
./start.sh

# Build frontend para producao
./deploy.sh

# Push schema para o banco
pnpm --filter @workspace/db run push

# Seed dos planos
pnpm --filter @workspace/scripts run seed

# Typecheck
pnpm run typecheck
```

---

## Proximos Passos (Backlog)

Veja o backlog completo em: [`backlog.md`](backlog.md)

---

## Links

- **Repositorio**: https://github.com/ngsaints/cliente-alan-portal-do-artista
- **Infraestrutura**: [`infrastructure.md`](infrastructure.md)
- **Schema do banco**: [`database-schema.md`](database-schema.md)