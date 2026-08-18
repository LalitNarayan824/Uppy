# Uppy

A self-hosted uptime monitoring service that periodically checks the health of web services, tracks response times and incidents, and alerts on status changes.

## Features

- **Monitor CRUD** — Create, list, delete monitors
- **Periodic health checks** — Background job pings each monitor every 60s
- **Concurrent execution** — Multiple monitors checked in parallel (10 concurrent)
- **Timeout-based failure detection** — 5s timeout per check
- **Debounced incident detection** — 3 consecutive failures = down (avoids false alarms)
- **Incident history** — Log of down/up transitions with timestamps
- **Discord webhook alerts** — Fired on status change
- **Uptime % calculation** — Rolling 24h and 7d uptime per monitor
- **Response time history** — Track and visualize response time over time
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
| Alerts | Discord webhook + Resend (email) |
| Package Manager | npm |

## Quick Start

### Prerequisites

- Node.js 18+
- Neon account (free tier)
- Upstash account (free tier)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/uppy.git
   cd uppy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Neon database URL, Upstash Redis URL, etc.
   ```

4. Set up the database:
   - Create a Neon account at neon.tech
   - Create a new project
   - Copy the connection string to .env
   - Run: `npm run db:push`

5. Start the development servers:
   ```bash
   # Terminal 1: API server
   npm run dev:api

   # Terminal 2: Worker
   npm run dev:worker

   # Terminal 3: Dashboard
   npm run dev:web
   ```

6. Open http://localhost:3000 in your browser

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and get JWT token |
| GET | /api/auth/me | Get current user |
| GET | /api/monitors | List user's monitors |
| POST | /api/monitors | Create a new monitor |
| GET | /api/monitors/:id | Get monitor details |
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
| RESEND_API_KEY | Resend API key for email alerts | - |
| EMAIL_FROM | Sender email address | - |
| CHECK_INTERVAL_MS | Check interval in ms | 60000 |
| CHECK_TIMEOUT_MS | Timeout per check in ms | 5000 |
| FAILURE_THRESHOLD | Consecutive failures before alert | 3 |
| CONCURRENT_CHECKS | Max parallel checks | 10 |
| PORT | API server port | 3001 |

## Project Structure

```
Uppy/
├── docs/
│   ├── architecture.md        # System overview
│   ├── api-spec.yaml          # OpenAPI specification
│   ├── database-schema.sql    # PostgreSQL schema
│   └── implementation.md      # Detailed build plan
├── src/
│   ├── api/                   # Express backend (TypeScript)
│   │   ├── db/                # Drizzle schema + connection
│   │   ├── routes/            # API routes
│   │   └── middleware/        # Auth middleware
│   ├── worker/                # BullMQ worker (TypeScript)
│   └── web/                   # Next.js dashboard
├── drizzle/                   # Migration files
├── drizzle.config.ts
├── package.json
├── tsconfig.json
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
