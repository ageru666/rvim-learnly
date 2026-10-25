import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { testApp } from '../helpers/agent.js';
import { createCourse, createUser, enroll, TEST_PASSWORD, type CourseOverrides } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
const API = '/api/v1/instructor';

beforeAll(resetDb);

async function bearer(user: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

async function authorWithCourse(lessons: CourseOverrides['lessons'] = ['text', 'text', 'text']) {
  const author = await createUser({ role: 'instructor' });
  const course = await createCourse({ authorId: author.id, lessons });
  const moduleId = (await db.module.findFirstOrThrow({ where: { courseId: course.id } })).id;
  return { author, course, moduleId, auth: await bearer(author) };
}

describe('modules and lessons', () => {
  it('creates, renames and deletes modules and lessons; a quiz lesson gets a quiz', async () => {
    const { course, auth } = await authorWithCourse();
    const module = await request(app).post(`${API}/courses/${course.id}/modules`).set(auth).send({ title: 'Second module' });
    expect(module.status).toBe(201);
    expect(module.body).toMatchObject({ title: 'Second module', position: 1, lessons: [] });
    expect((await request(app).patch(`${API}/modules/${module.body.id}`).set(auth).send({ title: 'Renamed' })).body.title).toBe('Renamed');

    const quiz = await request(app).post(`${API}/modules/${module.body.id}/lessons`).set(auth).send({ title: 'Check yourself', type: 'quiz' });
    expect(quiz.status).toBe(201);
    expect(quiz.body.quiz).toMatchObject({ passScore: 70, questions: [] });

    expect((await request(app).delete(`${API}/lessons/${quiz.body.id}`).set(auth)).status).toBe(204);
    expect((await request(app).delete(`${API}/modules/${module.body.id}`).set(auth)).status).toBe(204);
  });

  it('refuses other users', async () => {
    const { moduleId } = await authorWithCourse();
    const other = await bearer(await createUser({ role: 'instructor' }));
    expect((await request(app).post(`${API}/modules/${moduleId}/lessons`).set(other).send({ title: 'Intruder', type: 'text' })).status).toBe(403);
  });

  it('validates video links and locks the type once students completed the lesson', async () => {
    const { course, auth } = await authorWithCourse();
    const lessonId = course.lessons[0]?.id ?? '';
    const badVideo = await request(app).patch(`${API}/lessons/${lessonId}`).set(auth).send({ type: 'video', videoUrl: 'https://example.com/x' });
    expect(badVideo.status).toBe(400);
    const video = await request(app).patch(`${API}/lessons/${lessonId}`).set(auth).send({ type: 'video', videoUrl: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(video.body).toMatchObject({ type: 'video', typeLocked: false });

    await enroll((await createUser()).id, course.id, [lessonId]);
    const editor = await request(app).get(`${API}/lessons/${lessonId}`).set(auth);
    expect(editor.body.typeLocked).toBe(true);
    const change = await request(app).patch(`${API}/lessons/${lessonId}`).set(auth).send({ type: 'text' });
    expect(change.status).toBe(422);
    expect((await request(app).patch(`${API}/lessons/${lessonId}`).set(auth).send({ title: 'Renamed lesson' })).status).toBe(200);
  });
});

describe('PUT /courses/:id/structure', () => {
  it('moves lessons between modules atomically', async () => {
    const { course, moduleId, auth } = await authorWithCourse();
    const second = await request(app).post(`${API}/courses/${course.id}/modules`).set(auth).send({ title: 'Second' });
    const [a, b, c] = course.lessons.map((lesson) => lesson.id);
    const response = await request(app)
      .put(`${API}/courses/${course.id}/structure`)
      .set(auth)
      .send({ modules: [{ moduleId: second.body.id, lessonIds: [c, a] }, { moduleId, lessonIds: [b] }] });
    expect(response.status).toBe(200);
    expect(response.body.map((module: { id: string }) => module.id)).toEqual([second.body.id, moduleId]);
    expect(response.body[0].lessons.map((lesson: { id: string }) => lesson.id)).toEqual([c, a]);
  });

  it('rejects a payload that does not list exactly the course modules and lessons', async () => {
    const { course, moduleId, auth } = await authorWithCourse();
    const [a, b] = course.lessons.map((lesson) => lesson.id);
    const missing = await request(app).put(`${API}/courses/${course.id}/structure`).set(auth).send({ modules: [{ moduleId, lessonIds: [a, b] }] });
    expect(missing.status).toBe(422);
    const order = await db.lesson.findMany({ where: { moduleId }, orderBy: { position: 'asc' }, select: { id: true } });
    expect(order.map((lesson) => lesson.id)).toEqual(course.lessons.map((lesson) => lesson.id));
  });
});

describe('deleting a lesson (BR-C3)', () => {
  it('completes enrollments whose remaining lessons are all done', async () => {
    const { course, auth } = await authorWithCourse();
    const [a, b, c] = course.lessons.map((lesson) => lesson.id);
    const student = await createUser();
    const enrollment = await enroll(student.id, course.id, [a ?? '', b ?? '']);
    expect((await request(app).delete(`${API}/lessons/${c}`).set(auth)).status).toBe(204);

    const stored = await db.enrollment.findUniqueOrThrow({ where: { id: enrollment.id }, include: { certificate: true } });
    expect(stored.status).toBe('completed');
    expect(stored.certificate).not.toBeNull();
  });
});

describe('PUT /lessons/:id/quiz', () => {
  const QUIZ = {
    passScore: 60,
    maxAttempts: 3,
    shuffle: true,
    revealAnswers: 'always',
    questions: [
      { type: 'single', text: 'Pick one', explanation: 'Because.', points: 2, options: [{ text: 'Yes', isCorrect: true }, { text: 'No', isCorrect: false }] },
      { type: 'multiple', text: 'Pick many', explanation: null, points: 1, options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: true }, { text: 'C', isCorrect: false }] },
    ],
  };

  it('replaces the quiz and returns it with ids', async () => {
    const { course, auth } = await authorWithCourse(['text', 'quiz']);
    const quizLesson = course.lessons[1]?.id ?? '';
    const saved = await request(app).put(`${API}/lessons/${quizLesson}/quiz`).set(auth).send(QUIZ);
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ passScore: 60, maxAttempts: 3, shuffle: true, revealAnswers: 'always' });
    expect(saved.body.questions).toHaveLength(2);
    expect(saved.body.questions[0].id).toBeTruthy();
    expect(saved.body.questions[1].options).toHaveLength(3);

    const again = await request(app)
      .put(`${API}/lessons/${quizLesson}/quiz`)
      .set(auth)
      .send({ ...QUIZ, questions: [{ ...saved.body.questions[0], text: 'Edited' }] });
    expect(again.body.questions).toEqual([expect.objectContaining({ id: saved.body.questions[0].id, text: 'Edited' })]);
  });

  it('validates correct answers and option counts', async () => {
    const { course, auth } = await authorWithCourse(['text', 'quiz']);
    const quizLesson = course.lessons[1]?.id ?? '';
    const put = (questions: unknown[]) => request(app).put(`${API}/lessons/${quizLesson}/quiz`).set(auth).send({ ...QUIZ, questions });
    const twoCorrect = { type: 'single', text: 'Q', explanation: null, points: 1, options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: true }] };
    const noCorrect = { ...twoCorrect, type: 'multiple', options: [{ text: 'A', isCorrect: false }, { text: 'B', isCorrect: false }] };
    const oneOption = { ...twoCorrect, options: [{ text: 'A', isCorrect: true }] };
    for (const question of [twoCorrect, noCorrect, oneOption]) expect((await put([question])).status).toBe(400);
  });
});
