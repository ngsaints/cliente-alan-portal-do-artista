# 🦕 Guia de Adaptação e Migração para Deno Deploy

Este documento detalha como o **Portal do Artista** foi preparado e adaptado para rodar nativamente no **Deno Deploy** (ou Deno 2 runtime), permitindo uma migração futura simples, rápida e sem atritos.

---

## 🌟 Vantagens da Migração para o Deno Deploy

1. **Zero Cold Start**: Execução distribuída na Edge com inicialização em menos de 10 milissegundos.
2. **Latência Ultrabaixa no Brasil**: Servidores edge espalhados pela América do Sul (São Paulo) e mundialmente.
3. **Execução Direta de TypeScript**: Sem necessidade de etapa manual de transpilação/build no backend.
4. **Custo Reduzido & Alta Escalabilidade**: Capacidade de escalar automaticamente de 0 a milhões de requisições por segundo.
5. **Compatibilidade com Node.js e Express**: O Deno 2 executa nativamente o ecossistema npm, Drizzle ORM, Express e middlewares.

---

## 🏗️ Arquitetura Adaptada

```mermaid
graph TD
    User[Visitante / Artista] --> CDN[Cloudflare / Deno Deploy Edge]
    
    subgraph Deno Deploy Runtime
        CDN --> DenoServer[deno-server.ts / Express]
        DenoServer --> Static[dist: Frontend React SPA]
        DenoServer --> API[Rotas /api Express]
    end
    
    subgraph Armazenamento & Banco Serverless
        API --> Postgres[(PostgreSQL - Neon / Supabase / RDS)]
        API --> Sessions[(Tabela sessions no PostgreSQL)]
        API --> R2[(Cloudflare R2 - Uploads de Áudio e Imagens)]
    end
    
    subgraph Gateways de IA
        API --> OpenRouter[OpenRouter API - Texto e Letras]
        API --> Replicate[Replicate API - MiniMax Music 2.6]
    end
```

---

## 📂 Arquivos Criados e Adaptados

### 1. `deno.json` (Raiz do Projeto)
Configura o ambiente Deno 2 para reconhecer os workspaces do monorepo e definir tasks de execução:

```json
{
  "workspace": [
    "artifacts/api-server",
    "artifacts/alan-ribeiro-catalog",
    "lib/db",
    "lib/api-zod",
    "lib/api-client-react"
  ],
  "nodeModulesDir": "auto",
  "unstable": ["sloppy-imports", "byonm"],
  "imports": {
    "@workspace/db": "./lib/db/src/index.ts",
    "@workspace/db/schema": "./lib/db/src/schema/index.ts",
    "@workspace/api-zod": "./lib/api-zod/src/index.ts"
  },
  "tasks": {
    "start": "deno run -A --unstable-sloppy-imports --unstable-byonm deno-server.ts",
    "dev": "deno run -A --watch --unstable-sloppy-imports --unstable-byonm deno-server.ts",
    "api": "deno run -A --unstable-sloppy-imports --unstable-byonm artifacts/api-server/src/index.ts"
  }
}
```

### 2. `deno-server.ts` (Entrypoint Unificado para o Deno Deploy)
Ponto de entrada único que:
- Detecta a variável `PORT` (padrão 8000 no Deno Deploy ou 3000 em ambiente Node).
- Inicializa o app Express com todas as rotas e rotinas de fundo.
- Serve os arquivos estáticos compilados do frontend (`artifacts/alan-ribeiro-catalog/dist`) com fallback SPA para navegação client-side.
- Identifica quando está rodando no Deno Deploy via `DENO_DEPLOYMENT_ID` e `DENO_REGION`.

### 3. `artifacts/api-server/src/index.ts`
Adaptado para não falhar caso a variável `PORT` não esteja explicitamente definida, adotando fallback inteligente para porta 8000 no Deno ou 3000 em Node.

---

## 💾 Persistência de Dados e Sessões no Edge

Ambientes Edge / Serverless como o Deno Deploy não possuem sistema de arquivos local persistente. O projeto já está 100% alinhado com essa premissa:

| Recurso | Estratégia Atual | Como funciona no Deno Deploy |
|---|---|---|
| **Sessões de Usuário** | `connect-pg-simple` no PostgreSQL ou Turso | As sessões são gravadas na tabela `sessions` (PostgreSQL ou Turso DB), funcionando de forma distribuída em qualquer edge instance. |
| **Uploads (Áudio / Imagens)** | Cloudflare R2 | O arquivo `artifacts/api-server/src/lib/r2-storage.ts` envia os arquivos diretamente para o bucket Cloudflare R2, sem depender de disco local. |
| **Banco de Dados** | Drizzle ORM + PostgreSQL ou **Turso DB** | Conexão pool via `DATABASE_URL` (Neon / Supabase) ou conexão edge nativa ultra-rápida via **Turso DB** (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`). Veja o guia detalhado em [`docs/turso-db-migration.md`](./turso-db-migration.md). |

---

## 🔑 Variáveis de Ambiente no Deno Deploy

Ao criar o projeto no painel do **Deno Deploy** (Settings → Environment Variables), configure as seguintes variáveis:

### Banco de Dados & Sessão
- `DATABASE_URL`: `postgres://user:pass@host:5432/dbname?sslmode=require` (caso use PostgreSQL)
- **OU (Recomendado para Edge):**
  - `TURSO_DATABASE_URL`: `libsql://portal-do-artista-seuuser.turso.io`
  - `TURSO_AUTH_TOKEN`: Token JWT gerado no Turso CLI
- `SESSION_SECRET`: Chave secreta longa para criptografia de cookies

### Cloudflare R2 (Armazenamento de Músicas e Capas)
- `R2_ACCOUNT_ID`: ID da conta Cloudflare
- `R2_ACCESS_KEY_ID`: Chave de acesso R2
- `R2_SECRET_ACCESS_KEY`: Chave secreta R2
- `R2_BUCKET_NAME`: Nome do bucket R2
- `R2_PUBLIC_URL`: URL pública CDN do bucket (ex: `https://pub-xxx.r2.dev` ou domínio customizado)

### Gateways de IA (Vivi Studio)
- `OPENROUTER_API_KEY`: Chave de API do OpenRouter (para texto e refino de letras)
- `REPLICATE_API_TOKEN`: Token de autenticação da Replicate (para MiniMax Music 2.6)

### Pagamentos Asaas
- `ASAAS_API_KEY`: Chave de API do Asaas
- `ASAAS_ENVIRONMENT`: `production` ou `sandbox`

---

## 🚀 Como Fazer o Deploy no Deno Deploy

### Passo 1: Build do Frontend (Vite)
Antes do deploy ou em uma GitHub Action de CI/CD:
```bash
pnpm --filter @workspace/alan-ribeiro-catalog build
```
Os arquivos gerados ficarão em `artifacts/alan-ribeiro-catalog/dist`.

### Passo 2: Conectar no Deno Deploy
1. Acesse [dash.deno.com](https://dash.deno.com).
2. Clique em **"New Project"** → **"Deploy from GitHub"**.
3. Selecione o repositório `ngsaints/cliente-alan-portal-do-artista`.
4. Escolha o branch: `main`.
5. Em **Entrypoint file**, informe: `deno-server.ts`.
6. Adicione as variáveis de ambiente na aba **Settings** → **Environment Variables**.
7. Clique em **Deploy Project**!

---

## 🧪 Testando Localmente com Deno

Para rodar o projeto localmente utilizando o runtime Deno 2:

```powershell
# Iniciar o servidor completo via Deno
deno task start

# Modo desenvolvimento com recarregamento automático (watch)
deno task dev
```
