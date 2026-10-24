import { createApp } from './app.js';
import { config } from './config/env.js';
import { db } from './lib/db.js';
import { logger } from './lib/logger.js';

const server = createApp().listen(config.PORT, () => {
  logger.info(`Learnly server listening on http://localhost:${config.PORT}`);
});

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
