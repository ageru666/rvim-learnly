import type { Role } from '@learnly/contracts/enums';
import type { NextFunction, Request, Response } from 'express';
import { forbidden, ruleViolation, unauthorized } from '../lib/errors.js';
import { isApiRequest } from '../lib/http.js';
import type { AuthUser } from '../modules/auth/auth.types.js';

function loginRedirect(req: Request, res: Response): void {
  res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.user) {
    next();
    return;
  }
  if (isApiRequest(req)) next(unauthorized());
  else loginRedirect(req, res);
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      requireAuth(req, res, next);
      return;
    }
    next(roles.includes(req.user.role) ? undefined : forbidden());
  };
}

/** BR-U4: reviews, instructor applications and course submission need a verified email. */
export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    requireAuth(req, res, next);
    return;
  }
  next(req.user.emailVerified ? undefined : ruleViolation('BR-U4', 'errors.auth.emailNotVerified'));
}

/** For handlers behind `requireAuth`: narrows `req.user` without a non-null assertion. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
