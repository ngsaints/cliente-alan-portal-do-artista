# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **File uploads**: multer (covers stored in `uploads/covers/`, audio in `uploads/audio/`)
- **Sessions**: express-session (for admin auth)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── alan-ribeiro-catalog/ # React music catalog frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Features

### Music Catalog (Alan Ribeiro)
- Public catalog page with dark theme + gold accents
- Genre filter tabs (Sertanejo, Pop, Rock, MPB, Acústico)
- Song cards with cover image, title, description, genre badge
- Fixed bottom audio player — click "Tocar Música" to play any song
- Admin panel at `/admin`

### Admin Panel
- Fixed credentials: `admin` / `1234`
- Add songs: title, description, genre, cover image (upload), MP3 (upload)
- Delete songs with confirmation
- Session-based authentication (express-session)
- Uploads stored in `artifacts/api-server/uploads/`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/songs | List songs (optionally filter by genre) |
| POST | /api/songs | Add song (multipart, admin only) |
| DELETE | /api/songs/:id | Delete song (admin only) |
| POST | /api/auth/login | Login with usuario/senha |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/status | Check login status |
| GET | /api/uploads/covers/* | Serve cover images |
| GET | /api/uploads/audio/* | Serve audio files |

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/alan-ribeiro-catalog` (`@workspace/alan-ribeiro-catalog`)
React + Vite frontend. Served at `/`.

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. Served at `/api`.
- Entry: `src/index.ts`
- App: `src/app.ts` — CORS, JSON, session, static uploads, routes
- Routes: `src/routes/auth.ts`, `src/routes/songs.ts`, `src/routes/health.ts`
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL.
- Schema: `src/schema/songs.ts` — songs table
- Push: `pnpm --filter @workspace/db run push`

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec + Orval codegen config.
- Run codegen: `pnpm --filter @workspace/api-spec run codegen`
