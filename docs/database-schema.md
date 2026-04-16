# 🗄️ Banco de Dados — Schema

> PostgreSQL 16 + Drizzle ORM

---

## Tabelas

### `songs`

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `id` | serial | PK | ID auto-increment |
| `artista_id` | text | null | Link para artista (null = catálogo geral) |
| `titulo` | text | | Título da música |
| `descricao` | text | | Descrição / sinopse |
| `genero` | text | | Gênero (Sertanejo, Pop, Rock, MPB...) |
| `subgenero` | text | null | Sub-gênero opcional |
| `compositor` | text | null | Nome do compositor |
| `status` | text | "Disponível" | "Disponível" ou "Reservado" |
| `preco_x` | numeric | null | Valor X (licenciamento livre) |
| `preco_y` | numeric | null | Valor Y (licenciamento exclusivo) |
| `capa_path` | text | null | URL/path da imagem de capa |
| `mp3_path` | text | null | URL/path do arquivo MP3 |
| `is_vip` | boolean | false | Música exclusiva da área VIP |
| `destaque` | boolean | false | Aparece na seção "Destaques" da home |
| `created_at` | timestamp | now() | Data de criação |

---

### `artists`

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `id` | serial | PK | ID auto-increment |
| `name` | varchar(255) | | Nome do artista |
| `email` | varchar(255) | UNIQUE | Email de login |
| `password` | text | | Senha (hash) |
| `profissao` | text | null | Cantor, Compositor, Banda, Grupo, Dupla |
| `contato` | text | null | Telefone/WhatsApp |
| `instagram` | text | null | @username |
| `tiktok` | text | null | @username |
| `spotify` | text | null | URL do Spotify |
| `capa_url` | text | null | URL da foto de perfil |
| `banner_url` | text | null | URL do banner (capa do perfil) |
| `cidade` | text | null | Cidade/UF (ex: "Maricá, RJ") |
| `fonte` | text | "Arial" | Fonte preferida do perfil |
| `cor` | text | "#ffffff" | Cor do texto/accent do perfil |
| `layout` | text | null | Tipo de background (gradiente/pattern) |
| `player` | text | "Padrão" | Tipo de player de áudio |
| `plano` | text | "free" | free, basico, intermediario, pro, premium |
| `plano_ativo` | boolean | true | Plano está ativo? |
| `musica_count` | numeric | "0" | Contador de músicas |
| `limite_musicas` | numeric | "2" | Máximo de músicas do plano |
| `personalizacao_percent` | numeric | "10" | % de personalização liberada |
| `created_at` | timestamp | now() | Data de cadastro |
| `updated_at` | timestamp | now() | Última atualização |

---

### `plans`

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `id` | serial | PK | ID auto-increment |
| `nome` | text | UNIQUE | Identificador (free, basico, pro...) |
| `label` | text | | Nome exibível ("Gratuito", "Premium") |
| `preco` | numeric | | Preço mensal (ex: "19.90") |
| `limite_musicas` | numeric | | Máximo de músicas |
| `personalizacao_percent` | numeric | | % de personalização |
| `descricao` | text | null | Descrição do plano |
| `frase_efeito` | text | null | Frase de marketing |
| `ativo` | boolean | true | Plano visível no cadastro |
| `created_at` | timestamp | now() | Data de criação |

**Dados seedados:**

| Plano | Preço | Músicas | Personalização |
|-------|-------|---------|----------------|
| Free | R$0 | 2 | 10% |
| Básico | R$19.90 | 10 | 30% |
| Intermediário | R$39.90 | 25 | 50% |
| Profissional | R$79.90 | 50 | 80% |
| Premium | R$149.90 | 100 | 100% |

---

### `settings`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `key` | text | PK (ex: "artist_name", "vip_password") |
| `value` | text | Valor da configuração |

---

### `interests`

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `id` | serial | PK | ID auto-increment |
| `song_id` | text | | ID da música relacionada |
| `nome` | text | | Nome do interessado |
| `email` | text | | Email do interessado |
| `telefone` | text | null | Telefone |
| `mensagem` | text | null | Mensagem livre |
| `contratar_show` | boolean | false | Quer contratar show? |
| `reservar_musica` | boolean | false | Quer reservar música? |
| `agendar_reuniao` | boolean | false | Quer agendar reunião? |
| `lido` | boolean | false | Já foi visualizado? |
| `created_at` | timestamp | now() | Data do interesse |

---

## Comandos

```bash
# Push schema changes (migrate)
cd /root/Portal-do-Artista && pnpm --filter @workspace/db run push

# Forçar push (com force)
pnpm --filter @workspace/db run push-force

# Seed dados iniciais (planos, settings)
pnpm --filter @workspace/scripts run seed
```

---

## Relações

```
artists (1) ─── artista_id ─── (N) songs
plans   (1) ─── plano ─────── (N) artists
```

- Um **artista** pode ter muitas **músicas**
- Um **plano** pode ter muitos **artistas**
- **Settings** é uma tabela chave-valor global
