import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { registerRoute } from '../../openapi/registry.js';

const VERSION = '1.0.0';
const healthSchema = z.object({
  status: z.literal('ok'),
  db: z.enum(['ok', 'down']),
  version: z.string(),
});

export const healthRouter = Router();

registerRoute({
  method: 'get',
  path: '/health',
  tag: 'System',
  summary: 'Server and database status',
  access: 'public',
  responses: { 200: { description: 'Service status', schema: healthSchema } },
});

healthRouter.get('/health', async (_req, res) => {
  let database: 'ok' | 'down' = 'ok';
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    logger.error({ err: error }, 'health check: database unavailable');
    database = 'down';
  }
  res.json({ status: 'ok', db: database, version: VERSION } satisfies z.infer<typeof healthSchema>);
});
