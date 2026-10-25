import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { browserAgent, testApp } from '../helpers/agent.js';
import { createUser, TEST_PASSWORD } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
const MOTIVATION = 'I have taught web development for five years and want to share practical courses.';
const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(resetDb);

async function bearer(user: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

function apply(auth: Record<string, string>, body: object = { motivation: MOTIVATION }) {
  return request(app).post('/api/v1/me/instructor-application').set(auth).send(body);
}

describe('instructor applications', () => {
  it('accepts one pending application and notifies the administrators (BR-U1)', async () => {
    const admin = await createUser({ role: 'admin' });
    const auth = await bearer(await createUser());
    const created = await apply(auth, { motivation: MOTIVATION, experience: 'github.com/me' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ status: 'pending', experience: 'github.com/me' });
    expect(await db.notification.count({ where: { userId: admin.id, type: 'admin_application_submitted' } })).toBe(1);

    const second = await apply(auth);
    expect(second.status).toBe(422);
    expect(second.body.error.rule).toBe('BR-U1');
    expect((await request(app).get('/api/v1/me/instructor-application').set(auth)).body).toMatchObject({
      application: { status: 'pending' },
      canApply: false,
    });
  });

  it('waits 7 days after a rejection', async () => {
    const user = await createUser();
    const auth = await bearer(user);
    await db.instructorApplication.create({
      data: { userId: user.id, motivation: MOTIVATION, status: 'rejected', reviewedAt: new Date(Date.now() - 2 * DAY_MS) },
    });
    const mine = await request(app).get('/api/v1/me/instructor-application').set(auth);
    expect(mine.body.canApply).toBe(false);
    expect(Date.parse(mine.body.canApplyAt)).toBeGreaterThan(Date.now());
    expect((await apply(auth)).status).toBe(422);

    await db.instructorApplication.updateMany({ where: { userId: user.id }, data: { reviewedAt: new Date(Date.now() - 8 * DAY_MS) } });
    expect((await apply(auth)).status).toBe(201);
  });

  it('requires a verified email (BR-U4) and a long enough motivation', async () => {
    const unverified = await bearer(await createUser({ verified: false }));
    const blocked = await apply(unverified);
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.rule).toBe('BR-U4');

    expect((await apply(await bearer(await createUser()), { motivation: 'Too short' })).status).toBe(400);
  });

  it('is not available to instructors', async () => {
    const auth = await bearer(await createUser({ role: 'instructor' }));
    expect((await apply(auth)).status).toBe(422);
  });

  it('works from the SSR "Become an instructor" page', async () => {
    const user = await createUser();
    const { agent, csrfToken } = await browserAgent(app);
    expect((await agent.get('/teach')).text).toContain('href="/login?returnTo=%2Fteach"');
    await agent.post('/login').type('form').send({ _csrf: csrfToken, email: user.email, password: TEST_PASSWORD });

    const page = await agent.get('/teach');
    expect(page.text).toContain('action="/teach/apply"');
    const invalid = await agent.post('/teach/apply').type('form').send({ _csrf: csrfToken, motivation: 'short' });
    expect(invalid.status).toBe(422);
    expect(invalid.text).toContain('aria-invalid="true"');

    const sent = await agent.post('/teach/apply').type('form').send({ _csrf: csrfToken, motivation: MOTIVATION, experience: '' });
    expect(sent.headers.location).toBe('/teach');
    expect(await db.instructorApplication.count({ where: { userId: user.id, status: 'pending' } })).toBe(1);
  });
});
