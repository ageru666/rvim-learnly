import { CERTIFICATE_CODE_PATTERN } from '@learnly/contracts/certificates';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { generateCode } from '../../src/modules/certificates/certificates.service.js';
import { testApp } from '../helpers/agent.js';
import { createCourse, createUser, enroll, TEST_PASSWORD } from '../helpers/factories.js';
import { resetDb } from '../helpers/testDb.js';

const app = testApp();

beforeAll(resetDb);

async function bearer(user: { email: string }) {
  const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return { Authorization: `Bearer ${(response.body as { accessToken: string }).accessToken}` };
}

/** A two-lesson text course; the first lesson is already completed. */
async function almostDone() {
  const course = await createCourse({ title: 'Git every day', lessons: ['text', 'video'] });
  const student = await createUser({ name: 'Taras Shevchuk' });
  const enrollment = await enroll(student.id, course.id, [course.lessons[0]?.id ?? '']);
  const last = course.lessons[1]?.id ?? '';
  return { course, student, enrollment, last, auth: await bearer(student) };
}

describe('course completion (BR-C1)', () => {
  it('completes the enrollment, issues one certificate and notifies the student', async () => {
    const { auth, last, enrollment, student } = await almostDone();
    const response = await request(app).put(`/api/v1/learn/lessons/${last}/completion`).set(auth);
    expect(response.body).toMatchObject({ progress: 100, courseCompleted: true });
    expect(response.body.certificateCode).toMatch(CERTIFICATE_CODE_PATTERN);

    const stored = await db.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(stored.status).toBe('completed');
    expect(stored.completedAt).not.toBeNull();
    const notifications = await db.notification.findMany({ where: { userId: student.id, type: 'course_completed' } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.payload).toMatchObject({ certificateCode: response.body.certificateCode });
  });

  it('issues exactly one certificate for concurrent completion requests', async () => {
    const { auth, last, enrollment, student } = await almostDone();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => request(app).put(`/api/v1/learn/lessons/${last}/completion`).set(auth)),
    );
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await db.certificate.count({ where: { enrollmentId: enrollment.id } })).toBe(1);
    expect(await db.notification.count({ where: { userId: student.id, type: 'course_completed' } })).toBe(1);
    expect(new Set(responses.map((response) => response.body.certificateCode)).size).toBe(1);
  });

  it('keeps the status and the certificate when lessons are added later (BR-C2)', async () => {
    const { auth, last, enrollment, course } = await almostDone();
    await request(app).put(`/api/v1/learn/lessons/${last}/completion`).set(auth);
    const moduleId = (await db.module.findFirstOrThrow({ where: { courseId: course.id } })).id;
    await db.lesson.create({ data: { moduleId, title: 'New lesson', type: 'text', position: 5 } });

    const learn = await request(app).get(`/api/v1/learn/courses/${course.id}`).set(auth);
    expect(learn.body).toMatchObject({ progress: 66, status: 'completed' });
    expect(await db.certificate.count({ where: { enrollmentId: enrollment.id } })).toBe(1);
  });

  it('cannot leave a course with a certificate', async () => {
    const { auth, last, course } = await almostDone();
    await request(app).put(`/api/v1/learn/lessons/${last}/completion`).set(auth);
    const leave = await request(app).delete(`/api/v1/courses/${course.id}/enrollment`).set(auth);
    expect(leave.status).toBe(422);
  });

  it('completes the course through the last quiz too', async () => {
    const course = await createCourse({ lessons: [{ type: 'quiz', quiz: { questions: [{ type: 'single', options: [true, false] }] } }] });
    const student = await createUser();
    await enroll(student.id, course.id);
    const quiz = await db.quiz.findUniqueOrThrow({
      where: { lessonId: course.lessons[0]?.id ?? '' },
      include: { questions: { include: { options: true } } },
    });
    const question = quiz.questions[0];
    const right = question?.options.find((option) => option.isCorrect)?.id ?? '';
    const response = await request(app)
      .post(`/api/v1/learn/quizzes/${quiz.id}/attempts`)
      .set(await bearer(student))
      .send({ answers: { [question?.id ?? '']: [right] } });
    expect(response.body.progress).toMatchObject({ progress: 100, courseCompleted: true });
  });
});

describe('certificates', () => {
  it('uses a code alphabet without look-alike characters', () => {
    for (let index = 0; index < 200; index += 1) {
      const code = generateCode();
      expect(code).toMatch(CERTIFICATE_CODE_PATTERN);
      expect(code).not.toMatch(/[0O1IL]/);
    }
  });

  it('verifies a certificate publicly and lists it for its owner', async () => {
    const { auth, last } = await almostDone();
    const done = await request(app).put(`/api/v1/learn/lessons/${last}/completion`).set(auth);
    const code = done.body.certificateCode as string;

    const publicView = await request(app).get(`/api/v1/certificates/${code}`);
    expect(publicView.body).toMatchObject({ code, studentName: 'Taras Shevchuk', courseTitle: 'Git every day', revoked: false });
    expect(publicView.body.url).toMatch(new RegExp(`/certificates/${code}$`));
    expect((await request(app).get(`/api/v1/certificates/${code.toLowerCase()}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/certificates/AAAAAAAAAA')).status).toBe(404);

    const mine = await request(app).get('/api/v1/me/certificates').set(auth);
    expect(mine.body.map((certificate: { code: string }) => certificate.code)).toEqual([code]);
    const dashboard = await request(app).get('/api/v1/me/dashboard').set(auth);
    expect(dashboard.body.certificates).toHaveLength(1);
  });

  it('renders the verification page in the viewer language, with revoked and not-found states', async () => {
    const { auth, last } = await almostDone();
    const code = (await request(app).put(`/api/v1/learn/lessons/${last}/completion`).set(auth)).body.certificateCode as string;

    const uk = await request(app).get(`/certificates/${code}`).set('Accept-Language', 'uk');
    expect(uk.status).toBe(200);
    expect(uk.text).toContain('Сертифікат дійсний');
    expect(uk.text).toContain('Taras Shevchuk');
    const en = await request(app).get(`/certificates/${code}?lang=en`);
    expect(en.text).toContain('The certificate is valid');

    await db.certificate.update({ where: { code }, data: { revokedAt: new Date(), revokedReason: 'Fraud detected here' } });
    expect((await request(app).get(`/certificates/${code}?lang=en`)).text).toContain('The certificate has been revoked');
    expect((await request(app).get(`/api/v1/certificates/${code}`)).body.revoked).toBe(true);

    const missing = await request(app).get('/certificates/NOPE?lang=en');
    expect(missing.status).toBe(404);
    expect(missing.text).toContain('Certificate not found');
  });
});
