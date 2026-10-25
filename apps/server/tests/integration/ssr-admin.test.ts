import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { browserAgent, testApp } from '../helpers/agent.js';
import { addReview, createCourse, createUser, enroll, TEST_PASSWORD } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
const CYRILLIC = /[А-Яа-яІіЇїЄєҐґ]/;
const REASON = 'The course needs clearer lesson descriptions.';

let agent: Awaited<ReturnType<typeof browserAgent>>['agent'];
let csrfToken: string;
const ids: Record<string, string> = {};

beforeAll(async () => {
  await resetDb();
  const admin = await createUser({ role: 'admin', name: 'Admin Person' });
  ({ agent, csrfToken } = await browserAgent(app));
  await agent.post('/login').type('form').send({ _csrf: csrfToken, email: admin.email, password: TEST_PASSWORD });

  const student = await createUser({ name: 'Student Person' });
  const course = await createCourse({ title: 'Pending course', status: 'pending_review', lessons: ['text', 'quiz'] });
  const published = await createCourse({ title: 'Published course' });
  const enrollment = await enroll(student.id, published.id);
  const review = await addReview(student.id, published.id, 4);
  const application = await db.instructorApplication.create({ data: { userId: student.id, motivation: 'I would like to teach practical programming courses.' } });
  await db.certificate.create({ data: { enrollmentId: enrollment.id, code: 'KMNPQRSTUV', studentName: 'Student Person', courseTitle: 'Published course', authorName: 'Author' } });
  Object.assign(ids, { student: student.id, course: course.id, review: review.id, application: application.id });
});

/** Visible text without scripts, tags and fragments marked as Ukrainian content. */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<(\w+)[^>]*\slang="uk"[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, ' ');
}

describe('admin pages', () => {
  const pages = () => [
    '/admin',
    '/admin/users',
    `/admin/users/${ids.student}`,
    '/admin/courses',
    '/admin/courses/moderation',
    `/admin/courses/${ids.course}`,
    '/admin/applications',
    `/admin/applications/${ids.application}`,
    '/admin/categories',
    '/admin/reviews',
    '/admin/certificates',
    '/admin/audit-log',
  ];

  it('render in Ukrainian and in English', async () => {
    for (const path of pages()) {
      const uk = await agent.get(`${path}?lang=uk`);
      expect(uk.status, path).toBe(200);
      expect(uk.text).toContain('<html lang="uk"');
      const en = await agent.get(`${path}?lang=en`);
      expect(en.status, path).toBe(200);
      const leftover = visibleText(en.text).match(new RegExp(`.{0,30}${CYRILLIC.source}.{0,30}`));
      expect(leftover?.[0] ?? null, path).toBeNull();
    }
  });

  it('marks the current section and shows work counters', async () => {
    const response = await agent.get('/admin/courses/moderation?lang=en');
    expect(response.text).toMatch(/aria-current="page"[^>]*>[\s\S]*?Moderation/);
    expect(response.text).toContain('tag tag-yellow');
  });
});

describe('admin actions', () => {
  it('reject forms without the CSRF token', async () => {
    const response = await agent.post(`/admin/reviews/${ids.review}/hide`).type('form').send({ reason: REASON });
    expect(response.status).toBe(403);
  });

  it('redirect back with a flash message (PRG)', async () => {
    const hidden = await agent
      .post(`/admin/reviews/${ids.review}/hide`)
      .type('form')
      .send({ _csrf: csrfToken, reason: REASON, returnTo: '/admin/reviews' });
    expect(hidden.status).toBe(303);
    expect(hidden.headers.location).toBe('/admin/reviews');
    expect((await agent.get('/admin/reviews?lang=en')).text).toContain('Done.');
    expect((await db.review.findUniqueOrThrow({ where: { id: ids.review } })).status).toBe('hidden');
  });

  it('show the reason of a refused action', async () => {
    const tooShort = await agent
      .post(`/admin/courses/${ids.course}/reject`)
      .type('form')
      .send({ _csrf: csrfToken, reason: 'short', returnTo: `/admin/courses/${ids.course}` });
    expect(tooShort.headers.location).toBe(`/admin/courses/${ids.course}`);
    expect((await agent.get(`/admin/courses/${ids.course}?lang=en`)).text).toContain('Please check the entered data.');

    await agent.post(`/admin/courses/${ids.course}/approve`).type('form').send({ _csrf: csrfToken });
    expect((await db.course.findUniqueOrThrow({ where: { id: ids.course } })).status).toBe('published');
  });

  it('create a category from the form', async () => {
    await agent.post('/admin/categories').type('form').send({ _csrf: csrfToken, nameUk: 'Музика', nameEn: 'Music', accent: 'magenta', sortOrder: '3' });
    expect(await db.category.count({ where: { slug: 'music' } })).toBe(1);
  });
});
