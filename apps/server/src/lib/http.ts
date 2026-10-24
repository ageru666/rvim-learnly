import type { Request } from 'express';

export const API_PREFIX = '/api/v1';

export function isApiRequest(req: Request): boolean {
  return req.originalUrl.startsWith('/api/');
}

/** Only same-site relative paths are accepted, so `returnTo` cannot redirect to another site. */
export function safeReturnTo(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value.includes('\\') ? fallback : value;
}

export function clientInfo(req: Request): { userAgent?: string; ip?: string } {
  return { userAgent: req.get('user-agent'), ip: req.ip };
}
