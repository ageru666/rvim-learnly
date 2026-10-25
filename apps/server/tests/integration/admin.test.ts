import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { testApp } from '../helpers/agent.js';
import { addReview, createCategory, createCourse, createUser, enroll, TEST_PASSWORD } from '../helpers/factories.js';
import { waitForEmail } from '../helpers/mailbox.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
const API = '/api/v1/admin';
const REASON = 'Please add more practical examples to the lessons.';

let admin: Awaited<ReturnType<typeof createUser>>;
let auth: Record<string, string>;

async function bearer(user: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

async function auditCount(action: string): Promise<number> {
  return db.auditLogEntry.count({ where: { action } });
}

beforeAll(async () => {
  await resetDb();
  admin = await createUser({ role: 'admin' });
  auth = await bearer(admin);
});

describe('access', () => {
  it('is for administrators only, in the API and the panel', async () => {
    const instructor = await bearer(await createUser({ role: 'instructor' }));
    expect((await request(app).get(`${API}/users`).set(instructor)).status).toBe(403);
    expect((await request(app).get(`${API}/users`)).status).toBe(401);
    expect((await request(app).get('/admin').set(instructor)).status).toBe(403);
  });
});

describe('course moderation', () => {
  it('approves a course into the catalog, notifies and emails the author in their language', async () => {
    const author = await createUser({ role: 'instructor', locale: 'en', email: `author-${randomUUID()}@test.local` });
    const course = await createCourse({ authorId: author.id, status: 'pending_review', title: 'Moderated course' });
    const approved = await request(app).post(`${API}/courses/${course.id}/approve`).set(auth).set('Accept-Language', 'uk');
    expect(approved.body).toEqual({ status: 'published' });
    expect((await request(app).get(`/api/v1/courses/${course.slug}`)).status).toBe(200);
    expect(await db.notification.count({ where: { userId: author.id, type: 'course_approved' } })).toBe(1);
    expect((await waitForEmail(author.email)).subject).toBe('Your course is approved and published');
    expect(await auditCount('course.approve')).toBeGreaterThan(0);
  });

  it('requires a 10–1000 character reason to reject or unpublish', async () => {
    const course = await createCourse({ status: 'pending_review' });
    expect((await request(app).post(`${API}/courses/${course.id}/reject`).set(auth).send({ reason: 'short' })).status).toBe(400);
    const rejected = await request(app).post(`${API}/courses/${course.id}/reject`).set(auth).send({ reason: REASON });
    expect(rejected.body.status).toBe('draft');
    expect((await db.course.findUniqueOrThrow({ where: { id: course.id } })).moderationComment).toBe(REASON);

    const published = await createCourse();
    expect((await request(app).post(`${API}/courses/${published.id}/unpublish`).set(auth).send({ reason: REASON })).body.status).toBe('draft');
    expect((await request(app).post(`${API}/courses/${published.id}/unpublish`).set(auth).send({ reason: REASON })).status).toBe(422);
  });
});

describe('instructor applications', () => {
  it('approval makes the applicant an instructor', async () => {
    const student = await createUser();
    const application = await db.instructorApplication.create({ data: { userId: student.id, motivation: 'I want to teach practical web development courses here.' } });
    const approved = await request(app).post(`${API}/instructor-applications/${application.id}/approve`).set(auth);
    expect(approved.body.status).toBe('approved');
    expect((await db.user.findUniqueOrThrow({ where: { id: student.id } })).role).toBe('instructor');
    expect((await request(app).post(`${API}/instructor-applications/${application.id}/approve`).set(auth)).status).toBe(422);
    expect(await auditCount('application.approve')).toBe(1);
  });

  it('a rejection needs a comment', async () => {
    const student = await createUser();
    const application = await db.instructorApplication.create({ data: { userId: student.id, motivation: 'I want to teach practical web development courses here.' } });
    expect((await request(app).post(`${API}/instructor-applications/${application.id}/reject`).set(auth).send({})).status).toBe(400);
    expect((await request(app).post(`${API}/instructor-applications/${application.id}/reject`).set(auth).send({ reason: REASON })).body).toMatchObject({
      status: 'rejected',
      reviewComment: REASON,
    });
  });
});

describe('users', () => {
  it('blocks a user: sessions end and login is refused; unblock restores access', async () => {
    const user = await createUser();
    const login = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
    await request(app).post(`${API}/users/${user.id}/block`).set(auth).send({ reason: REASON });
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: login.body.refreshToken })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD })).status).toBe(403);
    await request(app).post(`${API}/users/${user.id}/unblock`).set(auth);
    expect((await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD })).status).toBe(200);
  });

  it('protects the administrator from blocking or demoting themselves and keeps one admin (BR-U3)', async () => {
    expect((await request(app).post(`${API}/users/${admin.id}/block`).set(auth).send({ reason: REASON })).status).toBe(422);
    expect((await request(app).patch(`${API}/users/${admin.id}/role`).set(auth).send({ role: 'student' })).status).toBe(422);

    const second = await createUser({ role: 'admin' });
    const secondAuth = await bearer(second);
    expect((await request(app).patch(`${API}/users/${admin.id}/role`).set(secondAuth).send({ role: 'student' })).status).toBe(200);
    expect((await request(app).patch(`${API}/users/${second.id}/role`).set(auth).send({ role: 'student' })).status).toBe(403);
    await db.user.update({ where: { id: admin.id }, data: { role: 'admin' } });
    await db.user.update({ where: { id: second.id }, data: { status: 'blocked' } });
    const last = await request(app).patch(`${API}/users/${second.id}/role`).set(auth).send({ role: 'instructor' });
    expect(last.status).toBe(200);
  });

  it('searches and shows a user card', async () => {
    const user = await createUser({ name: 'Searchable Person' });
    const course = await createCourse();
    await enroll(user.id, course.id);
    const list = await request(app).get(`${API}/users?search=searchable`).set(auth);
    expect(list.body.items.map((item: { id: string }) => item.id)).toEqual([user.id]);
    const card = await request(app).get(`${API}/users/${user.id}`).set(auth);
    expect(card.body.enrollments).toHaveLength(1);
  });
});

describe('categories, reviews, certificates and the audit log', () => {
  it('requires both names and refuses to delete a category with courses', async () => {
    expect((await request(app).post(`${API}/categories`).set(auth).send({ nameUk: 'Дизайн', accent: 'pink' })).status).toBe(400);
    expect((await request(app).post(`${API}/categories`).set(auth).send({ nameUk: 'Дизайн', nameEn: 'Design', accent: 'pink' })).status).toBe(201);
    const used = await createCategory();
    await createCourse({ categoryId: used.id });
    expect((await request(app).delete(`${API}/categories/${used.id}`).set(auth)).status).toBe(422);
    const created = (await request(app).get(`${API}/categories`).set(auth)).body.find((item: { nameEn: string }) => item.nameEn === 'Design');
    expect(created.slug).toBe('design');
    expect((await request(app).delete(`${API}/categories/${created.id}`).set(auth)).status).toBe(204);
  });

  it('hides a review from the rating and tells the reviewer', async () => {
    const course = await createCourse();
    const reviewer = await createUser();
    const review = await addReview(reviewer.id, course.id, 1);
    await request(app).post(`${API}/reviews/${review.id}/hide`).set(auth).send({ reason: REASON });
    expect((await request(app).get(`/api/v1/courses/${course.slug}`)).body.rating.count).toBe(0);
    expect(await db.notification.count({ where: { userId: reviewer.id, type: 'review_hidden' } })).toBe(1);
    await request(app).post(`${API}/reviews/${review.id}/unhide`).set(auth);
    expect((await request(app).get(`/api/v1/courses/${course.slug}`)).body.rating.count).toBe(1);
  });

  it('revokes a certificate', async () => {
    const course = await createCourse();
    const enrollment = await enroll((await createUser()).id, course.id);
    await db.certificate.create({ data: { enrollmentId: enrollment.id, code: 'ABCDEFGHJK', studentName: 'Student', courseTitle: course.title, authorName: 'Author' } });
    const revoked = await request(app).post(`${API}/certificates/abcdefghjk/revoke`).set(auth).send({ reason: REASON });
    expect(revoked.body).toMatchObject({ revoked: true, revokedReason: REASON });
    expect((await request(app).get(`${API}/certificates?search=ABCD`).set(auth)).body.total).toBe(1);
  });

  it('records every mutation in the audit log and filters it', async () => {
    const all = await request(app).get(`${API}/audit-log?limit=100`).set(auth);
    const actions = new Set(all.body.items.map((entry: { action: string }) => entry.action));
    for (const action of ['course.approve', 'course.reject', 'course.unpublish', 'application.approve', 'application.reject', 'user.block', 'user.unblock', 'user.role', 'category.create', 'category.delete', 'review.hide', 'review.unhide', 'certificate.revoke']) {
      expect(actions).toContain(action);
    }
    const filtered = await request(app).get(`${API}/audit-log?action=review.hide`).set(auth);
    expect(filtered.body.items.every((entry: { action: string }) => entry.action === 'review.hide')).toBe(true);
    const stats = await request(app).get(`${API}/stats`).set(auth);
    expect(stats.body.daily).toHaveLength(30);
    expect(stats.body.recentAudit.length).toBeGreaterThan(0);
  });
});
