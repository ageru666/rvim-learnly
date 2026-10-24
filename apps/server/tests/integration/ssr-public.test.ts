import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { testApp } from '../helpers/agent.js';
import { createCategory, createCourse } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
let course: Awaited<ReturnType<typeof createCourse>>;

beforeAll(async () => {
  await resetDb();
  const category = await createCategory({ nameEn: 'Design', nameUk: 'Дизайн', accent: 'pink' });
  course = await createCourse({
    title: 'Design systems',
    slug: 'design-systems',
    categoryId: category.id,
    tags: ['ui'],
    lessons: [{ type: 'text', isPreview: true }, 'text', 'quiz'],
  });
  await createCourse({ title: 'Hidden draft', slug: 'hidden-draft', status: 'draft' });
});

describe('public pages', () => {
  it('renders the home page in both languages', async () => {
    const uk = await request(app).get('/').set('Accept-Language', 'uk');
    expect(uk.status).toBe(200);
    expect(uk.text).toContain('Design systems');
    expect(uk.text).toContain('<html lang="uk"');

    const en = await request(app).get('/?lang=en');
    expect(en.text).toContain('<html lang="en"');
  });

  it('renders the catalog with filters from the query string', async () => {
    const response = await request(app).get('/courses?search=design&sort=newest');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Design systems');
    expect(response.text).not.toContain('Hidden draft');
    expect(response.text).toContain('value="design"');
    expect(response.text).toContain('href="/courses?tag=ui"');
  });

  it('renders the course page with Open Graph data and the curriculum', async () => {
    const response = await request(app).get('/courses/design-systems').set('Accept-Language', 'en');
    expect(response.status).toBe(200);
    expect(response.text).toContain('property="og:title"');
    expect(response.text).toContain('Lesson 3');
  });

  it('opens preview lessons and redirects for the others', async () => {
    const [preview, regular] = course.lessons;
    const open = await request(app).get(`/courses/design-systems/preview/${preview?.id ?? ''}`);
    expect(open.status).toBe(200);
    expect(open.text).toContain('Lesson content');

    const closed = await request(app).get(`/courses/design-systems/preview/${regular?.id ?? ''}`);
    expect(closed.status).toBe(302);
    expect(closed.headers.location).toBe('/courses/design-systems');
  });

  it('renders the author page', async () => {
    const response = await request(app).get(`/instructors/${course.authorId}`);
    expect(response.status).toBe(200);
    expect(response.text).toContain('Design systems');
  });

  it.each(['about', 'faq', 'terms', 'privacy', 'contacts'])('renders the %s page in both languages', async (page) => {
    const uk = await request(app).get(`/${page}`).set('Accept-Language', 'uk');
    const en = await request(app).get(`/${page}`).set('Accept-Language', 'en');
    expect(uk.status).toBe(200);
    expect(en.status).toBe(200);
    expect(uk.text).not.toBe(en.text);
  });

  it('returns 404 pages for unknown and unpublished courses', async () => {
    expect((await request(app).get('/courses/hidden-draft')).status).toBe(404);
    expect((await request(app).get('/courses/nope')).status).toBe(404);
  });

  it('publishes a sitemap and robots rules', async () => {
    const sitemap = await request(app).get('/sitemap.xml');
    expect(sitemap.headers['content-type']).toContain('xml');
    expect(sitemap.text).toContain('/courses/design-systems');
    expect(sitemap.text).not.toContain('hidden-draft');

    const robots = await request(app).get('/robots.txt');
    expect(robots.text).toContain('Disallow: /app');
    expect(robots.text).toContain('Disallow: /admin');
  });
});
