import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { randomToken, sha256, signAccessToken, verifyAccessToken } from '../../src/lib/tokens.js';

describe('access tokens', () => {
  it('round-trips the user id', async () => {
    const token = await signAccessToken('user-1');
    await expect(verifyAccessToken(token)).resolves.toBe('user-1');
  });

  it('rejects tampered, foreign and expired tokens', async () => {
    const token = await signAccessToken('user-1');
    await expect(verifyAccessToken(`${token}x`)).resolves.toBeNull();
    await expect(verifyAccessToken('not-a-jwt')).resolves.toBeNull();

    const foreign = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuer('learnly')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('another-secret-another-secret-0000'));
    await expect(verifyAccessToken(foreign)).resolves.toBeNull();

    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuer('learnly')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET ?? ''));
    await expect(verifyAccessToken(expired)).resolves.toBeNull();
  });
});

describe('opaque tokens', () => {
  it('are random and hashed deterministically', () => {
    const first = randomToken();
    expect(first).not.toBe(randomToken());
    expect(first.length).toBeGreaterThanOrEqual(43);
    expect(sha256(first)).toBe(sha256(first));
    expect(sha256(first)).not.toBe(first);
  });
});
