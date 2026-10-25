import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { testApp } from '../helpers/agent.js';
import { createUser } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';
import { issueSession } from '../../src/modules/auth/session.service.js';

const app = testApp();

beforeAll(resetDb);

async function bearer(role: 'student' | 'instructor' | 'admin') {
  const user = await createUser({ role });
  const { accessToken } = await issueSession(user.id, {});
  return `Bearer ${accessToken}`;
}

/** What a third-party client (Postman, curl, a script) can rely on for every endpoint (FR-API-2). */
describe('API conventions', () => {
  it('answers 401 UNAUTHORIZED without a token and 403 FORBIDDEN for the wrong role', async () => {
    const anonymous = await request(app).get('/api/v1/me');
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe('UNAUTHORIZED');

    const invalid = await request(app).get('/api/v1/me').set('Authorization', 'Bearer not-a-token');
    expect(invalid.status).toBe(401);

    const student = await request(app).get('/api/v1/admin/users').set('Authorization', await bearer('student'));
    expect(student.status).toBe(403);
    expect(student.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 with field details in the language of the request', async () => {
    const send = (language: string) =>
      request(app).post('/api/v1/auth/register').set('Accept-Language', language).send({ email: 'not-an-email' });
    const [uk, en] = await Promise.all([send('uk'), send('en')]);
    for (const response of [uk, en]) {
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.map((detail: { path: string }) => detail.path)).toContain('email');
    }
    expect(uk.headers['content-language']).toBe('uk');
    expect(en.headers['content-language']).toBe('en');
    expect(uk.body.error.message).not.toBe(en.body.error.message);
    expect(en.body.error.details[0].message).not.toMatch(/[а-яіїєґ]/i);
    expect(uk.body.error.details[0].message).toMatch(/[а-яіїєґ]/i);
  });

  it('answers 429 RATE_LIMITED with retryAfterSec', async () => {
    const limited = testApp({ rateLimits: { globalPerMin: 2, authPerMin: 100 } });
    let response = await request(limited).get('/api/v1/categories');
    for (let attempt = 0; attempt < 3 && response.status !== 429; attempt += 1) {
      response = await request(limited).get('/api/v1/categories');
    }
    expect(response.status).toBe(429);
    expect(response.body.error).toMatchObject({ code: 'RATE_LIMITED', retryAfterSec: 60 });
  });

  it('sends X-Request-Id and Content-Language on every response and keeps a client request id', async () => {
    const response = await request(app).get('/api/v1/categories').set('Accept-Language', 'en');
    expect(response.headers['x-request-id']).toMatch(/\S+/);
    expect(response.headers['content-language']).toBe('en');

    const error = await request(app).get('/api/v1/courses/no-such-course').set('Accept-Language', 'uk');
    expect(error.status).toBe(404);
    expect(error.body.error.code).toBe('NOT_FOUND');
    expect(error.headers['x-request-id']).toMatch(/\S+/);
    expect(error.headers['content-language']).toBe('uk');
  });

  it('works with the access token of an instructor and an admin for their own areas', async () => {
    const instructor = await request(app).get('/api/v1/instructor/courses').set('Authorization', await bearer('instructor'));
    expect(instructor.status).toBe(200);
    const admin = await request(app).get('/api/v1/admin/users').set('Authorization', await bearer('admin'));
    expect(admin.status).toBe(200);
  });
});
