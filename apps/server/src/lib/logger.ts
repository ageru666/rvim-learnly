import pino from 'pino';
import { config, isProduction } from '../config/env.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  ...(isProduction || config.NODE_ENV === 'test'
    ? {}
    : { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } } }),
});
