import { randomUUID } from 'node:crypto';
import { REFRESH_TOKEN_TTL_MS } from '@learnly/contracts/limits';
import type { SessionTokens } from '../../lib/cookies.js';
import { db } from '../../lib/db.js';
import { randomToken, sha256, signAccessToken } from '../../lib/tokens.js';

export interface ClientInfo {
  userAgent?: string;
  ip?: string;
}

/**
 * Two requests may legitimately present the same refresh token at once (e.g. a page and the SPA
 * loading together). Within this window a revoked token is not treated as theft.
 */
const REUSE_GRACE_MS = 10_000;

async function createRefreshToken(userId: string, client: ClientInfo, familyId: string) {
  const token = randomToken();
  const record = await db.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent: client.userAgent,
      ip: client.ip,
    },
    select: { id: true },
  });
  return { id: record.id, token };
}

export async function issueSession(userId: string, client: ClientInfo): Promise<SessionTokens> {
  const refresh = await createRefreshToken(userId, client, randomUUID());
  return { accessToken: await signAccessToken(userId), refreshToken: refresh.token };
}

async function revokeFamily(familyId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Exchanges a refresh token for a new pair (rotation). Presenting an already rotated token outside
 * the grace window revokes the whole family: someone else holds a copy of it.
 */
export async function rotateSession(
  refreshToken: string,
  client: ClientInfo,
): Promise<{ userId: string; tokens: SessionTokens } | null> {
  const record = await db.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
  if (!record) return null;

  const now = Date.now();
  if (record.revokedAt) {
    if (now - record.revokedAt.getTime() > REUSE_GRACE_MS) await revokeFamily(record.familyId);
    return null;
  }
  if (record.expiresAt.getTime() <= now) return null;

  const replacement = await createRefreshToken(record.userId, client, record.familyId);
  await db.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date(now), replacedById: replacement.id },
  });
  const accessToken = await signAccessToken(record.userId);
  return { userId: record.userId, tokens: { accessToken, refreshToken: replacement.token } };
}

export async function revokeSession(refreshToken: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { tokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Ends every session of the user, optionally keeping the current one. */
export async function revokeAllSessions(userId: string, keepRefreshToken?: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(keepRefreshToken ? { tokenHash: { not: sha256(keepRefreshToken) } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}
