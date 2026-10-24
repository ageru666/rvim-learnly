import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { testApp } from '../helpers/agent.js';
import { addReview, createCategory, createCourse, createUser, enroll } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();

interface Fixture {
  programming: Awaited<ReturnType<typeof createCategory>>;
  js: Awaited<ReturnType<typeof createCourse>>;
  sql: Awaited<ReturnType<typeof createCourse>>;
  english: Awaited<ReturnType<typeof createCourse>>;
  draft: Awaited<ReturnType<typeof createCourse>>;
  archived: Awaited<ReturnType<typeof createCourse>>;
}

let fixture: Fixture;

beforeAll(async () => {
  await resetDb();
  const programming = await createCategory({ nameEn: 'Programming', nameUk: 'Програмування', accent: 'blue' });
  const languages = await createCategory({ nameEn: 'Languages', nameUk: 'Мови', accent: 'green' });
  const js = await createCourse({
    title: 'JavaScript basics',
    slug: 'javascript-basics',
    categoryId: programming.id,
    tags: ['javascript', 'web'],
    publishedAt: new Date('2026-01-01'),
    lessons: [{ type: 'text', isPreview: true, minutes: 5 }, 'video', 'quiz'],
  });
  const sql = await createCourse({
    title: 'SQL for analysts',
    slug: 'sql-for-analysts',
    categoryId: programming.id,
    level: 'intermediate',
    publishedAt: new Date('2026-03-01'),
  });
  const english = await createCourse({
    title: 'English for IT',
    slug: 'english-for-it',
    categoryId: languages.id,
    language: 'en',
    publishedAt: new Date('2026-02-01'),
  });
  const draft = await createCourse({ title: 'Draft course', slug: 'draft-course', status: 'draft' });
  const archived = await createCourse({ title: 'Archived course', slug: 'archived-course', status: 'archived' });

  const students = await Promise.all([1, 2, 3].map(() => createUser()));
  for (const student of students) await enroll(student.id, js.id);
  await enroll(students[0]?.id ?? '', sql.id);
  await addReview(students[0]?.id ?? '', js.id, 5);
  await addReview(students[1]?.id ?? '', js.id, 3);
  await addReview(students[2]?.id ?? '', js.id, 1, { hidden: true });
  await addReview(students[0]?.id ?? '', sql.id, 5);
  await db.courseSlugHistory.create({ data: { oldSlug: 'js-old', courseId: js.id } });

  fixture = { programming, js, sql, english, draft, archived };
});

function slugs(body: { items: { slug: string }[] }): string[] {
  return body.items.map((item) => item.slug);
}

describe('GET /api/v1/courses', () => {
  it('lists only published courses, popular first, 12 per page', async () => {
    const response = await request(app).get('/api/v1/courses');
    expect(response.status).toBe(200);
    expect(slugs(response.body)).toEqual(['javascript-basics', 'sql-for-analysts', 'english-for-it']);
    expect(response.body).toMatchObject({ page: 1, limit: 12, total: 3 });
  });

  it('searches, filters and sorts', async () => {
    const search = await request(app).get('/api/v1/courses?search=sql');
    expect(slugs(search.body)).toEqual(['sql-for-analysts']);

    const category = await request(app).get(`/api/v1/courses?category=${fixture.programming.slug}&sort=newest`);
    expect(slugs(category.body)).toEqual(['sql-for-analysts', 'javascript-basics']);

    const level = await request(app).get('/api/v1/courses?level=intermediate');
    expect(slugs(level.body)).toEqual(['sql-for-analysts']);

    const language = await request(app).get('/api/v1/courses?language=en');
    expect(slugs(language.body)).toEqual(['english-for-it']);

    const tag = await request(app).get('/api/v1/courses?tag=web');
    expect(slugs(tag.body)).toEqual(['javascript-basics']);

    const rating = await request(app).get('/api/v1/courses?minRating=5&sort=rating');
    expect(slugs(rating.body)).toEqual(['sql-for-analysts']);

    const title = await request(app).get('/api/v1/courses?sort=title');
    expect(slugs(title.body)).toEqual(['english-for-it', 'javascript-basics', 'sql-for-analysts']);
  });

  it('builds cards with stats and a localized category', async () => {
    const response = await request(app).get('/api/v1/courses?search=javascript').set('Accept-Language', 'en');
    const [card] = response.body.items;
    expect(card).toMatchObject({
      category: { name: 'Programming', slug: fixture.programming.slug, accent: 'blue' },
      lessonCount: 3,
      totalMinutes: 25,
      studentCount: 3,
      rating: { avg: 4, count: 2 },
      tags: ['javascript', 'web'],
    });
  });

  it('rejects invalid filters', async () => {
    const response = await request(app).get('/api/v1/courses?level=expert');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/courses/:slug', () => {
  it('returns the course with curriculum and rating distribution', async () => {
    const response = await request(app).get('/api/v1/courses/javascript-basics');
    expect(response.status).toBe(200);
    expect(response.body.curriculum[0].lessons).toHaveLength(3);
    expect(response.body.curriculum[0].lessons[0]).not.toHaveProperty('content');
    expect(response.body.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 });
    expect(response.body.viewer).toBeNull();
  });

  it('hides unpublished courses and redirects old slugs', async () => {
    for (const slug of ['draft-course', 'archived-course', 'missing']) {
      expect((await request(app).get(`/api/v1/courses/${slug}`)).status).toBe(404);
    }
    const redirect = await request(app).get('/api/v1/courses/js-old');
    expect(redirect.status).toBe(301);
    expect(redirect.headers.location).toBe('/api/v1/courses/javascript-basics');
  });

  it('lists visible reviews only', async () => {
    const response = await request(app).get('/api/v1/courses/javascript-basics/reviews');
    expect(response.body.total).toBe(2);
    const filtered = await request(app).get('/api/v1/courses/javascript-basics/reviews?rating=5');
    expect(filtered.body.items).toHaveLength(1);
  });
});

describe('GET /api/v1/courses/:slug/preview/:lessonId', () => {
  it('opens preview lessons and refuses the others', async () => {
    const [preview, regular] = fixture.js.lessons;
    const open = await request(app).get(`/api/v1/courses/javascript-basics/preview/${preview?.id ?? ''}`);
    expect(open.status).toBe(200);
    expect(open.body).toMatchObject({ title: 'Lesson 1', content: 'Lesson content' });

    const closed = await request(app)
      .get(`/api/v1/courses/javascript-basics/preview/${regular?.id ?? ''}`)
      .set('Accept-Language', 'en');
    expect(closed.status).toBe(403);
    expect(closed.body.error.code).toBe('FORBIDDEN');
  });
});

describe('catalog helpers', () => {
  it('returns categories with published course counts', async () => {
    const response = await request(app).get('/api/v1/categories').set('Accept-Language', 'uk');
    const programming = response.body.find((category: { slug: string }) => category.slug === fixture.programming.slug);
    expect(programming).toMatchObject({ name: 'Програмування', courseCount: 2 });
  });

  it('returns public stats', async () => {
    const response = await request(app).get('/api/v1/stats/public');
    expect(response.body).toMatchObject({ courses: 3 });
    expect(response.body.students).toBeGreaterThanOrEqual(3);
  });

  it('returns an instructor profile with published courses', async () => {
    const response = await request(app).get(`/api/v1/instructors/${fixture.js.authorId}`);
    expect(response.status).toBe(200);
    expect(response.body.courses.map((course: { slug: string }) => course.slug)).toEqual(['javascript-basics']);
    expect(response.body.studentCount).toBe(3);
  });
});
