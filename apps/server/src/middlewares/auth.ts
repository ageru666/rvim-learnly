import type { NextFunction, Request, Response } from 'express';
import { clearSessionCookies, COOKIES, readCookie, setSessionCookies } from '../lib/cookies.js';
import { clientInfo } from '../lib/http.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { findActiveUser } from '../modules/auth/current-user.js';
import { rotateSession } from '../modules/auth/session.service.js';

const BEARER_PREFIX = 'Bearer ';

function bearerToken(req: Request): string | undefined {
  const header = req.get('authorization');
  return header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length).trim() : undefined;
}

/** Cookie sessions: an expired access token is renewed from the refresh cookie on any request. */
async function userIdFromCookies(req: Request, res: Response): Promise<string | null> {
  const accessToken = readCookie(req, COOKIES.access);
  const userId = accessToken ? await verifyAccessToken(accessToken) : null;
  if (userId) return userId;

  const refreshToken = readCookie(req, COOKIES.refresh);
  if (!refreshToken) return null;
  const rotated = await rotateSession(refreshToken, clientInfo(req));
  if (!rotated) {
    clearSessionCookies(res);
    return null;
  }
  setSessionCookies(res, rotated.tokens);
  return rotated.userId;
}

/** Resolves `req.user` for every request; guests simply have none. Bearer wins over cookies. */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const bearer = bearerToken(req);
  const userId = bearer ? await verifyAccessToken(bearer) : await userIdFromCookies(req, res);
  if (!userId) {
    next();
    return;
  }
  const user = await findActiveUser(userId);
  if (!user) {
    if (!bearer) clearSessionCookies(res);
    next();
    return;
  }
  req.user = user;
  req.authVia = bearer ? 'bearer' : 'cookie';
  next();
}
