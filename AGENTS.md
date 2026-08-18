# Uppy — Agent Instructions

## Project Overview

Self-hosted uptime monitoring service. Checks web services periodically, tracks response times, detects incidents, alerts via Discord + email (Resend).

**Status:** Documentation/planning phase — no code yet. Follow `docs/implementation.md` to build.

## Tech Stack (Decided)

- **Language:** TypeScript (strict mode)
- **Backend:** Express.js
- **ORM:** Drizzle (not Prisma)
- **Database:** PostgreSQL
- **Job Queue:** BullMQ (Redis-backed)
- **Frontend:** Next.js + Tailwind + Recharts
- **Auth:** JWT (7-day expiry, no refresh tokens in v1)
- **Alerts:** Discord webhook + Resend email
- **Package Manager:** npm

## Architecture

Three separate processes — not a monolith:

1. **API Server** (`src/api/`) — Express, port 3001
2. **Worker** (`src/worker/`) — BullMQ, runs health checks
3. **Web** (`src/web/`) — Next.js dashboard, port 3000

All three need to run simultaneously in dev. Worker depends on Redis; API depends on Postgres.

## Dev Commands (Planned)

```bash
npm run dev:api      # Express API (tsx watch)
npm run dev:worker   # BullMQ worker (tsx watch)
npm run dev:web      # Next.js (cd src/web && npm run dev)
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to database
npm run db:studio    # Drizzle Studio GUI
```

## Flat Structure

Single repo, no Turborepo. `src/web` has its own `package.json` (created by `create-next-app`).

## Key Config

- `.env` required — copy from `.env.example`
- `drizzle.config.ts` at root — points to `src/api/db/schema.ts`
- `tsconfig.json` at root — strict mode, ES2022 target, commonjs modules

## Database

Four tables: `users`, `monitors`, `checks`, `incidents`. Schema in `docs/database-schema.sql` and `src/api/db/schema.ts`. UUIDs primary keys, cascading deletes on user removal.

## Auth Pattern

JWT in `Authorization: Bearer <token>` header. Middleware extracts `userId`, attaches to request. All monitor routes are user-scoped (query by `userId`).

## Worker Pattern

BullMQ repeatable job every 60s. Fetches all monitors, checks concurrently (limit 10), records results. 3 consecutive failures = incident + alert. Recovery resolves incident + alert.

## Docs Location

- `docs/api-spec.yaml` — OpenAPI 3.0 spec
- `docs/architecture.md` — System diagrams
- `docs/database-schema.sql` — SQL schema
- `docs/implementation.md` — Step-by-step build plan (start here)
