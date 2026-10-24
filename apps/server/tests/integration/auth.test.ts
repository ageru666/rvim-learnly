import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { sha256 } from '../../src/lib/tokens.js';
import { browserAgent, testApp } from '../helpers/agent.js';
import { createUser, TEST_PASSWORD } from '../helpers/factories.js';
import { waitForEmail } from '../helpers/mailbox.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
const uniqueEmail = () => `auth-${randomUUID()}@test.local`;

beforeAll(resetDb);

function register(email: string, overrides: Record<string, unknown> = {}, locale = 'uk') {
  return request(app)
    .post('/api/v1/auth/register')
    .set('Accept-Language', locale)
    .send({ name: 'Новий Студент', email, password: 'secret123', acceptTerms: true, ...overrides });
}

describe('registration', () => {
  it('creates a student, signs them in and sends a verification email in their language', async () => {
    const email = uniqueEmail();
    const response = await register(email, {}, 'en');
    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ email, role: 'student', locale: 'en', emailVerified: false });
    expect(response.body.accessToken).toBeTruthy();
    expect(String(response.headers['set-cookie'])).toContain('refresh_token=');

    const mail = await waitForEmail(email);
    expect(mail.html).toContain('/verify-email?token=');
    expect(mail.html).toContain('Verify');
  });

  it('localizes validation messages', async () => {
    const uk = await register(uniqueEmail(), { password: 'onlyletters' }, 'uk');
    const en = await register(uniqueEmail(), { password: 'onlyletters' }, 'en');
    expect(uk.status).toBe(400);
    const message = (body: { error: { details: { path: string; message: string }[] } }) =>
      body.error.details.find((detail) => detail.path === 'password')?.message;
    expect(message(uk.body)).toBe('Пароль має містити щонайменше одну літеру та одну цифру.');
    expect(message(en.body)).toBe('The password must contain at least one letter and one digit.');
  });

  it('rejects a taken email regardless of case', async () => {
    const email = uniqueEmail();
    await register(email);
    const duplicate = await register(email.toUpperCase());
    expect(duplicate.status).toBe(409);
  });
});

describe('login', () => {
  it('returns a generic error for wrong credentials', async () => {
    const user = await createUser();
    const wrongPassword = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'nope1234' });
    const unknownEmail = await request(app).post('/api/v1/auth/login').send({ email: uniqueEmail(), password: 'nope1234' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('locks login after 5 failures within 15 minutes', async () => {
    const user = await createUser();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'wrong123' });
    }
    const locked = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
    expect(locked.status).toBe(429);
    expect(locked.body.error.retryAfterSec).toBeGreaterThan(0);
  });

  it('refuses blocked users', async () => {
    const user = await createUser({ status: 'blocked' });
    const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
    expect(response.status).toBe(403);
  });

  it('is limited by the auth rate limiter when configured low', async () => {
    const limited = testApp({ rateLimits: { globalPerMin: 1000, authPerMin: 3 } });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      statuses.push((await request(limited).post('/api/v1/auth/login').send({ email: uniqueEmail(), password: 'x1' })).status);
    }
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('sessions', () => {
  async function login() {
    const user = await createUser();
    const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
    return { user, tokens: response.body as { accessToken: string; refreshToken: string } };
  }

  it('authenticates Bearer requests and rotates refresh tokens', async () => {
    const { user, tokens } = await login();
    const me = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(me.body.id).toBe(user.id);

    const refreshed = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.refreshToken).not.toBe(tokens.refreshToken);
  });

  it('revokes the whole family when a rotated token is reused', async () => {
    const { tokens } = await login();
    const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    await db.refreshToken.update({
      where: { tokenHash: sha256(tokens.refreshToken) },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });
    const reused = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    expect(reused.status).toBe(401);
    const latest = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: first.body.refreshToken });
    expect(latest.status).toBe(401);
  });

  it('logs out and logs out everywhere', async () => {
    const { tokens } = await login();
    const logout = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${tokens.accessToken}`).send({ refreshToken: tokens.refreshToken });
    expect(logout.status).toBe(204);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken })).status).toBe(401);

    const other = await login();
    const second = await request(app).post('/api/v1/auth/login').send({ email: other.user.email, password: TEST_PASSWORD });
    await request(app).post('/api/v1/auth/logout-all').set('Authorization', `Bearer ${other.tokens.accessToken}`);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: second.body.refreshToken })).status).toBe(401);
  });

  it('keeps an SSR visitor signed in when the access cookie expired', async () => {
    const { user, tokens } = await login();
    const response = await request(app)
      .get('/courses')
      .set('Cookie', [`access_token=expired.jwt.value; refresh_token=${tokens.refreshToken}`]);
    expect(response.status).toBe(200);
    expect(response.text).toContain(user.name);
    const cookies = String(response.headers['set-cookie']);
    expect(cookies).toContain('access_token=');
    expect(cookies).not.toContain(`refresh_token=${tokens.refreshToken}`);
  });

  it('requires CSRF for cookie requests but not for Bearer ones', async () => {
    const user = await createUser();
    const { agent, csrfToken } = await browserAgent(app);
    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrfToken).send({ email: user.email, password: TEST_PASSWORD });
    const withoutToken = await agent.post('/api/v1/auth/logout-all');
    expect(withoutToken.status).toBe(403);
    const withToken = await agent.post('/api/v1/auth/logout-all').set('X-CSRF-Token', csrfToken);
    expect(withToken.status).toBe(204);
  });
});

describe('SSR login and registration', () => {
  it('signs in through the login form and redirects to returnTo', async () => {
    const user = await createUser();
    const { agent, csrfToken } = await browserAgent(app);
    const response = await agent
      .post('/login')
      .type('form')
      .send({ _csrf: csrfToken, email: user.email, password: TEST_PASSWORD, returnTo: '/courses' });
    expect(response.status).toBe(303);
    expect(response.headers.location).toBe('/courses');
  });

  it('re-renders the form with field errors', async () => {
    const { agent, csrfToken } = await browserAgent(app);
    const response = await agent
      .post('/register')
      .set('Accept-Language', 'en')
      .type('form')
      .send({ _csrf: csrfToken, name: 'A', email: 'bad', password: 'x', passwordConfirm: 'y' });
    expect(response.status).toBe(422);
    expect(response.text).toContain('aria-invalid="true"');
    expect(response.text).toContain('You need to accept the terms of use.');
  });

  it('ignores external returnTo values', async () => {
    const user = await createUser();
    const { agent, csrfToken } = await browserAgent(app);
    const response = await agent
      .post('/login')
      .type('form')
      .send({ _csrf: csrfToken, email: user.email, password: TEST_PASSWORD, returnTo: 'https://evil.example' });
    expect(response.headers.location).toBe('/app');
  });
});
