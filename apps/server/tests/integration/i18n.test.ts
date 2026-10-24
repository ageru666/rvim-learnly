import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { browserAgent, testApp } from '../helpers/agent.js';
import { createCategory, createCourse, createUser, TEST_PASSWORD } from '../helpers/factories.js';
import { waitForEmail } from '../helpers/mailbox.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
const CYRILLIC = /[А-Яа-яІіЇїЄєҐґ]/;

let englishCourse: Awaited<ReturnType<typeof createCourse>>;
let ukrainianCourse: Awaited<ReturnType<typeof createCourse>>;

beforeAll(async () => {
  await resetDb();
  const category = await createCategory({ nameEn: 'Languages', nameUk: 'Мови' });
  englishCourse = await createCourse({
    title: 'English for developers',
    shortDescription: 'Reading documentation with ease',
    slug: 'english-for-developers',
    language: 'en',
    categoryId: category.id,
    lessons: [{ type: 'text', isPreview: true }, 'video', 'quiz'],
  });
  ukrainianCourse = await createCourse({
    title: 'Українська для початківців',
    shortDescription: 'Перші кроки',
    slug: 'ukrainian-basics',
    language: 'uk',
    categoryId: category.id,
  });
});

async function bearer(user: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

/** Visible text without scripts, styles, tags and fragments explicitly marked as Ukrainian content. */
function englishText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(\w+)[^>]*\slang="uk"[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, ' ');
}

describe('first visit and explicit choice', () => {
  it('follows Accept-Language and falls back to Ukrainian', async () => {
    const english = await request(app).get('/').set('Accept-Language', 'en-GB,en;q=0.8');
    expect(english.text).toContain('<html lang="en"');
    expect(english.headers['content-language']).toBe('en');

    const german = await request(app).get('/').set('Accept-Language', 'de');
    expect(german.text).toContain('<html lang="uk"');
    expect(german.headers['content-language']).toBe('uk');
  });

  it('lets ?lang win over the account locale and remembers it', async () => {
    const user = await createUser({ locale: 'uk' });
    const response = await request(app).get('/courses?lang=en').set(await bearer(user));
    expect(response.text).toContain('<html lang="en"');
    expect(String(response.headers['set-cookie'])).toContain('locale=en');
  });

  it('switches through POST /locale with CSRF and stores it for a signed-in user', async () => {
    const user = await createUser({ locale: 'uk' });
    const { agent, csrfToken } = await browserAgent(app);
    await agent.post('/login').type('form').send({ _csrf: csrfToken, email: user.email, password: TEST_PASSWORD });

    expect((await agent.post('/locale').type('form').send({ locale: 'en' })).status).toBe(403);
    const switched = await agent.post('/locale').type('form').send({ locale: 'en', _csrf: csrfToken, returnTo: '/courses' });
    expect(switched.status).toBe(303);
    expect(String(switched.headers['set-cookie'])).toContain('locale=en');
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).locale).toBe('en');
  });

  it('opens a new device in the account language after login', async () => {
    const user = await createUser({ locale: 'en' });
    const { agent, csrfToken } = await browserAgent(app);
    const login = await agent.post('/login').type('form').send({ _csrf: csrfToken, email: user.email, password: TEST_PASSWORD });
    expect(String(login.headers['set-cookie'])).toContain('locale=en');
    expect((await agent.get('/courses')).text).toContain('<html lang="en"');
  });

  it('saves the account locale through PATCH /me', async () => {
    const user = await createUser({ locale: 'uk' });
    const response = await request(app).patch('/api/v1/me').set(await bearer(user)).send({ locale: 'en' });
    expect(response.status).toBe(200);
    expect(response.body.locale).toBe('en');
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).locale).toBe('en');
  });
});

describe('server messages', () => {
  it('translates API messages and keeps codes', async () => {
    const uk = await request(app).get('/api/v1/courses/missing').set('Accept-Language', 'uk');
    const en = await request(app).get('/api/v1/courses/missing').set('Accept-Language', 'en');
    expect(uk.body.error.code).toBe(en.body.error.code);
    expect(uk.body.error.message).toMatch(CYRILLIC);
    expect(en.body.error.message).not.toMatch(CYRILLIC);
  });

  it('writes emails in the recipient language, not in the language of the request', async () => {
    const user = await createUser({ locale: 'en', email: `i18n-${randomUUID()}@test.local` });
    await request(app).post('/api/v1/auth/password/forgot').set('Accept-Language', 'uk').send({ email: user.email });
    const mail = await waitForEmail(user.email);
    expect(mail.subject).toBe('Reset your Learnly password');
    expect(englishText(mail.html)).not.toMatch(CYRILLIC);
  });
});

describe('content language (FR-I18N-4)', () => {
  it('filters the catalog by course language and marks it on cards and pages', async () => {
    const api = await request(app).get('/api/v1/courses?language=en');
    expect(api.body.items.map((course: { slug: string }) => course.slug)).toEqual(['english-for-developers']);

    const catalog = await request(app).get('/courses?language=uk&lang=en');
    expect(catalog.text).toContain('Українська для початківців');
    expect(catalog.text).not.toContain('English for developers');

    const page = await request(app).get(`/courses/${ukrainianCourse.slug}?lang=en`);
    expect(page.text).toMatch(/<h1[^>]*lang="uk"[^>]*>Українська для початківців<\/h1>/);
  });
});

describe('English completeness (T111)', () => {
  const PUBLIC_PAGES = [
    '/',
    '/courses',
    '/courses/english-for-developers',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password?token=x',
    '/verify-email?token=x',
    '/about',
    '/terms',
    '/privacy',
    '/contacts',
    '/faq',
    '/no-such-page',
  ];

  it.each(PUBLIC_PAGES)('%s has no Ukrainian interface text in English', async (path) => {
    const separator = path.includes('?') ? '&' : '?';
    const response = await request(app).get(`${path}${separator}lang=en`);
    const leftover = englishText(response.text).match(new RegExp(`.{0,30}${CYRILLIC.source}.{0,30}`));
    expect(leftover?.[0] ?? null).toBeNull();
  });

  it('shows the instructor page and the preview lesson in English', async () => {
    for (const path of [`/instructors/${englishCourse.authorId}`, `/courses/english-for-developers/preview/${englishCourse.lessons[0]?.id ?? ''}`]) {
      const response = await request(app).get(`${path}?lang=en`);
      expect(response.status).toBe(200);
      expect(englishText(response.text)).not.toMatch(CYRILLIC);
    }
  });
});
