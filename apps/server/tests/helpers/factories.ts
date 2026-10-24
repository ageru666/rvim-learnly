import { randomUUID } from 'node:crypto';
import type { CourseStatus, LessonType, Locale, Role } from '@learnly/contracts/enums';
import { db } from '../../src/lib/db.js';
import { hashPassword } from '../../src/lib/passwords.js';

export const TEST_PASSWORD = 'Passw0rd!';
let passwordHash: string | undefined;

async function testPasswordHash(): Promise<string> {
  passwordHash ??= await hashPassword(TEST_PASSWORD);
  return passwordHash;
}

export interface UserOverrides {
  role?: Role;
  locale?: Locale;
  verified?: boolean;
  status?: 'active' | 'blocked';
  name?: string;
}

export async function createUser(overrides: UserOverrides = {}) {
  return db.user.create({
    data: {
      email: `user-${randomUUID()}@test.local`,
      name: overrides.name ?? 'Test User',
      passwordHash: await testPasswordHash(),
      role: overrides.role ?? 'student',
      locale: overrides.locale ?? 'uk',
      status: overrides.status ?? 'active',
      emailVerifiedAt: overrides.verified === false ? null : new Date(),
    },
  });
}

export interface CourseOverrides {
  authorId?: string;
  status?: CourseStatus;
  language?: Locale;
  lessons?: LessonType[];
  title?: string;
}

/** A course with one module and the given lesson types (quiz lessons get a one-question quiz). */
export async function createCourse(overrides: CourseOverrides = {}) {
  const authorId = overrides.authorId ?? (await createUser({ role: 'instructor' })).id;
  const status = overrides.status ?? 'published';
  const course = await db.course.create({
    data: {
      authorId,
      slug: `course-${randomUUID()}`,
      title: overrides.title ?? 'Test course',
      shortDescription: 'Short description',
      description: 'Description',
      language: overrides.language ?? 'uk',
      status,
      wasPublished: status === 'published' || status === 'archived',
      publishedAt: status === 'published' ? new Date() : null,
    },
  });
  const module = await db.module.create({ data: { courseId: course.id, title: 'Module', position: 0 } });
  const lessonTypes = overrides.lessons ?? ['text', 'video', 'quiz'];
  for (const [position, type] of lessonTypes.entries()) {
    const lesson = await db.lesson.create({
      data: { moduleId: module.id, title: `Lesson ${position + 1}`, type, position, content: 'Content' },
    });
    if (type === 'quiz') {
      await db.quiz.create({
        data: {
          lessonId: lesson.id,
          questions: {
            create: {
              type: 'single',
              text: 'Question',
              position: 0,
              options: {
                create: [
                  { text: 'Right', isCorrect: true, position: 0 },
                  { text: 'Wrong', isCorrect: false, position: 1 },
                ],
              },
            },
          },
        },
      });
    }
  }
  return course;
}
