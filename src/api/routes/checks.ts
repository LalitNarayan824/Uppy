import { Router } from 'express';
import { db } from '../db';
import { checks, monitors } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

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
