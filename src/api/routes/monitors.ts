import { Router } from 'express';
import { db } from '../db';
import { monitors } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const userMonitors = await db.select().from(monitors).where(eq(monitors.userId, req.userId!));
  res.json(userMonitors);
});

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

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const monitorId = req.params.id as string;

  const [monitor] = await db.select().from(monitors).where(
    and(eq(monitors.id, monitorId), eq(monitors.userId, req.userId!))
  );

  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  res.json(monitor);
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  const monitorId = req.params.id as string;
  const { name, url } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL required' });
  }

  const [monitor] = await db.select().from(monitors).where(
    and(eq(monitors.id, monitorId), eq(monitors.userId, req.userId!))
  );

  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  const [updated] = await db.update(monitors).set({ name, url })
    .where(eq(monitors.id, monitorId))
    .returning();

  res.json(updated);
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const monitorId = req.params.id as string;

  const [monitor] = await db.select().from(monitors).where(
    and(eq(monitors.id, monitorId), eq(monitors.userId, req.userId!))
  );

  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  await db.delete(monitors).where(eq(monitors.id, monitorId));
  res.status(204).send();
});

export default router;
