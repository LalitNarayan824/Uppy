# Uppy Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Browser    │    │   Browser    │    │   Browser    │       │
│  │  (User A)    │    │  (User B)    │    │  (User C)    │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS DASHBOARD                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  - Login / Register pages                               │    │
│  │  - Monitor list (status, uptime, response time)         │    │
│  │  - Monitor detail (response time graph, incidents)      │    │
│  │  - Add / Delete monitor forms                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              │ API calls (fetch + JWT)           │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       EXPRESS API                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Routes:                                                 │    │
│  │  - POST /api/auth/register                              │    │
│  │  - POST /api/auth/login                                 │    │
│  │  - GET  /api/auth/me                                    │    │
│  │  - GET  /api/monitors                                   │    │
│  │  - POST /api/monitors                                   │    │
│  │  - GET  /api/monitors/:id                               │    │
│  │  - DELETE /api/monitors/:id                             │    │
│  │  - GET  /api/monitors/:id/checks                        │    │
│  │  - GET  /api/monitors/:id/incidents                     │    │
│  │  - GET  /api/monitors/:id/uptime                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              ▼                               ▼                  │
│  ┌───────────────────┐           ┌───────────────────┐          │
│  │     POSTGRES      │           │      REDIS        │          │
│  │                   │           │                   │          │
│  │  - users          │           │  - BullMQ queue   │          │
│  │  - monitors       │           │  - Job state      │          │
│  │  - checks         │           │                   │          │
│  │  - incidents      │           │                   │          │
│  └───────────────────┘           └─────────┬─────────┘          │
│                                            │                     │
└────────────────────────────────────────────┼─────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BULLMQ WORKER                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  - Polls monitors on interval (60s)                      │    │
│  │  - Executes HTTP checks concurrently (10 parallel)       │    │
│  │  - Records results to checks table                       │    │
│  │  - Detects incidents (3 consecutive failures)            │    │
│  │  - Fires Discord webhook on status change                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   EXTERNAL SERVICES                      │    │
│  │                                                          │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │    │
│  │  │  Monitored  │    │  Monitored  │    │  Monitored │ │    │
│  │  │  Service A  │    │  Service B  │    │  Service C │ │    │
│  │  └──────────────┘    └──────────────┘    └────────────┘ │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │           DISCORD WEBHOOK + EMAIL (Resend)        │   │    │
│  │  │    Sends alerts on up→down / down→up transitions  │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Health Check Flow
```
1. BullMQ scheduler triggers job every 60s
2. Worker fetches due monitors from database
3. Worker executes HTTP GET with 5s timeout (10 concurrent)
4. Results written to checks table
5. If 3 consecutive failures → incident created → Discord alert
6. If recovery after down → incident resolved → Discord alert
```

### Auth Flow
```
1. User registers: POST /api/auth/register
   → bcrypt hash password → store in users table → return user

2. User logs in: POST /api/auth/login
   → verify credentials → generate JWT (7 day expiry) → return token

3. User accesses protected route:
   → send Authorization: Bearer <token> header
   → verify JWT → attach user to request
   → query only that user's monitors
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **TypeScript** | Type safety, better DX, portfolio showcase |
| **Drizzle ORM** | Lightweight, SQL-like API, type-safe queries |
| **Flat structure** | Simple, no monorepo overhead for v1 |
| **JWT over sessions** | Stateless, simple for API, no server-side session store needed |
| **BullMQ over cron** | Built-in concurrency control, retries, job state, Redis-backed |
| **Debounced alerts** | Avoids false positives from single blips (3 consecutive failures) |
| **Discord + Email alerts** | Discord for instant notifications, Resend for email alerts |
| **User-scoped monitors** | Each user sees only their own monitors (user_id FK) |
| **Cascading deletes** | Deleting user removes their monitors, checks, and incidents |

## Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Next.js Dashboard** | UI rendering, auth state, API calls |
| **Express API** | Request validation, auth middleware, CRUD operations |
| **BullMQ Worker** | Background job processing, HTTP checks, alerting |
| **Postgres** | Persistent storage for users, monitors, checks, incidents |
| **Redis** | Job queue backing, temporary state |
