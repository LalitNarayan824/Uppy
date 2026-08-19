import 'dotenv/config';
import { Worker } from 'bullmq';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { db } from '../api/db';
import { monitors, users, checks, incidents } from '../api/db/schema';
import { redisConnection } from './queue';
import { performCheck } from './checker';
import { sendDiscordAlert, sendEmailAlert } from './alerter';

const TIMEOUT_MS = parseInt(process.env.CHECK_TIMEOUT_MS || '5000');
const FAILURE_THRESHOLD = parseInt(process.env.FAILURE_THRESHOLD || '3');
const CONCURRENT_CHECKS = parseInt(process.env.CONCURRENT_CHECKS || '10');

const worker = new Worker(
  'health-checks',
  async () => {
    const allMonitors = await db
      .select({
        id: monitors.id,
        name: monitors.name,
        url: monitors.url,
        ownerEmail: users.email,
      })
      .from(monitors)
      .innerJoin(users, eq(monitors.userId, users.id));

    const chunks: typeof allMonitors[] = [];
    for (let i = 0; i < allMonitors.length; i += CONCURRENT_CHECKS) {
      chunks.push(allMonitors.slice(i, i + CONCURRENT_CHECKS));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (monitor) => {
          const result = await performCheck(monitor.url, TIMEOUT_MS);

          await db.insert(checks).values({
            monitorId: monitor.id,
            statusCode: result.statusCode,
            responseTimeMs: result.responseTimeMs,
            isFailure: result.isFailure,
          });

          const recentChecks = await db
            .select({ isFailure: checks.isFailure })
            .from(checks)
            .where(eq(checks.monitorId, monitor.id))
            .orderBy(desc(checks.checkedAt))
            .limit(FAILURE_THRESHOLD);

          const consecutiveFailures =
            recentChecks.length >= FAILURE_THRESHOLD && recentChecks.every((c) => c.isFailure);
          const allHealthy = recentChecks.length >= FAILURE_THRESHOLD && recentChecks.every((c) => !c.isFailure);

          if (consecutiveFailures) {
            const [existingIncident] = await db
              .select({ id: incidents.id })
              .from(incidents)
              .where(and(eq(incidents.monitorId, monitor.id), isNull(incidents.resolvedAt)));

            if (!existingIncident) {
              await db.insert(incidents).values({
                monitorId: monitor.id,
                startedAt: new Date(),
                cause: result.error || `HTTP ${result.statusCode}`,
              });

              await sendDiscordAlert(monitor.name, 'down', monitor.url);
              await sendEmailAlert(monitor.name, 'down', monitor.url, monitor.ownerEmail);
            }
          } else if (allHealthy) {
            const [existingIncident] = await db
              .select({ id: incidents.id })
              .from(incidents)
              .where(and(eq(incidents.monitorId, monitor.id), isNull(incidents.resolvedAt)));

            if (existingIncident) {
              await db
                .update(incidents)
                .set({ resolvedAt: new Date() })
                .where(eq(incidents.id, existingIncident.id));

              await sendDiscordAlert(monitor.name, 'up', monitor.url);
              await sendEmailAlert(monitor.name, 'up', monitor.url, monitor.ownerEmail);
            }
          }
        })
      );
    }
  },
  { connection: redisConnection }
);

console.log('Worker started, listening for health-checks jobs');