# Multiplayer Word Game

A Kahoot-style, turn-based multiplayer word game. Players place letter/number
tiles onto a shared board; on their turn, a player may instead spend tiles
already on the board to find a valid title from the active category (movies
in v1) for points. The category system is pluggable — see
`packages/shared/src/types/category-plugin.types.ts` and
`apps/api/src/categories/movies` for the reference implementation.

## Stack

- `apps/web` — Next.js 16 / React 19 frontend (shadcn/ui, react-hook-form, zod, zustand)
- `apps/api` — NestJS backend (Prisma/Postgres, Socket.IO), run directly from
  TypeScript via Bun (no separate build step)
- `packages/shared` — Zod schemas, types, enums, and constants shared by both apps
- `packages/ui` — shared shadcn/ui component library

## Prerequisites

- [Bun](https://bun.sh) `>=1.2`
- A local PostgreSQL instance. Create a database once:
  ```bash
  createdb bee_dev
  ```

## First-time setup

```bash
bun install

# apps/api needs a DATABASE_URL — copy and adjust if your Postgres
# username/password/port differ from the default (postgres/password/5432)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

bun --cwd apps/api prisma migrate dev
bun --cwd apps/api prisma db seed   # seeds ~10 fixture movies for local dev
```

## Running

```bash
bun run dev   # starts apps/web on :3000 and apps/api on :4000 via turbo
```

## Importing a real movie dataset

`prisma db seed` only loads small dev fixtures. To import your own dataset
(CSV or JSON with `title` + `releaseYear` columns/fields), re-runnable at any
time:

```bash
bun run --cwd apps/api movies:import -- --file ./my-movies.csv
```

## Adding shadcn/ui components

```bash
bunx shadcn@latest add <component> -c apps/web
```

This places components in `packages/ui/src/components`. Import them from the
`ui` package:

```tsx
import { Button } from "@workspace/ui/components/button"
```
