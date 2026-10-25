import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { testApp } from '../helpers/agent.js';
import { addReview, createCourse, createUser, enroll, TEST_PASSWORD } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();
const API = '/api/v1/instructor/courses';

let auth: Record<string, string>;
let course: Awaited<ReturnType<typeof createCourse>>;
let quizId: string;
let students: Awaited<ReturnType<typeof createUser>>[];

async function bearer(user: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

beforeAll(async () => {
  await resetDb();
  const author = await createUser({ role: 'instructor' });
  auth = await bearer(author);
  course = await createCourse({ authorId: author.id, lessons: ['text', 'text', { type: 'quiz', quiz: { maxAttempts: 2 } }] });
  const [l1, l2, l3] = course.lessons.map((lesson) => lesson.id);
  quizId = (await db.quiz.findUniqueOrThrow({ where: { lessonId: l3 ?? '' } })).id;
  students = await Promise.all(['Анна', 'Богдан', 'Віра'].map((name) => createUser({ name })));
  const [anna, bohdan, vira] = students;
  const annaEnrollment = await enroll(anna?.id ?? '', course.id, [l1 ?? '', l2 ?? '', l3 ?? '']);
  const bohdanEnrollment = await enroll(bohdan?.id ?? '', course.id, [l1 ?? '']);
  await enroll(vira?.id ?? '', course.id);
  const attempt = (enrollmentId: string, scorePercent: number, passed: boolean) =>
    db.quizAttempt.create({ data: { enrollmentId, quizId, answers: {}, result: {}, scorePoints: 0, maxPoints: 1, scorePercent, passed } });
  await attempt(annaEnrollment.id, 100, true);
  await attempt(bohdanEnrollment.id, 0, false);
  await attempt(bohdanEnrollment.id, 50, false);
  await addReview(anna?.id ?? '', course.id, 5);
  await addReview(bohdan?.id ?? '', course.id, 3);
});

describe('course students', () => {
  it('searches, sorts and paginates', async () => {
    const byProgress = await request(app).get(`${API}/${course.id}/students?sort=progress`).set(auth);
    expect(byProgress.body.items.map((row: { name: string }) => row.name)).toEqual(['Анна', 'Богдан', 'Віра']);
    expect(byProgress.body.items[0]).toMatchObject({ progress: 100, quizzes: [{ quizId, title: 'Lesson 3', bestScore: 100, attempts: 1, passed: true }] });

    const search = await request(app).get(`${API}/${course.id}/students?search=бог`).set(auth);
    expect(search.body).toMatchObject({ total: 1, items: [{ name: 'Богдан' }] });

    const paged = await request(app).get(`${API}/${course.id}/students?sort=name&limit=2&page=2`).set(auth);
    expect(paged.body).toMatchObject({ total: 3, page: 2, items: [{ name: 'Віра' }] });
  });

  it('exports CSV with a BOM and headers in the request language', async () => {
    const uk = await request(app).get(`${API}/${course.id}/students.csv`).set(auth).set('Accept-Language', 'uk');
    expect(uk.headers['content-type']).toContain('text/csv');
    expect(uk.text.startsWith('﻿')).toBe(true);
    expect(uk.text).toContain('Студент,Дата запису');
    expect(uk.text.trim().split('\r\n')).toHaveLength(4);

    // The account language beats Accept-Language; an explicit ?lang= choice beats both.
    const en = await request(app).get(`${API}/${course.id}/students.csv?lang=en`).set(auth);
    expect(en.text).toContain('Student,Enrolled on,"Progress, %"');
  });

  it('resets attempts and un-completes the quiz lesson (BR-Q3)', async () => {
    const bohdan = students[1]?.id ?? '';
    expect((await request(app).delete(`${API}/${course.id}/students/${bohdan}/attempts/${quizId}`).set(auth)).status).toBe(204);
    const enrollment = await db.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: bohdan, courseId: course.id } } });
    expect(await db.quizAttempt.count({ where: { enrollmentId: enrollment.id } })).toBe(0);
    const anna = students[0]?.id ?? '';
    await request(app).delete(`${API}/${course.id}/students/${anna}/attempts/${quizId}`).set(auth);
    const annaEnrollment = await db.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: anna, courseId: course.id } } });
    expect(await db.lessonCompletion.count({ where: { enrollmentId: annaEnrollment.id, lessonId: course.lessons[2]?.id } })).toBe(0);
  });

  it('is only for the course author', async () => {
    const other = await bearer(await createUser({ role: 'instructor' }));
    expect((await request(app).get(`${API}/${course.id}/students`).set(other)).status).toBe(403);
    expect((await request(app).get(`${API}/${course.id}/stats`).set(other)).status).toBe(403);
  });
});

describe('course statistics', () => {
  it('builds the funnel, weekly buckets, quiz results and ratings', async () => {
    const stats = (await request(app).get(`${API}/${course.id}/stats`).set(auth)).body;
    expect(stats.totals).toMatchObject({ students: 3, ratingAvg: 4 });
    expect(stats.enrollmentsByWeek).toHaveLength(12);
    expect(stats.enrollmentsByWeek.at(-1).count).toBe(3);
    expect(stats.funnel.map((step: { lessonId: string }) => step.lessonId)).toEqual(course.lessons.map((lesson) => lesson.id));
    expect(stats.funnel[0].completedShare).toBeCloseTo(2 / 3);
    expect(stats.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 });
  });

  it('computes quiz averages and the first-try pass share', async () => {
    const fresh = await createCourse({ authorId: course.authorId, lessons: [{ type: 'quiz' }] });
    const freshQuiz = (await db.quiz.findUniqueOrThrow({ where: { lessonId: fresh.lessons[0]?.id ?? '' } })).id;
    for (const [score, passed] of [[100, true], [40, false]] as const) {
      const enrollment = await enroll((await createUser()).id, fresh.id);
      await db.quizAttempt.create({ data: { enrollmentId: enrollment.id, quizId: freshQuiz, answers: {}, result: {}, scorePoints: 0, maxPoints: 1, scorePercent: score, passed } });
    }
    const stats = (await request(app).get(`${API}/${fresh.id}/stats`).set(auth)).body;
    expect(stats.quizzes).toEqual([{ quizId: freshQuiz, title: 'Lesson 1', avgScore: 70, firstTryPassShare: 0.5 }]);
  });
});
