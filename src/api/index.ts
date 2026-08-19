import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import monitorRoutes from './routes/monitors';
import checkRoutes from './routes/checks';
import incidentRoutes from './routes/incidents';
import uptimeRoutes from './routes/uptime';
import { healthCheckQueue } from '../worker/queue';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/monitors', checkRoutes);
app.use('/api/monitors', incidentRoutes);
app.use('/api/monitors', uptimeRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || '60000');
healthCheckQueue
  .upsertJobScheduler(
    'health-check-scheduler',
    { every: CHECK_INTERVAL_MS },
    { name: 'health-check', data: {} }
  )
  .then(() => console.log(`Scheduled health-check job every ${CHECK_INTERVAL_MS}ms`))
  .catch((err) => console.error('Failed to schedule health-check job:', err.message));
