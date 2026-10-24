import { LOCALE_COOKIE_MAX_AGE_MS, REFRESH_TOKEN_TTL_MS } from '@learnly/contracts/limits';
import type { CookieOptions, Request, Response } from 'express';
import { config } from '../config/env.js';

export const COOKIES = {
  access: 'access_token',
  refresh: 'refresh_token',
  csrf: 'csrf_token',
  theme: 'theme',
  locale: 'locale',
  flash: 'flash',
} as const;

type CookieName = (typeof COOKIES)[keyof typeof COOKIES];

const BASE: CookieOptions = { sameSite: 'lax', secure: config.COOKIE_SECURE, path: '/' };
const SESSION: CookieOptions = { ...BASE, httpOnly: true };
/** Readable by the SPA and the inline theme script, so not httpOnly. */
const PREFERENCE: CookieOptions = { ...BASE, httpOnly: false, maxAge: LOCALE_COOKIE_MAX_AGE_MS };

export function readCookie(req: Request, name: CookieName): string | undefined {
  const value: unknown = (req.cookies as Record<string, unknown> | undefined)?.[name];
  return typeof value === 'string' ? value : undefined;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export function setSessionCookies(res: Response, tokens: SessionTokens): void {
  res.cookie(COOKIES.access, tokens.accessToken, SESSION);
  res.cookie(COOKIES.refresh, tokens.refreshToken, { ...SESSION, maxAge: REFRESH_TOKEN_TTL_MS });
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(COOKIES.access, SESSION);
  res.clearCookie(COOKIES.refresh, SESSION);
}

export function setPreferenceCookie(
  res: Response,
  name: typeof COOKIES.theme | typeof COOKIES.locale,
  value: string,
): void {
  res.cookie(name, value, PREFERENCE);
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(COOKIES.csrf, token, { ...BASE, httpOnly: false });
}

export function setFlashCookie(res: Response, value: string): void {
  res.cookie(COOKIES.flash, value, SESSION);
}

export function clearFlashCookie(res: Response): void {
  res.clearCookie(COOKIES.flash, SESSION);
}
