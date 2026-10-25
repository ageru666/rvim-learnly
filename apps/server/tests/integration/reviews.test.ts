import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { browserAgent, testApp } from '../helpers/agent.js';
import { addReview, createCourse, createUser, enroll, TEST_PASSWORD } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
const TEXT = 'Clear explanations and useful practice.';

beforeAll(resetDb);

async function bearer(user: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

/** A course with 5 lessons; the student has completed `completed` of them. */
async function studentWithProgress(completed: number, options: { verified?: boolean } = {}) {
  const course = await createCourse({ lessons: ['text', 'text', 'text', 'text', 'text'] });
  const student = await createUser({ verified: options.verified });
  await enroll(student.id, course.id, course.lessons.slice(0, completed).map((lesson) => lesson.id));
  return { course, student, auth: await bearer(student) };
}

function post(courseId: string, auth: Record<string, string>, body: object = { rating: 5, text: TEXT }) {
  return request(app).post(`/api/v1/courses/${courseId}/reviews`).set(auth).send(body);
}

describe('who may review', () => {
  it('needs 30 % progress or a completed course (BR-R1)', async () => {
    const low = await studentWithProgress(1);
    const lowResponse = await post(low.course.id, low.auth);
    expect(lowResponse.status).toBe(422);
    expect(lowResponse.body.error.rule).toBe('BR-R1');

    const enough = await studentWithProgress(2);
    expect((await post(enough.course.id, enough.auth)).status).toBe(201);

    const done = await studentWithProgress(0);
    await db.enrollment.updateMany({ where: { userId: done.student.id }, data: { status: 'completed' } });
    expect((await post(done.course.id, done.auth)).status).toBe(201);
  });

  it('allows one review per course and none from the author (BR-R2)', async () => {
    const { course, auth } = await studentWithProgress(2);
    await post(course.id, auth);
    expect((await post(course.id, auth)).status).toBe(409);

    const author = await db.user.findUniqueOrThrow({ where: { id: course.authorId } });
    const own = await post(course.id, await bearer(author));
    expect(own.status).toBe(422);
    expect(own.body.error.rule).toBe('BR-R2');
  });

  it('requires a verified email (BR-U4)', async () => {
    const { course, auth } = await studentWithProgress(3, { verified: false });
    const response = await post(course.id, auth);
    expect(response.status).toBe(422);
    expect(response.body.error.rule).toBe('BR-U4');
  });

  it('validates rating and text', async () => {
    const { course, auth } = await studentWithProgress(3);
    expect((await post(course.id, auth, { rating: 6, text: TEXT })).status).toBe(400);
    expect((await post(course.id, auth, { rating: 4, text: 'short' })).status).toBe(400);
  });

  it('tells the course page why the form is not shown', async () => {
    const { course, auth } = await studentWithProgress(1);
    const detail = await request(app).get(`/api/v1/courses/${course.slug}`).set(auth).set('Accept-Language', 'en');
    expect(detail.body.viewer).toMatchObject({ canReview: false, reviewBlockReason: 'errors.reviews.lowProgress', myReview: null });
  });
});

describe('editing, deleting and replying', () => {
  it('lets only the reviewer edit or delete the review', async () => {
    const { course, auth } = await studentWithProgress(2);
    const review = (await post(course.id, auth)).body as { id: string };
    const other = await bearer(await createUser());

    expect((await request(app).patch(`/api/v1/reviews/${review.id}`).set(other).send({ rating: 1 })).status).toBe(403);
    const edited = await request(app).patch(`/api/v1/reviews/${review.id}`).set(auth).send({ rating: 3 });
    expect(edited.body).toMatchObject({ rating: 3, text: TEXT });

    expect((await request(app).delete(`/api/v1/reviews/${review.id}`).set(other)).status).toBe(403);
    expect((await request(app).delete(`/api/v1/reviews/${review.id}`).set(auth)).status).toBe(204);
  });

  it('notifies the author of a new review and the reviewer of the first reply', async () => {
    const { course, auth, student } = await studentWithProgress(2);
    const review = (await post(course.id, auth)).body as { id: string };
    expect(await db.notification.count({ where: { userId: course.authorId, type: 'course_new_review' } })).toBe(1);

    const author = await bearer(await db.user.findUniqueOrThrow({ where: { id: course.authorId } }));
    const stranger = await bearer(await createUser({ role: 'instructor' }));
    expect((await request(app).put(`/api/v1/reviews/${review.id}/reply`).set(stranger).send({ text: 'Thanks!' })).status).toBe(403);

    const reply = await request(app).put(`/api/v1/reviews/${review.id}/reply`).set(author).send({ text: 'Thank you!' });
    expect(reply.body.authorReply).toBe('Thank you!');
    const edited = await request(app).put(`/api/v1/reviews/${review.id}/reply`).set(author).send({ text: 'Thank you a lot!' });
    expect(edited.body.authorReply).toBe('Thank you a lot!');
    expect(await db.notification.count({ where: { userId: student.id, type: 'review_replied' } })).toBe(1);

    const list = await request(app).get('/api/v1/instructor/reviews').set(author);
    expect(list.body.items[0]).toMatchObject({ id: review.id, course: { id: course.id } });
  });
});

describe('rating', () => {
  it('counts only visible reviews', async () => {
    const course = await createCourse();
    const [a, b, c] = await Promise.all([createUser(), createUser(), createUser()]);
    await addReview(a.id, course.id, 5);
    await addReview(b.id, course.id, 3);
    await addReview(c.id, course.id, 1, { hidden: true });
    const detail = await request(app).get(`/api/v1/courses/${course.slug}`);
    expect(detail.body.rating).toEqual({ avg: 4, count: 2 });
  });
});

describe('SSR review form', () => {
  it('creates, updates and deletes a review from the course page', async () => {
    const { course, student } = await studentWithProgress(2);
    const { agent, csrfToken } = await browserAgent(app);
    await agent.post('/login').type('form').send({ _csrf: csrfToken, email: student.email, password: TEST_PASSWORD });

    const page = await agent.get(`/courses/${course.slug}`);
    expect(page.text).toContain(`action="/courses/${course.slug}/reviews"`);

    const invalid = await agent
      .post(`/courses/${course.slug}/reviews`)
      .set('Accept-Language', 'en')
      .type('form')
      .send({ _csrf: csrfToken, rating: '4', text: 'short' });
    expect(invalid.status).toBe(422);
    expect(invalid.text).toContain('aria-invalid="true"');
    expect(invalid.text).toContain('>short</textarea>');

    const created = await agent.post(`/courses/${course.slug}/reviews`).type('form').send({ _csrf: csrfToken, rating: '4', text: TEXT });
    expect(created.headers.location).toBe(`/courses/${course.slug}#reviews`);
    await agent.post(`/courses/${course.slug}/reviews`).type('form').send({ _csrf: csrfToken, rating: '2', text: TEXT });
    expect((await db.review.findFirstOrThrow({ where: { userId: student.id } })).rating).toBe(2);

    await agent.post(`/courses/${course.slug}/reviews/delete`).type('form').send({ _csrf: csrfToken });
    expect(await db.review.count({ where: { userId: student.id } })).toBe(0);
  });
});
