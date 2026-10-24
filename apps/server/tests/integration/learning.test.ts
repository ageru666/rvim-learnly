import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { browserAgent, testApp } from '../helpers/agent.js';
import { createCategory, createCourse, createUser, enroll, TEST_PASSWORD } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();

type Course = Awaited<ReturnType<typeof createCourse>>;

async function bearerFor(user: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

let course: Course;
let draft: Course;
let author: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  await resetDb();
  author = await createUser({ role: 'instructor' });
  const category = await createCategory();
  course = await createCourse({
    authorId: author.id,
    categoryId: category.id,
    slug: 'learning-course',
    lessons: [{ type: 'text', isPreview: true }, 'video', 'quiz'],
  });
  draft = await createCourse({ authorId: author.id, status: 'draft', slug: 'learning-draft' });
});

describe('enrollment', () => {
  it('enrolls in a published course once and returns the first lesson', async () => {
    const auth = await bearerFor(await createUser());
    const created = await request(app).post(`/api/v1/courses/${course.id}/enrollment`).set(auth);
    expect(created.status).toBe(201);
    expect(created.body.firstLessonId).toBe(course.lessons[0]?.id);
    expect((await request(app).post(`/api/v1/courses/${course.id}/enrollment`).set(auth)).status).toBe(409);
  });

  it('refuses unpublished courses (BR-E1) and the author (BR-E2)', async () => {
    const student = await bearerFor(await createUser());
    const unpublished = await request(app).post(`/api/v1/courses/${draft.id}/enrollment`).set(student);
    expect(unpublished.status).toBe(422);
    expect(unpublished.body.error.rule).toBe('BR-E1');

    const own = await request(app).post(`/api/v1/courses/${course.id}/enrollment`).set(await bearerFor(author));
    expect(own.status).toBe(422);
    expect(own.body.error.rule).toBe('BR-E2');
  });

  it('leaving deletes the enrollment and its progress', async () => {
    const user = await createUser();
    const enrollment = await enroll(user.id, course.id, [course.lessons[0]?.id ?? '']);
    const auth = await bearerFor(user);
    expect((await request(app).delete(`/api/v1/courses/${course.id}/enrollment`).set(auth)).status).toBe(204);
    expect(await db.enrollment.findUnique({ where: { id: enrollment.id } })).toBeNull();
    expect(await db.lessonCompletion.count({ where: { enrollmentId: enrollment.id } })).toBe(0);
  });
});

describe('the player', () => {
  it('opens content only for enrolled users; others get preview lessons only (BR-E3)', async () => {
    const [preview, regular] = course.lessons;
    const outsider = await bearerFor(await createUser());
    expect((await request(app).get(`/api/v1/learn/lessons/${regular?.id ?? ''}`).set(outsider)).status).toBe(403);
    expect((await request(app).get(`/api/v1/learn/courses/${course.id}`).set(outsider)).status).toBe(403);
    expect((await request(app).get(`/api/v1/courses/learning-course/preview/${preview?.id ?? ''}`)).status).toBe(200);

    const user = await createUser();
    await enroll(user.id, course.id);
    const lesson = await request(app).get(`/api/v1/learn/lessons/${regular?.id ?? ''}`).set(await bearerFor(user));
    expect(lesson.status).toBe(200);
    expect(lesson.body).toMatchObject({ content: 'Lesson content', prevLessonId: preview?.id, completed: false });
  });

  it('remembers the last opened lesson', async () => {
    const user = await createUser();
    const enrollment = await enroll(user.id, course.id);
    const lessonId = course.lessons[1]?.id ?? '';
    const auth = await bearerFor(user);
    await request(app).get(`/api/v1/learn/lessons/${lessonId}`).set(auth);
    expect((await db.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).lastLessonId).toBe(lessonId);

    const learn = await request(app).get(`/api/v1/learn/courses/${course.id}`).set(auth);
    expect(learn.body).toMatchObject({ mode: 'student', lastLessonId: lessonId, progress: 0, status: 'active' });
    expect(learn.body.modules[0].lessons).toHaveLength(3);
  });

  it('marks text and video lessons complete and back (BR-L1), never quiz lessons (BR-L2)', async () => {
    const user = await createUser();
    await enroll(user.id, course.id);
    const auth = await bearerFor(user);
    const [text, video, quiz] = course.lessons;

    const first = await request(app).put(`/api/v1/learn/lessons/${text?.id ?? ''}/completion`).set(auth);
    expect(first.body).toMatchObject({ progress: 33, completedLessonIds: [text?.id], courseCompleted: false });
    const second = await request(app).put(`/api/v1/learn/lessons/${video?.id ?? ''}/completion`).set(auth);
    expect(second.body.progress).toBe(66);
    const again = await request(app).put(`/api/v1/learn/lessons/${video?.id ?? ''}/completion`).set(auth);
    expect(again.body.progress).toBe(66);

    const undone = await request(app).delete(`/api/v1/learn/lessons/${video?.id ?? ''}/completion`).set(auth);
    expect(undone.body.progress).toBe(33);

    const quizComplete = await request(app).put(`/api/v1/learn/lessons/${quiz?.id ?? ''}/completion`).set(auth);
    expect(quizComplete.status).toBe(422);
    expect(quizComplete.body.error.rule).toBe('BR-L2');
  });

  it('opens the author preview without saving progress (FR-LEARN-8)', async () => {
    const auth = await bearerFor(author);
    const learn = await request(app).get(`/api/v1/learn/courses/${draft.id}`).set(auth);
    expect(learn.body).toMatchObject({ mode: 'preview', status: null, progress: 0 });
    const lesson = await request(app).get(`/api/v1/learn/lessons/${draft.lessons[0]?.id ?? ''}`).set(auth);
    expect(lesson.status).toBe(200);
    const complete = await request(app).put(`/api/v1/learn/lessons/${draft.lessons[0]?.id ?? ''}/completion`).set(auth);
    expect(complete.status).toBe(422);
  });

  it('denies a user blocked after signing in (BR-E4)', async () => {
    const user = await createUser();
    await enroll(user.id, course.id);
    const auth = await bearerFor(user);
    await db.user.update({ where: { id: user.id }, data: { status: 'blocked' } });
    expect((await request(app).get(`/api/v1/learn/courses/${course.id}`).set(auth)).status).toBe(401);
  });
});

describe('dashboard and my courses', () => {
  it('shows continue learning, active courses and recommendations from the same category', async () => {
    const user = await createUser();
    await enroll(user.id, course.id);
    const sibling = await createCourse({ categoryId: course.categoryId ?? undefined, slug: 'learning-sibling' });
    const auth = await bearerFor(user);
    await request(app).get(`/api/v1/learn/lessons/${course.lessons[1]?.id ?? ''}`).set(auth);

    const dashboard = await request(app).get('/api/v1/me/dashboard').set(auth);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.continue).toMatchObject({ courseId: course.id, lessonId: course.lessons[1]?.id, progress: 0 });
    expect(dashboard.body.active.map((item: { course: { id: string } }) => item.course.id)).toEqual([course.id]);
    expect(dashboard.body.recommendations.map((card: { id: string }) => card.id)).toEqual([sibling.id]);
  });

  it('filters my courses by status and title', async () => {
    const user = await createUser();
    await enroll(user.id, course.id);
    const other = await createCourse({ title: 'Completed course', slug: 'learning-completed' });
    const done = await enroll(user.id, other.id);
    await db.enrollment.update({ where: { id: done.id }, data: { status: 'completed', completedAt: new Date() } });
    const auth = await bearerFor(user);

    const completed = await request(app).get('/api/v1/me/enrollments?status=completed').set(auth);
    expect(completed.body.items.map((item: { course: { id: string } }) => item.course.id)).toEqual([other.id]);
    const search = await request(app).get('/api/v1/me/enrollments?search=COMPLETED').set(auth);
    expect(search.body.total).toBe(1);
    const all = await request(app).get('/api/v1/me/enrollments').set(auth);
    expect(all.body.total).toBe(2);
  });
});

describe('SSR enrollment', () => {
  it('sends a guest to login and enrolls them right after signing in', async () => {
    const user = await createUser();
    const { agent, csrfToken } = await browserAgent(app);
    const guest = await agent.post('/courses/learning-course/enroll').type('form').send({ _csrf: csrfToken });
    expect(guest.status).toBe(303);
    expect(guest.headers.location).toBe('/login?returnTo=%2Fcourses%2Flearning-course&intent=enroll&course=learning-course');

    const login = await agent.post('/login').type('form').send({
      _csrf: csrfToken,
      email: user.email,
      password: TEST_PASSWORD,
      returnTo: '/courses/learning-course',
      intent: 'enroll',
      course: 'learning-course',
    });
    expect(login.headers.location).toBe(`/app/learn/${course.id}/${course.lessons[0]?.id ?? ''}`);
    expect(await db.enrollment.count({ where: { userId: user.id, courseId: course.id } })).toBe(1);
  });

  it('enrolls a new user right after registration', async () => {
    const { agent, csrfToken } = await browserAgent(app);
    const email = `learning-${Date.now()}@test.local`;
    const response = await agent.post('/register').type('form').send({
      _csrf: csrfToken,
      name: 'New Learner',
      email,
      password: 'secret123',
      passwordConfirm: 'secret123',
      acceptTerms: 'on',
      intent: 'enroll',
      course: 'learning-course',
    });
    expect(response.headers.location).toBe(`/app/learn/${course.id}/${course.lessons[0]?.id ?? ''}`);
  });

  it('enrolls a signed-in user and returns the author to the course with a reason', async () => {
    const { agent, csrfToken } = await browserAgent(app);
    await agent.post('/login').type('form').send({ _csrf: csrfToken, email: author.email, password: TEST_PASSWORD });
    const own = await agent.post('/courses/learning-course/enroll').type('form').send({ _csrf: csrfToken });
    expect(own.headers.location).toBe('/courses/learning-course');
    expect(String(own.headers['set-cookie'])).toContain('flash=');
  });
});
