# Uppy

A self-hosted uptime monitoring service that periodically checks the health of web services, tracks response times and incidents, and alerts on status changes.

## Features

- **Monitor CRUD** — Create, edit, list, and delete monitors
- **Periodic health checks** — Background job pings each monitor every 5 minutes
- **Concurrent execution** — Multiple monitors checked in parallel (10 concurrent)
- **Timeout-based failure detection** — 5s timeout per check
- **Debounced incident detection** — 3 consecutive failures = down (avoids false alarms)
- **Incident history** — Log of down/up transitions with timestamps and duration
- **Discord + email alerts** — Discord webhook and SMTP email on status change
- **Uptime % calculation** — Rolling 24h and 7d uptime per monitor
- **Response time history** — Area chart with failure markers
- **60-check sparkline** — Visual per-monitor bar strip showing recent check history
- **Flight-board dashboard** — Status banner, instrument panels, pulsing LED indicators
- **Multi-user** — JWT authentication, user-scoped monitors

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript |
| Backend | Node.js + Express |
| ORM | Drizzle |
| Database | PostgreSQL (Neon) |
| Job Queue | BullMQ + Redis (Upstash) |
| Frontend | Next.js + Tailwind |
| Charts | Recharts |
| Alerts | Discord webhook + SMTP (email) |
| Package Manager | npm |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │ Login / Reg│  │ Dashboard  │  │ Monitor Detail         │ │
│  │ (auth)     │  │ (board UI) │  │ (chart, incidents)     │ │
│  └─────┬──────┘  └─────┬──────┘  └───────────┬────────────┘ │
└────────┼───────────────┼──────────────────────┼──────────────┘
         │               │  fetch + JWT         │
         ▼               ▼                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    EXPRESS API  (port 3001)                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  auth/*    monitors    checks    incidents    uptime   │  │
│  └────────────────────────────────────────────────────────┘  │
│         │                        │                            │
│         ▼                        ▼                            │
│  ┌─────────────┐          ┌─────────────┐                    │
│  │  POSTGRES   │          │    REDIS    │                    │
│  │  (Neon)     │          │  (Upstash)  │                    │
│  │  users      │          │  BullMQ     │                    │
│  │  monitors   │          │  job state  │                    │
│  │  checks     │          │             │                    │
│  │  incidents  │          └──────┬──────┘                    │
│  └─────────────┘                 │                            │
└──────────────────────────────────┼────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                  BULLMQ WORKER                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Fetch all monitors  →  HTTP check (5s timeout)       │  │
│  │  10 concurrent  →  Record results  →  Detect incidents│  │
│  └────────────────────────────────────────────────────────┘  │
│         │                                                     │
│         ▼                                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              EXTERNAL SERVICES                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │  Monitored  │  │  Monitored  │  │  Monitored │  │  │
│  │  │  Service A  │  │  Service B  │  │  Service C │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │        DISCORD WEBHOOK  +  SMTP EMAIL            │  │  │
│  │  │     Alerts on down / up transitions               │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Three separate processes:**
1. **Next.js Dashboard** — user-facing UI, port 3000
2. **Express API** — REST endpoints, port 3001
3. **BullMQ Worker** — background health checks, no port

All three must run simultaneously in development.

## Quick Start

### Prerequisites

- Node.js 18+
- Neon account (free tier) — PostgreSQL database
- Upstash account (free tier) — Redis for BullMQ
- Discord server (optional) — for webhook alerts
- SMTP provider (optional) — Gmail, Outlook, SendGrid, etc. for email alerts

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/uppy.git
   cd uppy
   ```

2. Install dependencies (root + web):
   ```bash
   npm install
   cd src/web && npm install && cd ../..
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env (see Environment Variables below)
   ```

4. Set up the database:
   - Create a Neon project at neon.tech
   - Copy the **direct** connection string (non-pooled) to `.env` as `DATABASE_URL`
   - Run: `npm run db:push`

5. Set up alerts (optional):
   - **Discord:** Server Settings → Integrations → Webhooks → New Webhook → Copy URL → paste as `DISCORD_WEBHOOK_URL`
   - **Email (SMTP):** Configure SMTP credentials in `.env`:
     - **Gmail:** Enable 2FA → App Passwords → "Mail" → "Other" → name "Uppy" → paste 16-char code as `SMTP_PASS`
     - **Other providers:** Use their SMTP host/port/user/pass
     - Required vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

6. Start the development servers (all three must run simultaneously):
   ```bash
   # Terminal 1: API server (port 3001)
   npm run dev:api

   # Terminal 2: Worker (BullMQ health checks)
   npm run dev:worker

   # Terminal 3: Dashboard (port 3000)
   npm run dev:web
   ```

7. Open http://localhost:3000 in your browser

> **Note:** `tsx watch` does not reload on `.env` changes. Restart the API/worker after editing `.env`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and get JWT token |
| GET | /api/auth/me | Get current user |
| GET | /api/monitors | List user's monitors |
| POST | /api/monitors | Create a new monitor |
| GET | /api/monitors/:id | Get monitor details |
| PUT | /api/monitors/:id | Update monitor name/URL |
| DELETE | /api/monitors/:id | Delete a monitor |
| GET | /api/monitors/:id/checks | Get recent checks |
| GET | /api/monitors/:id/incidents | Get incident history |
| GET | /api/monitors/:id/uptime | Get uptime statistics |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | - |
| REDIS_URL | Redis connection string | - |
| JWT_SECRET | Secret for JWT signing | - |
| DISCORD_WEBHOOK_URL | Discord webhook for alerts | - |
| SMTP_HOST | SMTP server host (e.g., smtp.gmail.com) | - |
| SMTP_PORT | SMTP server port (587 for STARTTLS, 465 for SSL) | - |
| SMTP_USER | SMTP username/email | - |
| SMTP_PASS | SMTP password/app password | - |
| SMTP_FROM | Sender email address | - |
| CHECK_INTERVAL_MS | Check interval in ms | 300000 |
| CHECK_TIMEOUT_MS | Timeout per check in ms | 5000 |
| FAILURE_THRESHOLD | Consecutive failures before alert | 3 |
| CONCURRENT_CHECKS | Max parallel checks | 10 |
| PORT | API server port | 3001 |

## Project Structure

```
Uppy/
├── docs/
│   ├── architecture.md        # System overview + data flow
│   ├── api-spec.yaml          # OpenAPI specification
│   ├── database-schema.sql    # PostgreSQL schema
│   └── implementation.md      # Step-by-step build plan
├── src/
│   ├── api/                   # Express backend
│   │   ├── db/
│   │   │   ├── index.ts       # Drizzle client + dotenv config
│   │   │   └── schema.ts      # Table definitions (users, monitors, checks, incidents)
│   │   ├── middleware/
│   │   │   └── auth.ts        # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.ts        # POST register, login; GET me
│   │   │   ├── monitors.ts    # CRUD + PUT edit
│   │   │   ├── checks.ts      # GET /monitors/:id/checks
│   │   │   ├── incidents.ts   # GET /monitors/:id/incidents
│   │   │   └── uptime.ts      # GET /monitors/:id/uptime
│   │   └── index.ts           # Express app, CORS, BullMQ scheduler
│   ├── worker/                # BullMQ worker
│   │   ├── index.ts           # Worker process + check loop
│   │   ├── queue.ts           # Redis connection + queue setup
│   │   ├── checker.ts         # HTTP check with timeout
│   │   └── alerter.ts         # Discord webhook + SMTP email
│   └── web/                   # Next.js dashboard (separate package.json)
│       └── src/
│           ├── app/
│           │   ├── layout.tsx        # Root layout (Chakra Plex + IBM Plex fonts)
│           │   ├── page.tsx          # Dashboard — status banner + board
│           │   ├── globals.css       # Tailwind v4 theme tokens + LED pulse
│           │   ├── login/page.tsx    # Sign-in
│           │   ├── register/page.tsx # Create account
│           │   └── monitors/[id]/page.tsx  # Monitor detail
│           ├── components/
│           │   ├── AddMonitorForm.tsx
│           │   ├── EditMonitorForm.tsx
│           │   ├── MonitorCard.tsx   # Board row + sparkline
│           │   ├── MonitorDetail.tsx # Detail view orchestrator
│           │   ├── ResponseTimeChart.tsx  # Area + failure chart
│           │   └── IncidentList.tsx  # Timeline
│           └── lib/
│               └── api.ts           # Typed fetch wrapper + token management
├── drizzle/                   # Generated migration files
├── drizzle.config.ts
├── package.json               # Root — API + worker scripts
├── tsconfig.json              # Strict mode, excludes src/web
├── .env.example
└── README.md
```

## Deployment

### Architecture

| Service | What runs | Why |
|---------|-----------|-----|
| **Vercel** | Next.js Frontend | Best DX for Next.js, free |
| **Render** | Express API + BullMQ Worker | Free tier, persistent server |
| **Neon** | PostgreSQL | Free tier, serverless |
| **Upstash** | Redis | Free tier, serverless |

**Total cost:** $0 (all free tiers)

### Why This Architecture

- **Vercel** is perfect for Next.js (auto-deploys, previews, edge functions)
- **Render** runs persistent Node.js servers (API + Worker) — needed for BullMQ
- **Neon + Upstash** are serverless (no local database/Redis needed)
- **No credit card required** for any service

### Deploy Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/uppy.git
   git push -u origin main
   ```

2. **Deploy Frontend (Vercel)**
   - Go to vercel.com → Import Git Repository
   - Select your GitHub repo
   - Framework Preset: Next.js
   - Root Directory: `src/web`
   - Add environment variables (from .env.example)
   - Deploy

3. **Deploy API + Worker (Render)**
   - Go to render.com → New Web Service
   - Connect GitHub repo
   - Name: `uppy-api`
   - Runtime: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:api`
   - Add environment variables
   - Deploy

4. **Set up Neon**
   - Go to neon.tech → Create project
   - Copy connection string to .env
   - Run `npm run db:push` locally to create tables

5. **Set up Upstash**
   - Go to upstash.com → Create Redis database
   - Copy URL to .env

6. **Run Seed Script** (optional)
   - After deploy, run seed script to populate demo data

## License

MIT
