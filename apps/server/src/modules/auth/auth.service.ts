import type { RegisterInput, LoginInput } from '@learnly/contracts/auth';
import type { Locale } from '@learnly/contracts/enums';
import {
  EMAIL_VERIFY_TTL_MS,
  LOGIN_ATTEMPTS_RETENTION_MS,
  LOGIN_MAX_FAILS,
  LOGIN_WINDOW_MS,
  PASSWORD_RESET_TTL_MS,
  VERIFY_RESEND_MS,
} from '@learnly/contracts/limits';
import type { MessageKey } from '@learnly/i18n/keys';
import type { SessionTokens } from '../../lib/cookies.js';
import { db } from '../../lib/db.js';
import { AppError, conflict, forbidden, ruleViolation, unauthorized } from '../../lib/errors.js';
import { deliverEmail } from '../../lib/mailer.js';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';
import { randomToken, sha256 } from '../../lib/tokens.js';
import type { OneTimeTokenPurpose } from '../../generated/prisma/client.js';
import { findActiveUser } from './current-user.js';
import {
  issueSession,
  revokeAllSessions,
  revokeSession,
  rotateSession,
  type ClientInfo,
} from './session.service.js';

export interface SignedIn {
  userId: string;
  /** The account locale: after login the interface switches to it. */
  locale: Locale;
  tokens: SessionTokens;
}

/** Whom an email goes to and in which language (always the recipient's own locale). */
interface Recipient {
  id: string;
  name: string;
  email: string;
  locale: Locale;
}

const UNKNOWN_IP = 'unknown';
const TOKEN_INVALID_RULE = 'TOKEN_INVALID_OR_EXPIRED';

let dummyHash: Promise<string> | undefined;

/** Unknown emails are checked against a throwaway hash, so they take as long as wrong passwords. */
async function passwordMatches(hash: string | undefined, password: string): Promise<boolean> {
  if (hash) return verifyPassword(hash, password);
  dummyHash ??= hashPassword(randomToken());
  await verifyPassword(await dummyHash, password);
  return false;
}

function secondsUntil(time: number): number {
  return Math.max(1, Math.ceil((time - Date.now()) / 1000));
}

/** Creates a single-use link token; earlier unused tokens with the same purpose stop working. */
async function createOneTimeToken(
  userId: string,
  purpose: OneTimeTokenPurpose,
  email: string,
  ttlMs: number,
): Promise<string> {
  const token = randomToken();
  await db.$transaction([
    db.oneTimeToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } }),
    db.oneTimeToken.create({
      data: { userId, purpose, email, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) },
    }),
  ]);
  return token;
}

/** Marks a link token as used; a missing, used or expired token is a business-rule error. */
async function consumeOneTimeToken(token: string, purpose: OneTimeTokenPurpose) {
  const invalid = () => ruleViolation(TOKEN_INVALID_RULE, 'errors.auth.tokenInvalid');
  const record = await db.oneTimeToken.findUnique({ where: { tokenHash: sha256(token) } });
  const now = new Date();
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt <= now) throw invalid();
  // The conditional update lets only one of two concurrent uses of a link succeed.
  const { count } = await db.oneTimeToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: now } });
  if (count !== 1) throw invalid();
  return record;
}

const VERIFY_TEMPLATES = {
  account: { template: 'welcome-verify', subjectKey: 'emails.welcomeVerify.subject' },
  newEmail: { template: 'verify-new-email', subjectKey: 'emails.verifyNewEmail.subject' },
} as const satisfies Record<string, { template: string; subjectKey: MessageKey }>;

/**
 * Sends a verification link to `email`: the account address after registration, or a new address
 * the user wants to switch to (the change applies only when that link is opened).
 */
export async function sendVerificationEmail(
  recipient: Recipient,
  email: string,
  kind: keyof typeof VERIFY_TEMPLATES,
): Promise<void> {
  const token = await createOneTimeToken(recipient.id, 'email_verify', email, EMAIL_VERIFY_TTL_MS);
  await deliverEmail({
    to: email,
    locale: recipient.locale,
    ...VERIFY_TEMPLATES[kind],
    data: { name: recipient.name, link: `/verify-email?token=${token}` },
  });
}

export async function register(input: RegisterInput, locale: Locale, client: ClientInfo): Promise<SignedIn> {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw conflict('errors.auth.emailTaken');
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      locale,
    },
  });
  const tokens = await issueSession(user.id, client);
  await sendVerificationEmail(user, user.email, 'account');
  return { userId: user.id, locale: user.locale, tokens };
}

/** FR-AUTH-2: after 5 failed attempts for an email from one IP within 15 minutes, login is locked. */
async function assertNotLocked(email: string, ip: string): Promise<void> {
  const failures = await db.loginAttempt.findMany({
    where: { email, ip, succeeded: false, createdAt: { gte: new Date(Date.now() - LOGIN_WINDOW_MS) } },
    orderBy: { createdAt: 'desc' },
    take: LOGIN_MAX_FAILS,
    select: { createdAt: true },
  });
  const oldest = failures.at(-1);
  if (failures.length < LOGIN_MAX_FAILS || !oldest) return;
  throw new AppError('RATE_LIMITED', 'errors.auth.tooManyAttempts', {
    retryAfterSec: secondsUntil(oldest.createdAt.getTime() + LOGIN_WINDOW_MS),
  });
}

export async function login(input: LoginInput, client: ClientInfo): Promise<SignedIn> {
  const ip = client.ip ?? UNKNOWN_IP;
  await assertNotLocked(input.email, ip);

  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = await passwordMatches(user?.passwordHash, input.password);
  if (!user || !valid) {
    await db.loginAttempt.create({ data: { email: input.email, ip, succeeded: false } });
    throw unauthorized('errors.auth.invalidCredentials');
  }
  if (user.status === 'blocked') throw forbidden('errors.auth.blocked');

  await db.$transaction([
    db.loginAttempt.deleteMany({ where: { email: input.email, ip, succeeded: false } }),
    db.loginAttempt.create({ data: { email: input.email, ip, succeeded: true } }),
    db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ]);
  return { userId: user.id, locale: user.locale, tokens: await issueSession(user.id, client) };
}

export async function refresh(refreshToken: string, client: ClientInfo): Promise<SessionTokens> {
  const rotated = await rotateSession(refreshToken, client);
  if (!rotated) throw unauthorized();
  if (!(await findActiveUser(rotated.userId))) {
    await revokeAllSessions(rotated.userId);
    throw unauthorized();
  }
  return rotated.tokens;
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (refreshToken) await revokeSession(refreshToken);
}

export async function logoutAll(userId: string): Promise<void> {
  await revokeAllSessions(userId);
}

/** FR-AUTH-3: a new verification email at most once a minute. */
export async function resendVerification(userId: string): Promise<void> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) throw ruleViolation('EMAIL_ALREADY_VERIFIED', 'errors.auth.alreadyVerified');
  const latest = await db.oneTimeToken.findFirst({
    where: { userId, purpose: 'email_verify' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  const nextAllowedAt = latest ? latest.createdAt.getTime() + VERIFY_RESEND_MS : 0;
  if (nextAllowedAt > Date.now()) {
    throw new AppError('RATE_LIMITED', 'errors.auth.resendTooSoon', { retryAfterSec: secondsUntil(nextAllowedAt) });
  }
  await sendVerificationEmail(user, user.email, 'account');
}

/** Confirms the address in the link; for an email change this is when the new address applies. */
export async function verifyEmail(token: string): Promise<string> {
  const record = await consumeOneTimeToken(token, 'email_verify');
  const email = record.email ?? undefined;
  const taken = email
    ? await db.user.findFirst({ where: { email, id: { not: record.userId } }, select: { id: true } })
    : null;
  if (taken) throw conflict('errors.auth.emailTaken');
  await db.user.update({ where: { id: record.userId }, data: { email, emailVerifiedAt: new Date() } });
  return record.userId;
}

/** Always succeeds from the caller's point of view, so the response does not reveal accounts. */
export async function forgotPassword(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== 'active') return;
  const token = await createOneTimeToken(user.id, 'password_reset', user.email, PASSWORD_RESET_TTL_MS);
  await deliverEmail({
    to: user.email,
    locale: user.locale,
    template: 'password-reset',
    subjectKey: 'emails.passwordReset.subject',
    data: { name: user.name, link: `/reset-password?token=${token}` },
  });
}

/** A reset ends every session: whoever knew the old password is logged out. */
export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await consumeOneTimeToken(token, 'password_reset');
  await db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } });
  await revokeAllSessions(record.userId);
}

export async function checkPassword(userId: string, password: string): Promise<void> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw ruleViolation('CURRENT_PASSWORD', 'errors.auth.wrongPassword');
  }
}

/** Login attempts are only needed for the lockout window; older rows are removed hourly. */
export async function cleanupLoginAttempts(): Promise<number> {
  const { count } = await db.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - LOGIN_ATTEMPTS_RETENTION_MS) } },
  });
  return count;
}
