import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { testApp } from '../helpers/agent.js';
import { createUser, TEST_PASSWORD } from '../helpers/factories.js';
import { countEmails, tokenFrom, waitForEmail } from '../helpers/mailbox.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();

beforeAll(resetDb);

async function signedIn(overrides: Parameters<typeof createUser>[0] = {}) {
  const user = await createUser({ email: `account-${randomUUID()}@test.local`, ...overrides });
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  const tokens = response.body as { accessToken: string; refreshToken: string };
  return { user, tokens, auth: { Authorization: `Bearer ${tokens.accessToken}` } };
}

describe('email verification', () => {
  it('verifies once and rejects reused or expired links', async () => {
    const email = `verify-${randomUUID()}@test.local`;
    await request(app).post('/api/v1/auth/register').send({ name: 'Verify Me', email, password: 'secret123', acceptTerms: true });
    const token = tokenFrom(await waitForEmail(email), '/verify-email');

    const verified = await request(app).post('/api/v1/auth/email/verify').send({ token });
    expect(verified.status).toBe(200);
    expect(verified.body.user.emailVerified).toBe(true);

    expect((await request(app).post('/api/v1/auth/email/verify').send({ token })).status).toBe(422);
  });

  it('rejects an expired link', async () => {
    const email = `expired-${randomUUID()}@test.local`;
    await request(app).post('/api/v1/auth/register').send({ name: 'Late User', email, password: 'secret123', acceptTerms: true });
    const token = tokenFrom(await waitForEmail(email), '/verify-email');
    await db.oneTimeToken.updateMany({ where: { email }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).post('/api/v1/auth/email/verify').send({ token })).status).toBe(422);
  });

  it('throttles resending to once a minute', async () => {
    const { auth } = await signedIn({ verified: false });
    expect((await request(app).post('/api/v1/auth/email/resend').set(auth)).status).toBe(204);
    expect((await request(app).post('/api/v1/auth/email/resend').set(auth)).status).toBe(429);
  });

  it('confirms an email change on the new address only', async () => {
    const { user, auth } = await signedIn();
    const newEmail = `new-${randomUUID()}@test.local`;
    const wrongPassword = await request(app).post('/api/v1/me/email').set(auth).send({ currentPassword: 'nope', newEmail });
    expect(wrongPassword.status).toBe(422);

    expect((await request(app).post('/api/v1/me/email').set(auth).send({ currentPassword: TEST_PASSWORD, newEmail })).status).toBe(204);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(user.email);

    const token = tokenFrom(await waitForEmail(newEmail), '/verify-email');
    await request(app).post('/api/v1/auth/email/verify').send({ token });
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(newEmail);
  });
});

describe('password recovery', () => {
  it('answers the same for unknown emails and mails only real users', async () => {
    const unknown = `unknown-${randomUUID()}@test.local`;
    expect((await request(app).post('/api/v1/auth/password/forgot').send({ email: unknown })).status).toBe(204);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(await countEmails(unknown)).toBe(0);
  });

  it('resets the password once and ends other sessions', async () => {
    const { user, tokens } = await signedIn({ locale: 'en' });
    await request(app).post('/api/v1/auth/password/forgot').send({ email: user.email });
    const mail = await waitForEmail(user.email);
    expect(mail.subject).toMatch(/password/i);
    const token = tokenFrom(mail, '/reset-password');

    expect((await request(app).post('/api/v1/auth/password/reset').send({ token, password: 'brandnew1' })).status).toBe(204);
    expect((await request(app).post('/api/v1/auth/password/reset').send({ token, password: 'another12' })).status).toBe(422);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'brandnew1' })).status).toBe(200);
  });

  it('changes the password and keeps only the current session', async () => {
    const { user, tokens, auth } = await signedIn();
    const other = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
    const changed = await request(app)
      .put('/api/v1/me/password')
      .set(auth)
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'changed123', refreshToken: tokens.refreshToken });
    expect(changed.status).toBe(204);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: other.body.refreshToken })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken })).status).toBe(200);
  });
});
