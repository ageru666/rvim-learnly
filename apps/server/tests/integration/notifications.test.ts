import { NOTIFICATION_TYPES } from '@learnly/contracts/enums';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { browserAgent, testApp } from '../helpers/agent.js';
import { createUser, TEST_PASSWORD } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
const API = '/api/v1/me/notifications';
const COURSE_ID = '01970000-0000-7000-8000-00000000c001';

let user: Awaited<ReturnType<typeof createUser>>;
let auth: Record<string, string>;

async function bearer(account: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: account.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

beforeAll(async () => {
  await resetDb();
  user = await createUser();
  auth = await bearer(user);
  const start = Date.now() - NOTIFICATION_TYPES.length * 1000;
  await db.notification.createMany({
    data: NOTIFICATION_TYPES.map((type, index) => ({
      userId: user.id,
      type,
      payload: { courseId: COURSE_ID, courseTitle: 'Course', courseSlug: 'course', certificateCode: 'K7QW2M9XTR', applicationId: COURSE_ID },
      createdAt: new Date(start + index * 1000),
    })),
  });
});

describe('my notifications', () => {
  it('lists newest first with pagination and builds a link for every type', async () => {
    const first = await request(app).get(`${API}?limit=5`).set(auth);
    expect(first.body).toMatchObject({ total: NOTIFICATION_TYPES.length, page: 1 });
    expect(first.body.items[0].type).toBe(NOTIFICATION_TYPES.at(-1));
    const all = await request(app).get(`${API}?limit=100`).set(auth);
    expect(all.body.items.every((item: { link: string }) => item.link.startsWith('/'))).toBe(true);
    expect(all.body.items.find((item: { type: string }) => item.type === 'course_completed').link).toBe('/certificates/K7QW2M9XTR');
  });

  it('counts unread, marks one and then all as read', async () => {
    expect((await request(app).get(`${API}/unread-count`).set(auth)).body).toEqual({ count: NOTIFICATION_TYPES.length });
    const [newest] = (await request(app).get(API).set(auth)).body.items as { id: string }[];
    expect((await request(app).post(`${API}/${newest?.id ?? ''}/read`).set(auth)).status).toBe(204);
    expect((await request(app).get(`${API}/unread-count`).set(auth)).body.count).toBe(NOTIFICATION_TYPES.length - 1);
    await request(app).post(`${API}/read-all`).set(auth);
    expect((await request(app).get(`${API}/unread-count`).set(auth)).body.count).toBe(0);
  });

  it("answers 404 for somebody else's notification", async () => {
    const [mine] = (await request(app).get(API).set(auth)).body.items as { id: string }[];
    const other = await bearer(await createUser());
    expect((await request(app).post(`${API}/${mine?.id ?? ''}/read`).set(other)).status).toBe(404);
  });

  it('shows the unread counter in the site header and lists notifications on the dashboard', async () => {
    const fresh = await createUser({ name: 'Counter Person' });
    await db.notification.createMany({ data: [1, 2].map(() => ({ userId: fresh.id, type: 'course_approved', payload: { courseSlug: 'x', courseTitle: 'X' } })) });
    const { agent, csrfToken } = await browserAgent(app);
    await agent.post('/login').type('form').send({ _csrf: csrfToken, email: fresh.email, password: TEST_PASSWORD });
    const page = await agent.get('/courses?lang=en');
    expect(page.text).toContain('aria-label="Notifications: 2 unread"');
    const dashboard = await agent.get('/api/v1/me/dashboard');
    expect(dashboard.body.notifications).toHaveLength(2);
  });
});
