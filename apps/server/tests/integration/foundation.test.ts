import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { browserAgent, testApp } from '../helpers/agent.js';
import { createUser } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';
import { db } from '../../src/lib/db.js';
import { issueSession } from '../../src/modules/auth/session.service.js';

const app = testApp();

beforeAll(resetDb);

describe('system endpoints', () => {
  it('reports health and serves the OpenAPI document', async () => {
    const health = await request(app).get('/health');
    expect(health.body).toEqual({ status: 'ok', db: 'ok', version: '1.0.0' });
    expect(health.headers['x-request-id']).toBeTruthy();

    const document = await request(app).get('/api/openapi.json');
    expect(document.body.openapi).toBe('3.1.0');
    expect(document.body.paths['/health']).toBeDefined();
  });

  it('sends the security headers on pages and the API (docs/security-notes.md)', async () => {
    for (const path of ['/', '/api/v1/courses']) {
      const response = await request(app).get(path);
      const csp = String(response.headers['content-security-policy']);
      expect(csp, path).toContain("script-src 'self'");
      expect(csp, path).toContain("frame-ancestors 'none'");
      expect(csp, path).toContain("object-src 'none'");
      expect(response.headers['x-content-type-options'], path).toBe('nosniff');
      expect(response.headers['referrer-policy'], path).toBe('no-referrer');
      expect(response.headers['permissions-policy'], path).toBe('camera=(), microphone=(), geolocation=(), payment=(), usb=()');
      expect(response.headers['x-powered-by'], path).toBeUndefined();
      // Served over plain HTTP here (COOKIE_SECURE=false), so HSTS would be meaningless.
      expect(response.headers['strict-transport-security'], path).toBeUndefined();
    }
  });
});

describe('locale resolution (FR-I18N-2)', () => {
  it('uses Accept-Language, then falls back to Ukrainian', async () => {
    const english = await request(app).get('/missing-page').set('Accept-Language', 'en-GB,en;q=0.9');
    expect(english.status).toBe(404);
    expect(english.text).toContain('<html lang="en"');
    expect(english.headers['content-language']).toBe('en');

    const other = await request(app).get('/missing-page').set('Accept-Language', 'de');
    expect(other.text).toContain('<html lang="uk"');
  });

  it('lets ?lang win and remembers it in a cookie', async () => {
    const response = await request(app).get('/missing-page?lang=en').set('Accept-Language', 'uk');
    expect(response.text).toContain('<html lang="en"');
    expect(String(response.headers['set-cookie'])).toContain('locale=en');
  });

  it('localizes API errors while keeping the code', async () => {
    const uk = await request(app).get('/api/v1/missing').set('Accept-Language', 'uk');
    const en = await request(app).get('/api/v1/missing').set('Accept-Language', 'en');
    expect(uk.body.error.code).toBe('NOT_FOUND');
    expect(en.body.error.code).toBe('NOT_FOUND');
    expect(uk.body.error.message).not.toBe(en.body.error.message);
  });
});

describe('CSRF protection', () => {
  it('rejects a cookie request without the token and accepts it with the token', async () => {
    const { agent, csrfToken } = await browserAgent(app);
    const rejected = await agent.post('/locale').type('form').send({ locale: 'en' });
    expect(rejected.status).toBe(403);

    const accepted = await agent.post('/locale').type('form').send({ locale: 'en', _csrf: csrfToken });
    expect(accepted.status).toBe(303);
  });

  it('exempts Bearer requests', async () => {
    const user = await createUser();
    const { accessToken } = await issueSession(user.id, {});
    const response = await request(app)
      .post('/locale')
      .set('Authorization', `Bearer ${accessToken}`)
      .type('form')
      .send({ locale: 'en' });
    expect(response.status).toBe(303);
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.locale).toBe('en');
  });
});

describe('sessions', () => {
  it('renews an expired access cookie from the refresh cookie', async () => {
    const user = await createUser({ name: 'Cookie User' });
    const { refreshToken } = await issueSession(user.id, {});
    const response = await request(app)
      .get('/missing-page')
      .set('Cookie', [`access_token=expired.token.value`, `refresh_token=${refreshToken}`]);
    const cookies = String(response.headers['set-cookie']);
    expect(cookies).toContain('access_token=');
    expect(cookies).toContain('refresh_token=');
    expect(response.text).toContain('Cookie User');
  });

  it('ignores blocked users', async () => {
    const user = await createUser({ status: 'blocked', name: 'Blocked Person' });
    const { accessToken } = await issueSession(user.id, {});
    const response = await request(app)
      .get('/missing-page')
      .set('Cookie', [`access_token=${accessToken}`]);
    expect(response.text).not.toContain('Blocked Person');
  });
});
