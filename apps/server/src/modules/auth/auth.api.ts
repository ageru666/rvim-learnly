import {
  authResponseSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  sessionTokensSchema,
  tokenSchema,
} from '@learnly/contracts/auth';
import { meSchema } from '@learnly/contracts/me';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  clearSessionCookies,
  COOKIES,
  readCookie,
  setPreferenceCookie,
  setSessionCookies,
} from '../../lib/cookies.js';
import { unauthorized } from '../../lib/errors.js';
import { API_PREFIX, clientInfo } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { currentUser, requireAuth } from '../../middlewares/requireRole.js';
import { registerRoute } from '../../openapi/registry.js';
import { getMe } from '../users/users.service.js';
import {
  forgotPassword,
  login,
  logout,
  logoutAll,
  refresh,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
  type SignedIn,
} from './auth.service.js';

const TAG = 'Auth';
const AUTH = `${API_PREFIX}/auth`;

/** Body token for API clients, the cookie for browsers. */
function presentedRefreshToken(req: Request, bodyToken: string | undefined): string | undefined {
  return bodyToken ?? readCookie(req, COOKIES.refresh);
}

/** Signs the browser in too (cookies), so the SSR pages and the SPA share the session. */
async function sendSignedIn(res: Response, signedIn: SignedIn, status: number): Promise<void> {
  const user = await getMe(signedIn.userId);
  setSessionCookies(res, signedIn.tokens);
  setPreferenceCookie(res, COOKIES.locale, user.locale);
  res.status(status).json({ user, ...signedIn.tokens });
}

export const authApiRouter = Router();

registerRoute({
  method: 'post',
  path: `${AUTH}/register`,
  tag: TAG,
  summary: 'Create a student account; the account locale is the request locale',
  access: 'public',
  body: registerSchema,
  bodyExample: { name: 'Olha Kovalenko', email: 'olha@example.com', password: 'Str0ng!pass', acceptTerms: true },
  responses: {
    201: { description: 'Signed in', schema: authResponseSchema },
    409: { description: 'The email is taken' },
  },
});
authApiRouter.post(`${AUTH}/register`, async (req, res) => {
  const input = parseInput(registerSchema, req.body, req.i18n);
  await sendSignedIn(res, await register(input, req.locale, clientInfo(req)), 201);
});

registerRoute({
  method: 'post',
  path: `${AUTH}/login`,
  tag: TAG,
  summary: 'Log in with email and password',
  access: 'public',
  body: loginSchema,
  bodyExample: { email: 'student1@learnly.local', password: 'Learnly2026!' },
  responses: {
    200: { description: 'Signed in', schema: authResponseSchema },
    401: { description: 'Wrong email or password' },
    403: { description: 'The account is blocked' },
  },
});
authApiRouter.post(`${AUTH}/login`, async (req, res) => {
  const input = parseInput(loginSchema, req.body, req.i18n);
  await sendSignedIn(res, await login(input, clientInfo(req)), 200);
});

registerRoute({
  method: 'post',
  path: `${AUTH}/refresh`,
  tag: TAG,
  summary: 'Rotate the refresh token (body or cookie)',
  access: 'public',
  body: refreshSchema,
  responses: {
    200: { description: 'A new token pair', schema: sessionTokensSchema },
    401: { description: 'The refresh token is invalid, expired or reused' },
  },
});
authApiRouter.post(`${AUTH}/refresh`, async (req, res) => {
  const { refreshToken: bodyToken } = parseInput(refreshSchema, req.body ?? {}, req.i18n);
  const token = presentedRefreshToken(req, bodyToken);
  if (!token) throw unauthorized();
  try {
    const tokens = await refresh(token, clientInfo(req));
    if (!bodyToken) setSessionCookies(res, tokens);
    res.json(tokens);
  } catch (error) {
    if (!bodyToken) clearSessionCookies(res);
    throw error;
  }
});

registerRoute({
  method: 'post',
  path: `${AUTH}/logout`,
  tag: TAG,
  summary: 'End the current session',
  access: 'public',
  body: refreshSchema,
  responses: { 204: { description: 'Logged out' } },
});
authApiRouter.post(`${AUTH}/logout`, async (req, res) => {
  const { refreshToken } = parseInput(refreshSchema, req.body ?? {}, req.i18n);
  await logout(presentedRefreshToken(req, refreshToken));
  clearSessionCookies(res);
  res.status(204).end();
});

registerRoute({
  method: 'post',
  path: `${AUTH}/logout-all`,
  tag: TAG,
  summary: 'End every session of the user, including this one',
  access: 'user',
  responses: { 204: { description: 'Logged out everywhere' } },
});
authApiRouter.post(`${AUTH}/logout-all`, requireAuth, async (req, res) => {
  await logoutAll(currentUser(req).id);
  clearSessionCookies(res);
  res.status(204).end();
});

registerRoute({
  method: 'post',
  path: `${AUTH}/email/verify`,
  tag: TAG,
  summary: 'Confirm an email address with the token from the email',
  access: 'public',
  body: tokenSchema,
  responses: {
    200: { description: 'Verified', schema: z.object({ user: meSchema }) },
    422: { description: 'TOKEN_INVALID_OR_EXPIRED' },
  },
});
authApiRouter.post(`${AUTH}/email/verify`, async (req, res) => {
  const { token } = parseInput(tokenSchema, req.body, req.i18n);
  res.json({ user: await getMe(await verifyEmail(token)) });
});

registerRoute({
  method: 'post',
  path: `${AUTH}/email/resend`,
  tag: TAG,
  summary: 'Send the verification email again (once a minute)',
  access: 'user',
  responses: { 204: { description: 'Sent' } },
});
authApiRouter.post(`${AUTH}/email/resend`, requireAuth, async (req, res) => {
  await resendVerification(currentUser(req).id);
  res.status(204).end();
});

registerRoute({
  method: 'post',
  path: `${AUTH}/password/forgot`,
  tag: TAG,
  summary: 'Email a password reset link; answers 204 for any address',
  access: 'public',
  body: forgotPasswordSchema,
  responses: { 204: { description: 'Accepted' } },
});
authApiRouter.post(`${AUTH}/password/forgot`, async (req, res) => {
  const { email } = parseInput(forgotPasswordSchema, req.body, req.i18n);
  await forgotPassword(email);
  res.status(204).end();
});

registerRoute({
  method: 'post',
  path: `${AUTH}/password/reset`,
  tag: TAG,
  summary: 'Set a new password with the token from the email; ends every session',
  access: 'public',
  body: resetPasswordSchema,
  responses: {
    204: { description: 'Password changed' },
    422: { description: 'TOKEN_INVALID_OR_EXPIRED' },
  },
});
authApiRouter.post(`${AUTH}/password/reset`, async (req, res) => {
  const { token, password } = parseInput(resetPasswordSchema, req.body, req.i18n);
  await resetPassword(token, password);
  res.status(204).end();
});
