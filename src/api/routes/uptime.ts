import { Router } from 'express';
import { db } from '../db';
import { checks, monitors } from '../db/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

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
