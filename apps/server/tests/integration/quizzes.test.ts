import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { testApp } from '../helpers/agent.js';
import { createCourse, createUser, enroll, TEST_PASSWORD, type QuizSpec } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();

beforeAll(resetDb);

async function bearer(user: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

const TWO_QUESTIONS: QuizSpec['questions'] = [
  { type: 'single', options: [true, false], explanation: 'The first option is right.' },
  { type: 'multiple', points: 2, options: [true, true, false] },
];

/** A course with one text lesson and one quiz lesson, and an enrolled student. */
async function setup(quiz: QuizSpec = {}) {
  const course = await createCourse({ lessons: ['text', { type: 'quiz', quiz: { questions: TWO_QUESTIONS, ...quiz } }] });
  const quizLesson = course.lessons[1];
  const stored = await db.quiz.findUniqueOrThrow({
    where: { lessonId: quizLesson?.id ?? '' },
    include: { questions: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } } },
  });
  const student = await createUser();
  await enroll(student.id, course.id);
  const [q1, q2] = stored.questions;
  const ids = (question: typeof q1, flags: boolean[]) =>
    (question?.options ?? []).filter((_, index) => flags[index]).map((option) => option.id);
  return {
    course,
    quiz: stored,
    lessonId: quizLesson?.id ?? '',
    auth: await bearer(student),
    correct: { [q1?.id ?? '']: ids(q1, [true, false]), [q2?.id ?? '']: ids(q2, [true, true, false]) },
    wrong: { [q1?.id ?? '']: ids(q1, [false, true]), [q2?.id ?? '']: ids(q2, [true, false, false]) },
  };
}

function submit(quizId: string, auth: Record<string, string>, answers: Record<string, string[]>) {
  return request(app).post(`/api/v1/learn/quizzes/${quizId}/attempts`).set(auth).send({ answers });
}

describe('GET /learn/quizzes/:id', () => {
  it('never sends correct answers or explanations before submitting', async () => {
    const { quiz, auth } = await setup();
    const response = await request(app).get(`/api/v1/learn/quizzes/${quiz.id}`).set(auth);
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toMatch(/isCorrect|explanation/);
    expect(response.body).toMatchObject({ passScore: 70, attemptsUsed: 0, bestScore: null, passed: false, canSubmit: true });
    expect(response.body.questions).toHaveLength(2);
  });

  it('returns a permutation of questions and options when shuffling', async () => {
    const { quiz, auth } = await setup({ shuffle: true });
    const ids = (body: { questions: { id: string; options: { id: string }[] }[] }) =>
      body.questions.flatMap((question) => [question.id, ...question.options.map((option) => option.id)]).sort();
    const response = await request(app).get(`/api/v1/learn/quizzes/${quiz.id}`).set(auth);
    const expected = quiz.questions.flatMap((question) => [question.id, ...question.options.map((option) => option.id)]).sort();
    expect(ids(response.body)).toEqual(expected);
  });
});

describe('POST /learn/quizzes/:id/attempts', () => {
  it('grades on the server and hides the answers of a failed attempt', async () => {
    const { quiz, auth, wrong } = await setup();
    const response = await submit(quiz.id, auth, wrong);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ scorePercent: 0, passed: false, attemptsLeft: null, answersRevealed: false });
    expect(response.body.questions[0]).toMatchObject({ correct: false, explanation: 'The first option is right.', correctOptionIds: null });
    expect(response.body.progress.progress).toBe(0);
  });

  it('marks the quiz lesson completed on passing, and it cannot be unmarked (BR-L2)', async () => {
    const { quiz, auth, correct, lessonId } = await setup();
    const response = await submit(quiz.id, auth, correct);
    expect(response.body).toMatchObject({ scorePercent: 100, passed: true, answersRevealed: true });
    expect(response.body.progress).toMatchObject({ progress: 50, completedLessonIds: [lessonId] });
    expect(response.body.questions[1].correctOptionIds).toHaveLength(2);

    const undo = await request(app).delete(`/api/v1/learn/lessons/${lessonId}/completion`).set(auth);
    expect(undo.status).toBe(422);
    expect(undo.body.error.rule).toBe('BR-L2');

    const info = await request(app).get(`/api/v1/learn/quizzes/${quiz.id}`).set(auth);
    expect(info.body).toMatchObject({ attemptsUsed: 1, bestScore: 100, passed: true });
  });

  it('stops at the attempt limit and reveals answers once attempts run out (BR-Q3)', async () => {
    const { quiz, auth, wrong } = await setup({ maxAttempts: 2 });
    expect((await submit(quiz.id, auth, wrong)).body).toMatchObject({ attemptsLeft: 1, answersRevealed: false });
    expect((await submit(quiz.id, auth, wrong)).body).toMatchObject({ attemptsLeft: 0, answersRevealed: true });
    const third = await submit(quiz.id, auth, wrong);
    expect(third.status).toBe(422);
    expect(third.body.error.rule).toBe('BR-Q3');
  });

  it('reveals answers right away in the "always" mode', async () => {
    const { quiz, auth, wrong } = await setup({ revealAnswers: 'always' });
    const response = await submit(quiz.id, auth, wrong);
    expect(response.body.answersRevealed).toBe(true);
    expect(response.body.questions[0].correctOptionIds).toHaveLength(1);
  });

  it('rejects answers to foreign questions or options (BR-Q4)', async () => {
    const { quiz, auth } = await setup();
    const other = await setup();
    const response = await submit(quiz.id, auth, other.correct);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('keeps stored results when questions are edited later (BR-Q5)', async () => {
    const { quiz, auth, correct } = await setup();
    await submit(quiz.id, auth, correct);
    await db.answerOption.updateMany({ where: { question: { quizId: quiz.id } }, data: { isCorrect: false } });
    const history = await request(app).get(`/api/v1/learn/quizzes/${quiz.id}/attempts`).set(auth);
    expect(history.body).toEqual([expect.objectContaining({ scorePercent: 100, passed: true })]);
  });

  it('lets the author open the quiz in preview but not submit it', async () => {
    const { quiz, course, correct } = await setup();
    const author = await db.user.findUniqueOrThrow({ where: { id: course.authorId } });
    const auth = await bearer(author);
    expect((await request(app).get(`/api/v1/learn/quizzes/${quiz.id}`).set(auth)).body.canSubmit).toBe(false);
    expect((await submit(quiz.id, auth, correct)).status).toBe(422);
  });

  it('refuses users who are not enrolled', async () => {
    const { quiz } = await setup();
    const outsider = await bearer(await createUser());
    expect((await request(app).get(`/api/v1/learn/quizzes/${quiz.id}`).set(outsider)).status).toBe(403);
  });
});
