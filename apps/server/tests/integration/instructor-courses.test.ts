import sharp from 'sharp';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { testApp } from '../helpers/agent.js';
import { createCategory, createCourse, createUser, enroll, TEST_PASSWORD } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
const API = '/api/v1/instructor/courses';

let categoryId: string;
let png: Buffer;

beforeAll(async () => {
  await resetDb();
  categoryId = (await createCategory()).id;
  png = await sharp({ create: { width: 64, height: 36, channels: 3, background: '#336699' } }).png().toBuffer();
});

async function bearer(user: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

async function instructor(options: { verified?: boolean } = {}) {
  const user = await createUser({ role: 'instructor', locale: 'en', verified: options.verified });
  return { user, auth: await bearer(user) };
}

async function createDraft(auth: Record<string, string>, title = 'Основи веброзробки') {
  const response = await request(app).post(API).set(auth).send({ title, categoryId, level: 'beginner', language: 'uk' });
  return response.body as { id: string; slug: string };
}

/** Fills everything BR-P1 asks for, through the API. */
async function makeReady(auth: Record<string, string>, courseId: string) {
  await request(app)
    .patch(`${API}/${courseId}`)
    .set(auth)
    .send({ shortDescription: 'Short description', description: 'Full description', outcomes: ['One', 'Two'] });
  await request(app).post(`${API}/${courseId}/cover`).set(auth).attach('file', png, 'cover.png');
  const module = await request(app).post(`${API}/${courseId}/modules`).set(auth).send({ title: 'Module one' });
  for (const title of ['Lesson one', 'Lesson two', 'Lesson three']) {
    const lesson = await request(app).post(`/api/v1/instructor/modules/${module.body.id}/lessons`).set(auth).send({ title, type: 'text' });
    await request(app).patch(`/api/v1/instructor/lessons/${lesson.body.id}`).set(auth).send({ content: 'Text' });
  }
}

describe('creating and editing', () => {
  it('creates a draft with a transliterated unique slug and the chosen content language', async () => {
    const { auth } = await instructor();
    const first = await createDraft(auth);
    const second = await createDraft(auth);
    expect(first).toMatchObject({ slug: 'osnovy-vebrozrobky', status: 'draft', language: 'uk', editable: true });
    expect(second.slug).toMatch(/^osnovy-vebrozrobky-\d+$/);
  });

  it('lets only the author edit (403 for others) and students cannot create', async () => {
    const { auth } = await instructor();
    const course = await createDraft(auth);
    const other = await instructor();
    expect((await request(app).patch(`${API}/${course.id}`).set(other.auth).send({ title: 'Stolen title' })).status).toBe(403);
    const student = await bearer(await createUser());
    expect((await request(app).post(API).set(student).send({ title: 'My course', categoryId, level: 'beginner', language: 'en' })).status).toBe(403);
  });

  it('normalizes tags and rejects a taken slug, including old slugs (409)', async () => {
    const { auth } = await instructor();
    const course = await createDraft(auth);
    const updated = await request(app).patch(`${API}/${course.id}`).set(auth).send({ tags: ['JavaScript', 'web', 'javascript'] });
    expect(updated.body.tags).toEqual(['javascript', 'web']);

    await createCourse({ slug: 'taken-slug' });
    expect((await request(app).patch(`${API}/${course.id}`).set(auth).send({ slug: 'taken-slug' })).status).toBe(409);
    const other = await createCourse({ slug: 'renamed-course' });
    await db.courseSlugHistory.create({ data: { oldSlug: 'historic-slug', courseId: other.id } });
    expect((await request(app).patch(`${API}/${course.id}`).set(auth).send({ slug: 'historic-slug' })).status).toBe(409);
  });

  it('keeps the old slug of a published course as a redirect (BR-P6)', async () => {
    const { user, auth } = await instructor();
    const published = await createCourse({ authorId: user.id, slug: 'published-before' });
    await request(app).patch(`${API}/${published.id}`).set(auth).send({ slug: 'published-after' });
    const old = await request(app).get('/courses/published-before');
    expect(old.status).toBe(301);
    expect(old.headers.location).toBe('/courses/published-after');
  });

  it('validates the cover type and accepts images', async () => {
    const { auth } = await instructor();
    const course = await createDraft(auth);
    const text = await request(app).post(`${API}/${course.id}/cover`).set(auth).attach('file', Buffer.from('not an image'), 'cover.png');
    expect(text.status).toBe(400);
    const image = await request(app).post(`${API}/${course.id}/cover`).set(auth).attach('file', png, 'cover.png');
    expect(image.body.coverUrl).toMatch(/^\/uploads\/covers\/.+\.webp$/);
  });
});

describe('the publishing lifecycle', () => {
  it('lists unmet readiness items and refuses to submit (BR-P1)', async () => {
    const { auth } = await instructor();
    const course = await createDraft(auth);
    const readiness = await request(app).get(`${API}/${course.id}/readiness`).set(auth);
    expect(readiness.body.ready).toBe(false);
    expect(readiness.body.items).toContainEqual({ key: 'language', ok: true });
    expect(readiness.body.items).toContainEqual({ key: 'cover', ok: false });

    const submit = await request(app).post(`${API}/${course.id}/submit`).set(auth);
    expect(submit.status).toBe(422);
    expect(submit.body.error).toMatchObject({ rule: 'BR-P1' });
    expect(submit.body.error.unmet).toContain('cover');
  });

  it('submits a ready course, locks editing in review and allows withdrawing (BR-P2)', async () => {
    const admin = await createUser({ role: 'admin' });
    const { auth } = await instructor();
    const course = await createDraft(auth);
    await makeReady(auth, course.id);
    expect((await request(app).get(`${API}/${course.id}/readiness`).set(auth)).body.ready).toBe(true);

    const submitted = await request(app).post(`${API}/${course.id}/submit`).set(auth);
    expect(submitted.body).toMatchObject({ status: 'pending_review', editable: false });
    expect(await db.notification.count({ where: { userId: admin.id, type: 'admin_course_submitted' } })).toBe(1);
    const locked = await request(app).patch(`${API}/${course.id}`).set(auth).send({ title: 'Changed in review' });
    expect(locked.status).toBe(422);
    expect(locked.body.error.rule).toBe('BR-P2');

    expect((await request(app).post(`${API}/${course.id}/withdraw`).set(auth)).body.status).toBe('draft');
  });

  it('refuses submission from an author with an unverified email (BR-U4)', async () => {
    const { auth } = await instructor({ verified: false });
    const course = await createDraft(auth);
    await makeReady(auth, course.id);
    const submit = await request(app).post(`${API}/${course.id}/submit`).set(auth);
    expect(submit.status).toBe(422);
    expect(submit.body.error.rule).toBe('BR-U4');
  });

  it('archives and restores a published course (BR-P4)', async () => {
    const { user, auth } = await instructor();
    const course = await createCourse({ authorId: user.id });
    const archived = await request(app).post(`${API}/${course.id}/archive`).set(auth);
    expect(archived.body).toMatchObject({ status: 'archived', editable: false });
    expect((await request(app).get(`/api/v1/courses/${course.slug}`)).status).toBe(404);
    expect((await request(app).post(`${API}/${course.id}/restore`).set(auth)).body.status).toBe('published');
  });

  it('deletes only a never-enrolled draft (BR-P5)', async () => {
    const { user, auth } = await instructor();
    const published = await createCourse({ authorId: user.id });
    expect((await request(app).delete(`${API}/${published.id}`).set(auth)).status).toBe(422);

    const draft = await createCourse({ authorId: user.id, status: 'draft' });
    await enroll((await createUser()).id, draft.id);
    expect((await request(app).delete(`${API}/${draft.id}`).set(auth)).status).toBe(422);

    const empty = await createDraft(auth);
    expect((await request(app).delete(`${API}/${empty.id}`).set(auth)).status).toBe(204);
  });

  it('stops a demoted instructor from editing (BR-U2)', async () => {
    const { user, auth } = await instructor();
    const course = await createCourse({ authorId: user.id });
    await db.user.update({ where: { id: user.id }, data: { role: 'student' } });
    expect((await request(app).patch(`${API}/${course.id}`).set(auth).send({ title: 'After demotion' })).status).toBe(403);
  });
});

describe('the instructor dashboard', () => {
  it('summarizes own courses and lists them with a status filter', async () => {
    const { user, auth } = await instructor();
    const published = await createCourse({ authorId: user.id });
    await createCourse({ authorId: user.id, status: 'draft' });
    await enroll((await createUser()).id, published.id);

    const overview = await request(app).get('/api/v1/instructor/overview').set(auth);
    expect(overview.body).toMatchObject({ students: 1, enrollments30d: 1 });
    expect(overview.body.byStatus).toMatchObject({ draft: 1, published: 1, pending_review: 0, archived: 0 });

    const drafts = await request(app).get(`${API}?status=draft`).set(auth);
    expect(drafts.body).toHaveLength(1);
    expect((await request(app).get(API).set(auth)).body).toHaveLength(2);
  });
});
