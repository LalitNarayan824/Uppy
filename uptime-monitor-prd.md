# PulseCheck — Mini Uptime Robot Clone

A self-hosted uptime monitoring service that periodically checks the health of web services, tracks response times and incidents, and alerts on status changes. Built to monitor personal projects in production, including an AI YouTube community manager and an LLM guardrails service.

---

## 1. Problem Statement

After shipping backend/AI services to production, there's no visibility into whether they're actually up and healthy. Downtime or degraded performance goes unnoticed until a user reports it (or never gets reported at all). Existing tools like UptimeRobot or Better Stack solve this, but building a scoped-down version from scratch is a better way to demonstrate systems-design thinking — scheduling, concurrency, failure handling, and alerting — than just using a third-party tool.

**Goal:** Build a lightweight uptime monitoring system that periodically pings a set of URLs, records their status and response time, detects incidents (sustained downtime, not single blips), and alerts on status changes — with a dashboard to visualize all of it.

---

## 2. Target User

- Primarily: me, monitoring my own deployed projects (guardrails project, YouTube community manager, and this project itself).
- Secondarily: framed as a general-purpose tool any developer could self-host to monitor a handful of services.

---

## 3. Product Requirements (PRD)

### 3.1 Core Functionality
| Requirement | Description |
|---|---|
| Add/remove monitors | User can register a URL to be monitored, give it a name |
| Periodic health checks | System pings each monitor on a fixed interval |
| Concurrent checking | Multiple monitors are checked in parallel; one slow/hanging site does not block others |
| Timeout handling | A check that doesn't respond within a threshold is treated as a failure |
| Debounced status changes | A monitor is only marked "down" after N consecutive failed checks (avoids false alarms from single blips) |
| Incident logging | Each down→up / up→down transition is recorded with start/end time and duration |
| Alerting | On status change, send a notification (Discord webhook) |
| Uptime metrics | Compute and display uptime % (e.g., 24h / 7d) per monitor |
| Response time history | Track and visualize response time over time per monitor |
| Dashboard | Web UI listing all monitors with current status, uptime %, and response time; detail view per monitor |

### 3.2 Non-Functional Requirements
- Checks for different monitors must run concurrently (not serially).
- The system should tolerate a single failing/slow monitor without degrading overall check throughput.
- Data model should support efficient querying of recent checks and uptime aggregates without unbounded table growth becoming an immediate problem.

### 3.3 Explicitly Out of Scope (v1)
- Multi-user accounts / auth / multi-tenancy
- Per-monitor configurable interval, timeout, or debounce threshold (hardcoded defaults for v1)
- Email notifications (Discord webhook only for v1)
- SSL certificate expiry checks, keyword/content checks, or non-HTTP check types
- Horizontal scaling across multiple worker machines
- AI-specific "smoke test" checks (planned as a v2 feature — see Section 6)

---

## 4. Feature List

### Must-Have (v1 — buildable in 1 week)
1. **Monitor CRUD** — create, list, delete monitors (name + URL)
2. **Scheduled checker** — background job pings each monitor on a fixed interval (hardcoded, e.g. 60s)
3. **Concurrent execution** — job queue processes multiple checks in parallel (hardcoded concurrency, e.g. 10)
4. **Timeout-based failure detection** — hardcoded timeout (e.g. 5–10s)
5. **Debounced incident detection** — hardcoded threshold (e.g. 3 consecutive failures = down)
6. **Incident history** — log of down/up transitions with timestamps and duration
7. **Discord webhook alerts** — fired on status change
8. **Uptime % calculation** — rolling 24h and 7d uptime per monitor
9. **Dashboard — monitor list view** — status badge, uptime %, avg response time
10. **Dashboard — monitor detail view** — response time graph, incident history list
11. **Seed data** — real public URLs + at least one intentionally breakable URL for demo purposes

### Nice-to-Have (v2 — post-week-one)
1. Per-monitor configurable interval, timeout, and failure threshold
2. Email notifications alongside Discord
3. AI-service-aware health checks (see Section 6)
4. WebSocket-based live status updates instead of polling
5. Public status page view

---

## 5. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js + Express | Fast to build, good async/concurrency support |
| Database | Postgres | Relational fit for monitors/checks/incidents; good aggregate queries |
| Job queue | BullMQ (Redis-backed) | Built-in concurrency control, retries, repeatable jobs — avoids hand-rolling a scheduler |
| Frontend | Next.js + Tailwind | Fast to build a clean dashboard |
| Charts | Recharts | Response time graphs |
| Alerts | Discord webhook | Zero setup/deliverability issues compared to email |
| Deployment | Railway or Render | Easy managed Postgres + Redis + Node process |

---

## 6. Post-v1 Narrative: Monitoring My Own Projects

Once the core is working, point real monitors at the live (or staging) endpoints of the other two projects:
- **AI YouTube Community Manager**
- **LLM Guardrails Project**

Then extend with an **AI-aware check type**: instead of just checking HTTP 200, send a real test prompt to the guardrails service and verify it still blocks/allows as expected — a synthetic smoke test rather than a simple ping. This is what turns the project from "generic UptimeRobot clone" into a specific, defensible story:

> "After shipping two AI projects, I had no visibility into whether they were actually healthy in production, so I built a monitoring system — including AI-specific health checks, not just HTTP pings — to watch them."

---

## 7. One-Week Build Plan

### Day 1 — Data model + basic checker
- Postgres schema: `monitors` (id, name, url, created_at), `checks` (id, monitor_id, status, response_time_ms, checked_at), `incidents` (id, monitor_id, started_at, resolved_at)
- Write the core check function: HTTP GET with timeout, capture status code + response time, handle DNS/connection errors distinctly from HTTP error codes
- Manually test against a few real URLs, including a broken one

### Day 2 — Scheduling + concurrency
- Set up BullMQ: repeatable job per monitor (or a scheduler that enqueues due checks on an interval)
- Configure worker concurrency (e.g., 10 parallel checks)
- Persist each check result to the `checks` table

### Day 3 — Incident detection + alerting
- Debounce logic: 3 consecutive failures → mark "down"; 1 success after down → mark "up" (or debounce recovery too, if time allows)
- On status transition, insert/close an `incidents` row and fire a Discord webhook
- Test by toggling a local server on/off

### Day 4 — API layer
- REST endpoints: list monitors, monitor detail + recent checks, incident history, create/delete monitor
- Uptime % query (24h / 7d) from the `checks` table

### Day 5 — Dashboard: list + detail view
- Monitor list page: name, status badge, uptime %, avg response time
- Add/delete monitor form
- Polling refresh (every 10–30s)

### Day 6 — Detail page + graphs
- Per-monitor page: response time line graph (Recharts), incident history list with durations
- This page is the primary demo asset — record/screenshot it

### Day 7 — Polish, deploy, seed, document
- Seed with 5–10 real URLs, including one intentionally breakable one for the live demo
- Write README "Design Decisions" section covering: why BullMQ over cron, why debounced alerts, how concurrency is handled, known v1 limitations (hardcoded config, no auth, Discord-only alerts)
- Deploy to Railway/Render
- Record a short demo video/gif for portfolio use

---

## 8. Interview Talking Points (for later reference)

- **Scheduling at scale**: how checks are dispatched without a single job serializing everything
- **Concurrency**: parallel checks with timeouts so one slow site doesn't block others
- **Debouncing**: avoiding false-positive alerts from single blips
- **Failure recovery** (known limitation, good discussion point): what happens if the scheduler process restarts mid-cycle — risk of missed or duplicate checks, and how you'd fix it (idempotent job IDs, persisted last-checked timestamps)
- **Data growth**: naive per-check row storage vs. aggregating into time buckets for long-term scale
- **Real-world tie-in**: built specifically to monitor two other live projects, including an AI-aware synthetic check beyond simple HTTP pings
