import { createApp } from './app.js';
import { config } from './config/env.js';
import { db } from './lib/db.js';
import { logger } from './lib/logger.js';
import { cleanupLoginAttempts } from './modules/auth/auth.service.js';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const server = createApp().listen(config.PORT, () => {
  logger.info(`Learnly server listening on http://localhost:${config.PORT}`);
});

const cleanup = setInterval(() => {
  cleanupLoginAttempts().catch((error: unknown) => logger.error({ err: error }, 'login attempts cleanup failed'));
}, CLEANUP_INTERVAL_MS);
cleanup.unref();

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    db.$disconnect()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error({ err: error }, 'failed to close the database connection');
        process.exit(1);
      });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
