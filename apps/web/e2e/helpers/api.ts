import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { DEMO_PASSWORD } from './i18n';

const API = '/api/v1';
const COVER = resolve(import.meta.dirname, '../../../../docs/api/fixtures/cover.png');

export const DEMO = {
  instructor: 'olena.teacher@learnly.local',
  admin: 'admin@learnly.local',
};

/** Bearer headers for a seeded account: setup steps go through the API, the scenario itself through the UI. */
export async function bearer(request: APIRequestContext, email: string, password = DEMO_PASSWORD) {
  const response = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(response.status()).toBe(200);
  const { accessToken } = (await response.json()) as { accessToken: string };
  return { Authorization: `Bearer ${accessToken}` };
}

async function ok<T>(response: Promise<APIResponse>): Promise<T> {
  const result = await response;
  expect(result.ok(), `${result.url()} → ${result.status()} ${await result.text()}`).toBe(true);
  return (await result.json()) as T;
}

export interface QuizQuestionSpec {
  text: string;
  correct: string;
  wrong: string;
}

export interface PublishedCourse {
  id: string;
  slug: string;
  title: string;
  lessons: { id: string; title: string }[];
}

/** An instructor course with two text lessons and a quiz, submitted and approved by the administrator. */
export async function publishCourse(request: APIRequestContext, questions: QuizQuestionSpec[]): Promise<PublishedCourse> {
  const instructor = await bearer(request, DEMO.instructor);
  const [category] = await ok<{ id: string }[]>(request.get(`${API}/categories`));
  const title = `E2E course ${Date.now()}`;
  const course = await ok<{ id: string; slug: string }>(
    request.post(`${API}/instructor/courses`, {
      headers: instructor,
      data: { title, categoryId: category?.id, level: 'beginner', language: 'en' },
    }),
  );
  const base = `${API}/instructor/courses/${course.id}`;
  await ok(
    request.patch(base, {
      headers: instructor,
      data: {
        shortDescription: 'A course created by the end-to-end tests.',
        description: 'Two short lessons and a quiz.',
        outcomes: ['Finish a course', 'Get a certificate'],
      },
    }),
  );
  await ok(
    request.post(`${base}/cover`, {
      headers: instructor,
      multipart: { file: { name: 'cover.png', mimeType: 'image/png', buffer: readFileSync(COVER) } },
    }),
  );
  const module = await ok<{ id: string }>(
    request.post(`${API}/instructor/courses/${course.id}/modules`, { headers: instructor, data: { title: 'Basics' } }),
  );
  const lessons: { id: string; title: string }[] = [];
  for (const [lessonTitle, type] of [
    ['First steps', 'text'],
    ['Next steps', 'text'],
    ['Final quiz', 'quiz'],
  ] as const) {
    const lesson = await ok<{ id: string }>(
      request.post(`${API}/instructor/modules/${module.id}/lessons`, { headers: instructor, data: { title: lessonTitle, type } }),
    );
    lessons.push({ id: lesson.id, title: lessonTitle });
    if (type === 'text') {
      await ok(
        request.patch(`${API}/instructor/lessons/${lesson.id}`, {
          headers: instructor,
          data: { content: `# ${lessonTitle}\n\nA variable stores a value for later use.`, durationMinutes: 5 },
        }),
      );
    } else {
      await ok(
        request.put(`${API}/instructor/lessons/${lesson.id}/quiz`, {
          headers: instructor,
          data: {
            passScore: 100,
            maxAttempts: 3,
            shuffle: false,
            revealAnswers: 'after_pass_or_exhausted',
            questions: questions.map((question) => ({
              type: 'single',
              text: question.text,
              explanation: null,
              points: 1,
              options: [
                { text: question.correct, isCorrect: true },
                { text: question.wrong, isCorrect: false },
              ],
            })),
          },
        }),
      );
    }
  }
  await ok(request.post(`${base}/submit`, { headers: instructor }));
  await ok(request.post(`${API}/admin/courses/${course.id}/approve`, { headers: await bearer(request, DEMO.admin) }));
  return { id: course.id, slug: course.slug, title, lessons };
}
