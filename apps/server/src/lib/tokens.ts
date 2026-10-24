import { createHash, randomBytes } from 'node:crypto';
import { ACCESS_TOKEN_TTL_MS } from '@learnly/contracts/limits';
import { errors as joseErrors, jwtVerify, SignJWT } from 'jose';
import { config } from '../config/env.js';

const ALGORITHM = 'HS256';
const ISSUER = 'learnly';
const secret = new TextEncoder().encode(config.JWT_SECRET);

export function signAccessToken(userId: string): Promise<string> {
  return new SignJWT()
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + ACCESS_TOKEN_TTL_MS))
    .sign(secret);
}

/** Returns the user id, or null for an expired, malformed or forged token. */
export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, algorithms: [ALGORITHM] });
    return payload.sub ?? null;
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) return null;
    throw error;
  }
}

/** Opaque single-use or refresh token: 32 random bytes, URL-safe. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Tokens are stored only as hashes. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
