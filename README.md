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
| Database | PostgreSQL |
| Job Queue | BullMQ (Redis-backed) |
| Frontend | Next.js + Tailwind |
| Charts | Recharts |
| Alerts | Discord webhook + Resend (email) |
| Package Manager | npm |

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pulsecheck.git
   cd pulsecheck
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database, Redis, and Discord webhook URLs
   ```

4. Set up the database:
   ```bash
   psql -U postgres -d pulsecheck -f docs/database-schema.sql
   ```

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

### Railway

1. Create a Railway account
2. Add a new project
3. Add PostgreSQL and Redis services
4. Deploy the API, worker, and web services
5. Set environment variables in Railway dashboard

### Render

1. Create a Render account
2. Create a PostgreSQL database
3. Create a Redis instance
4. Deploy the API, worker, and web as separate services
5. Set environment variables in Render dashboard

## License

MIT
