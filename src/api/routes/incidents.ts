import { Router } from 'express';
import { db } from '../db';
import { incidents, monitors } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

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
