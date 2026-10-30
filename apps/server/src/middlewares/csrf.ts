import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { COOKIES, readCookie, setCsrfCookie } from '../lib/cookies.js';
import { forbidden } from '../lib/errors.js';
import { randomToken } from '../lib/tokens.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';
const CSRF_FIELD = '_csrf';

function submittedToken(req: Request): string | undefined {
  const header = req.get(CSRF_HEADER);
  if (header) return header;
  const body = req.body as Record<string, unknown> | undefined;
  const field = body?.[CSRF_FIELD];
  return typeof field === 'string' ? field : undefined;
}

/**
 * CSRF is a browser attack, and browsers mark every unsafe request with `Origin` or
 * `Sec-Fetch-Site`. API clients (Postman, curl) send neither, so they are not checked.
 */
function isBrowserRequest(req: Request): boolean {
  return req.get('origin') !== undefined || req.get('sec-fetch-site') !== undefined;
}

function tokensMatch(expected: string, actual: string | undefined): boolean {
  if (!actual) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Double-submit cookie: the token lives in a readable cookie and must come back in a header (SPA)
 * or a hidden form field (SSR). Bearer requests carry no ambient credentials, so they are exempt.
 * `Origin` alone is not trusted: a request without the token is refused even from our own origin.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  let token = readCookie(req, COOKIES.csrf);
  if (!token) {
    token = randomToken();
    setCsrfCookie(res, token);
  }
  res.locals.csrfToken = token;

  if (SAFE_METHODS.has(req.method) || req.authVia === 'bearer' || !isBrowserRequest(req)) {
    next();
    return;
  }
  next(tokensMatch(token, submittedToken(req)) ? undefined : forbidden('errors.csrf'));
}
