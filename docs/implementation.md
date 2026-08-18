# Uppy Implementation Plan

## Overview

Step-by-step guide to building Uppy from scratch. Each phase includes specific files, code patterns, and verification steps.

**Tech Stack:** TypeScript, Drizzle, Express, BullMQ, Next.js, npm

**Estimated Time:** 3-4 hours

---

## Phase 1: Project Setup

### Step 1.1: Initialize npm project

```bash
cd B:\MyProjects\Uppy
npm init -y
```

Edit `package.json`:
```json
{
  "name": "uppy",
  "version": "1.0.0",
  "scripts": {
    "dev:api": "tsx watch src/api/index.ts",
    "dev:worker": "tsx watch src/worker/index.ts",
    "dev:web": "cd src/web && npm run dev",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### Step 1.2: Install dependencies

```bash
# Backend
npm install express bcrypt jsonwebtoken dotenv drizzle-orm postgres bullmq ioredis resend uuid

# Dev dependencies
npm install -D typescript @types/express @types/bcrypt @types/jsonwebtoken @types/uuid tsx drizzle-kit
```

### Step 1.3: Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 1.4: Create directory structure

```bash
mkdir -p src/api/db src/api/routes src/api/middleware src/worker drizzle
```

### Step 1.5: Create .env

```bash
cp .env.example .env
# Edit .env with actual values
```

**Required services (free tier):**
- **Neon** (PostgreSQL): Sign up at neon.tech, create project, copy connection string
- **Upstash** (Redis): Sign up at upstash.com, create Redis database, copy URL
- **Discord** (optional): Create webhook in server settings
- **Resend** (optional): Sign up at resend.com for email alerts

### Verification

- [ ] `npm init -y` completes
- [ ] Dependencies installed without errors
- [ ] Directory structure created
- [ ] `.env` file exists with values

---

## Phase 2: Database (Drizzle)

### Step 2.1: Create Drizzle config — `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/api/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Step 2.2: Create schema — `src/api/db/schema.ts`

```typescript
import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const monitors = pgTable('monitors', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const checks = pgTable('checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  monitorId: uuid('monitor_id').references(() => monitors.id, { onDelete: 'cascade' }).notNull(),
  statusCode: integer('status_code'),
  responseTimeMs: integer('response_time_ms'),
  isFailure: boolean('is_failure').default(false).notNull(),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
});

export const incidents = pgTable('incidents', {
  id: uuid('id').defaultRandom().primaryKey(),
  monitorId: uuid('monitor_id').references(() => monitors.id, { onDelete: 'cascade' }).notNull(),
  startedAt: timestamp('started_at').notNull(),
  resolvedAt: timestamp('resolved_at'),
  cause: text('cause'),
});
```

### Step 2.3: Create database connection — `src/api/db/index.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

### Step 2.4: Generate and push migrations

```bash
npm run db:generate
npm run db:push
```

### Verification

- [ ] `drizzle.config.ts` exists
- [ ] `src/api/db/schema.ts` has all 4 tables
- [ ] `src/api/db/index.ts` exports `db`
- [ ] `drizzle/` folder has migration files
- [ ] Database tables created

---

## Phase 3: API Server (Express)

### Step 3.1: Create entry point — `src/api/index.ts`

```typescript
import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import monitorRoutes from './routes/monitors';
import checkRoutes from './routes/checks';
import incidentRoutes from './routes/incidents';
import uptimeRoutes from './routes/uptime';

dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/monitors', checkRoutes);
app.use('/api/monitors', incidentRoutes);
app.use('/api/monitors', uptimeRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
```

### Step 3.2: Create auth middleware — `src/api/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Step 3.3: Create auth routes — `src/api/routes/auth.ts`

```typescript
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// Register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const existingUser = await db.select().from(users).where(eq(users.email, email));
  if (existingUser.length > 0) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(users).values({ email, passwordHash }).returning();
  
  res.status(201).json({ user: { id: user.id, email: user.email } });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email } });
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.userId!));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, email: user.email });
});

export default router;
```

### Step 3.4: Create monitor routes — `src/api/routes/monitors.ts`

```typescript
import { Router } from 'express';
import { db } from '../db';
import { monitors } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// List user's monitors
router.get('/', authenticate, async (req: AuthRequest, res) => {
  const userMonitors = await db.select().from(monitors).where(eq(monitors.userId, req.userId!));
  res.json(userMonitors);
});

// Create monitor
router.post('/', authenticate, async (req: AuthRequest, res) => {
  const { name, url } = req.body;
  
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL required' });
  }

  const [monitor] = await db.insert(monitors).values({
    userId: req.userId!,
    name,
    url,
  }).returning();
  
  res.status(201).json(monitor);
});

// Get monitor by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const [monitor] = await db.select().from(monitors).where(
    and(eq(monitors.id, req.params.id), eq(monitors.userId, req.userId!))
  );
  
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }
  
  res.json(monitor);
});

// Delete monitor
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const [monitor] = await db.select().from(monitors).where(
    and(eq(monitors.id, req.params.id), eq(monitors.userId, req.userId!))
  );
  
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  await db.delete(monitors).where(eq(monitors.id, req.params.id));
  res.status(204).send();
});

export default router;
```

### Step 3.5: Create check routes — `src/api/routes/checks.ts`

```typescript
import { Router } from 'express';
import { db } from '../db';
import { checks, monitors } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get checks for a monitor
router.get('/:id/checks', authenticate, async (req: AuthRequest, res) => {
  const [monitor] = await db.select().from(monitors).where(
    and(eq(monitors.id, req.params.id), eq(monitors.userId, req.userId!))
  );
  
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const monitorChecks = await db.select().from(checks)
    .where(eq(checks.monitorId, req.params.id))
    .orderBy(desc(checks.checkedAt))
    .limit(limit)
    .offset(offset);
  
  res.json(monitorChecks);
});

export default router;
```

### Step 3.6: Create incident routes — `src/api/routes/incidents.ts`

```typescript
import { Router } from 'express';
import { db } from '../db';
import { incidents, monitors } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get incidents for a monitor
router.get('/:id/incidents', authenticate, async (req: AuthRequest, res) => {
  const [monitor] = await db.select().from(monitors).where(
    and(eq(monitors.id, req.params.id), eq(monitors.userId, req.userId!))
  );
  
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  const limit = parseInt(req.query.limit as string) || 50;

  const monitorIncidents = await db.select().from(incidents)
    .where(eq(incidents.monitorId, req.params.id))
    .orderBy(desc(incidents.startedAt))
    .limit(limit);
  
  res.json(monitorIncidents);
});

export default router;
```

### Step 3.7: Create uptime routes — `src/api/routes/uptime.ts`

```typescript
import { Router } from 'express';
import { db } from '../db';
import { checks, monitors } from '../db/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get uptime stats for a monitor
router.get('/:id/uptime', authenticate, async (req: AuthRequest, res) => {
  const [monitor] = await db.select().from(monitors).where(
    and(eq(monitors.id, req.params.id), eq(monitors.userId, req.userId!))
  );
  
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  const now = new Date();
  const periods = [
    { label: '24h', hours: 24 },
    { label: '7d', hours: 24 * 7 },
  ];

  const stats = await Promise.all(
    periods.map(async (period) => {
      const since = new Date(now.getTime() - period.hours * 60 * 60 * 1000);
      
      const totalChecks = await db.select({ count: count() })
        .from(checks)
        .where(and(
          eq(checks.monitorId, req.params.id),
          gte(checks.checkedAt, since)
        ));
      
      const failedChecks = await db.select({ count: count() })
        .from(checks)
        .where(and(
          eq(checks.monitorId, req.params.id),
          eq(checks.isFailure, true),
          gte(checks.checkedAt, since)
        ));
      
      const total = totalChecks[0]?.count || 0;
      const failed = failedChecks[0]?.count || 0;
      const uptimePercent = total > 0 ? ((total - failed) / total) * 100 : 100;
      
      return {
        period: period.label,
        uptimePercent: Math.round(uptimePercent * 100) / 100,
        totalChecks: total,
        failedChecks: failed,
      };
    })
  );
  
  res.json(stats);
});

export default router;
```

### Verification

- [ ] API server starts on port 3001
- [ ] POST /api/auth/register creates user
- [ ] POST /api/auth/login returns JWT
- [ ] GET /api/auth/me returns current user
- [ ] CRUD operations work for monitors
- [ ] Checks, incidents, uptime endpoints respond

---

## Phase 4: Worker (BullMQ)

### Step 4.1: Create queue — `src/worker/queue.ts`

```typescript
import { Queue } from 'bullmq';

export const healthCheckQueue = new Queue('health-checks', {
  connection: {
    host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'localhost',
    port: parseInt(process.env.REDIS_URL?.split(':')[2] || '6379'),
  },
});
```

### Step 4.2: Create checker — `src/worker/checker.ts`

```typescript
export interface CheckResult {
  statusCode: number | null;
  responseTimeMs: number;
  isFailure: boolean;
  error?: string;
}

export async function performCheck(url: string, timeoutMs: number): Promise<CheckResult> {
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    const responseTimeMs = Date.now() - start;
    
    return {
      statusCode: response.status,
      responseTimeMs,
      isFailure: response.status >= 400,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    
    return {
      statusCode: null,
      responseTimeMs,
      isFailure: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Step 4.3: Create alerter — `src/worker/alerter.ts`

```typescript
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendDiscordAlert(monitorName: string, status: 'down' | 'up', url: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const color = status === 'down' ? 0xff0000 : 0x00ff00;
  const emoji = status === 'down' ? '🔴' : '🟢';
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `${emoji} Monitor ${status === 'down' ? 'Down' : 'Up'}`,
        description: `**${monitorName}** is now ${status}`,
        color,
        fields: [
          { name: 'URL', value: url, inline: true },
          { name: 'Time', value: new Date().toISOString(), inline: true },
        ],
      }],
    }),
  });
}

export async function sendEmailAlert(
  monitorName: string,
  status: 'down' | 'up',
  url: string,
  recipientEmail: string
) {
  if (!resend || !process.env.EMAIL_FROM) return;

  const emoji = status === 'down' ? '🔴' : '🟢';
  const subject = `${emoji} ${monitorName} is ${status === 'down' ? 'Down' : 'Back Up'}`;
  
  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: recipientEmail,
    subject,
    html: `
      <h2>${monitorName} is ${status === 'down' ? 'Down' : 'Back Up'}</h2>
      <p><strong>URL:</strong> ${url}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    `,
  });
}
```

### Step 4.4: Create worker — `src/worker/index.ts`

```typescript
import { Worker } from 'bullmq';
import { db } from '../api/db';
import { monitors, checks, incidents } from '../api/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { performCheck } from './checker';
import { sendDiscordAlert, sendEmailAlert } from './alerter';
import dotenv from 'dotenv';

dotenv.config();

const connection = {
  host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'localhost',
  port: parseInt(process.env.REDIS_URL?.split(':')[2] || '6379'),
};

const TIMEOUT_MS = parseInt(process.env.CHECK_TIMEOUT_MS || '5000');
const FAILURE_THRESHOLD = parseInt(process.env.FAILURE_THRESHOLD || '3');

const worker = new Worker('health-checks', async (job) => {
  const allMonitors = await db.select().from(monitors);
  
  const concurrency = parseInt(process.env.CONCURRENT_CHECKS || '10');
  const chunks = [];
  for (let i = 0; i < allMonitors.length; i += concurrency) {
    chunks.push(allMonitors.slice(i, i + concurrency));
  }
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (monitor) => {
      const result = await performCheck(monitor.url, TIMEOUT_MS);
      
      await db.insert(checks).values({
        monitorId: monitor.id,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        isFailure: result.isFailure,
      });
      
      // Check for incident detection
      const recentChecks = await db.select().from(checks)
        .where(eq(checks.monitorId, monitor.id))
        .orderBy(desc(checks.checkedAt))
        .limit(FAILURE_THRESHOLD);
      
      const consecutiveFailures = recentChecks.filter(c => c.isFailure).length;
      
      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        // Check if incident already exists
        const [existingIncident] = await db.select().from(incidents)
          .where(and(
            eq(incidents.monitorId, monitor.id),
            eq(incidents.resolvedAt, null as any)
          ));
        
        if (!existingIncident) {
          // Create new incident
          const [incident] = await db.insert(incidents).values({
            monitorId: monitor.id,
            startedAt: new Date(),
            cause: result.error || `HTTP ${result.statusCode}`,
          }).returning();
          
          // Send alerts
          await sendDiscordAlert(monitor.name, 'down', monitor.url);
          await sendEmailAlert(monitor.name, 'down', monitor.url, 'user@example.com');
        }
      } else if (consecutiveFailures === 0) {
        // Check if there's an open incident to resolve
        const [existingIncident] = await db.select().from(incidents)
          .where(and(
            eq(incidents.monitorId, monitor.id),
            eq(incidents.resolvedAt, null as any)
          ));
        
        if (existingIncident) {
          await db.update(incidents)
            .set({ resolvedAt: new Date() })
            .where(eq(incidents.id, existingIncident.id));
          
          await sendDiscordAlert(monitor.name, 'up', monitor.url);
          await sendEmailAlert(monitor.name, 'up', monitor.url, 'user@example.com');
        }
      }
    }));
  }
}, { connection });

console.log('Worker started, listening for health-checks jobs');
```

### Step 4.5: Schedule jobs — add to `src/api/index.ts`

```typescript
import { healthCheckQueue } from '../worker/queue';

// After app.listen
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || '60000');

healthCheckQueue.add('health-check', {}, {
  repeat: { every: CHECK_INTERVAL_MS },
  removeOnComplete: true,
});
```

### Verification

- [ ] Redis connection works
- [ ] Worker starts and processes jobs
- [ ] Checks are recorded in database
- [ ] Incidents created on consecutive failures
- [ ] Discord alerts fire on status change
- [ ] Email alerts fire (if configured)

---

## Phase 5: Frontend (Next.js)

### Step 5.1: Create Next.js app

```bash
npx create-next-app@latest src/web --typescript --tailwind --app --no-eslint --import-alias "@/*"
```

### Step 5.2: Create API client — `src/web/lib/api.ts`

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'API error');
  }
  
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      fetchApi('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    login: (email: string, password: string) =>
      fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => fetchApi('/auth/me'),
  },
  monitors: {
    list: () => fetchApi('/monitors'),
    get: (id: string) => fetchApi(`/monitors/${id}`),
    create: (name: string, url: string) =>
      fetchApi('/monitors', { method: 'POST', body: JSON.stringify({ name, url }) }),
    delete: (id: string) => fetchApi(`/monitors/${id}`, { method: 'DELETE' }),
    checks: (id: string, limit = 100) =>
      fetchApi(`/monitors/${id}/checks?limit=${limit}`),
    incidents: (id: string, limit = 50) =>
      fetchApi(`/monitors/${id}/incidents?limit=${limit}`),
    uptime: (id: string) => fetchApi(`/monitors/${id}/uptime`),
  },
};
```

### Step 5.3: Create pages

**Login page** — `src/web/app/login/page.tsx`
**Register page** — `src/web/app/register/page.tsx`
**Dashboard** — `src/web/app/page.tsx`
**Monitor detail** — `src/web/app/monitors/[id]/page.tsx`

### Step 5.4: Create components

- `src/web/components/MonitorCard.tsx`
- `src/web/components/ResponseTimeChart.tsx`
- `src/web/components/IncidentList.tsx`
- `src/web/components/AddMonitorForm.tsx`

### Verification

- [ ] Next.js starts on port 3000
- [ ] Login/Register pages work
- [ ] Dashboard shows monitors
- [ ] Monitor detail shows graph and incidents
- [ ] Can add/delete monitors

---

## Phase 6: Polish & Deploy

### Step 6.1: Seed data

Create `src/api/seed.ts` with real public URLs:
- https://httpbin.org/get (always up)
- https://httpstat.us/500 (always down)
- Your other projects' URLs

### Step 6.2: Final testing

- Test full flow: register → login → add monitor → wait for checks → see results
- Test alerting: add a failing URL → verify Discord/email alerts
- Test incident detection: verify 3 consecutive failures trigger incident

### Step 6.3: Deploy to Production

**Deployment Strategy:**

| Service | What runs | Provider |
|---------|-----------|----------|
| Frontend | Next.js | Vercel |
| API + Worker | Express + BullMQ | Render |
| Database | PostgreSQL | Neon |
| Redis | Upstash | Upstash |

**Deploy Steps:**

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/uppy.git
   git push -u origin main
   ```

2. **Deploy Frontend (Vercel)**
   - Go to vercel.com → Import Git Repository
   - Select GitHub repo
   - Framework: Next.js
   - Root Directory: `src/web`
   - Add env vars (from .env.example)
   - Deploy

3. **Deploy API + Worker (Render)**
   - Go to render.com → New Web Service
   - Connect GitHub repo
   - Name: `uppy-api`
   - Runtime: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:api`
   - Add env vars
   - Deploy

4. **Set up Neon**
   - Go to neon.tech → Create project
   - Copy connection string to env vars
   - Run `npm run db:push` locally

5. **Set up Upstash**
   - Go to upstash.com → Create Redis database
   - Copy URL to env vars

---

## File Checklist

```
□ package.json
□ tsconfig.json
□ drizzle.config.ts
□ .env (copy from .env.example)
□ src/api/db/schema.ts
□ src/api/db/index.ts
□ src/api/index.ts
□ src/api/middleware/auth.ts
□ src/api/routes/auth.ts
□ src/api/routes/monitors.ts
□ src/api/routes/checks.ts
□ src/api/routes/incidents.ts
□ src/api/routes/uptime.ts
□ src/worker/index.ts
□ src/worker/queue.ts
□ src/worker/checker.ts
□ src/worker/alerter.ts
□ src/web/ (Next.js app)
□ src/web/lib/api.ts
□ src/web/app/login/page.tsx
□ src/web/app/register/page.tsx
□ src/web/app/page.tsx
□ src/web/app/monitors/[id]/page.tsx
□ src/web/components/MonitorCard.tsx
□ src/web/components/ResponseTimeChart.tsx
□ src/web/components/IncidentList.tsx
□ src/web/components/AddMonitorForm.tsx
```
