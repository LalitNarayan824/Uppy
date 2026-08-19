import 'dotenv/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export const redisConnection = new Redis(process.env.REDIS_URL || '', {
  maxRetriesPerRequest: null,
});

export const healthCheckQueue = new Queue('health-checks', {
  connection: redisConnection,
});