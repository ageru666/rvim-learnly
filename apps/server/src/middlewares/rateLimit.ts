import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
import { AppError } from '../lib/errors.js';

const WINDOW_MS = 60_000;

export interface RateLimits {
  globalPerMin: number;
  authPerMin: number;
}

function limiter(limit: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next, options) => {
      const retryAfterSec = Math.ceil(options.windowMs / 1000);
      next(new AppError('RATE_LIMITED', 'errors.codes.RATE_LIMITED', { retryAfterSec }));
    },
  });
}

/** Limits come from configuration so tests and the Postman run are not throttled. */
export function createRateLimiters(limits: RateLimits) {
  return {
    global: limiter(limits.globalPerMin),
    auth: limiter(limits.authPerMin),
  };
}
