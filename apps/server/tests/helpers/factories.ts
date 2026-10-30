import { randomUUID } from 'node:crypto';
import type {
  Accent,
  CourseLevel,
  CourseStatus,
  LessonType,
  Locale,
  QuestionType,
  RevealAnswers,
  Role,
} from '@learnly/contracts/enums';
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
  email?: string;
}

export async function createUser(overrides: UserOverrides = {}) {
  return db.user.create({
    data: {
      email: overrides.email ?? `user-${randomUUID()}@test.local`,
      name: overrides.name ?? 'Test User',
      passwordHash: await testPasswordHash(),
      role: overrides.role ?? 'student',
      locale: overrides.locale ?? 'uk',
      status: overrides.status ?? 'active',
      emailVerifiedAt: overrides.verified === false ? null : new Date(),
    },
  });
}

export async function createCategory(overrides: { nameEn?: string; nameUk?: string; accent?: Accent } = {}) {
  const suffix = randomUUID().slice(0, 8);
  const nameEn = overrides.nameEn ?? `Category ${suffix}`;
  return db.category.create({
    data: {
      nameEn,
      nameUk: overrides.nameUk ?? `Категорія ${suffix}`,
      slug: nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      accent: overrides.accent ?? 'blue',
    },
  });
}

interface QuestionSpec {
  type: QuestionType;
  points?: number;
  /** One flag per option: is it correct. */
  options: boolean[];
  explanation?: string;
}

export interface QuizSpec {
  passScore?: number;
  maxAttempts?: number | null;
  shuffle?: boolean;
  revealAnswers?: RevealAnswers;
  questions?: QuestionSpec[];
}

interface LessonSpec {
  type: LessonType;
  isPreview?: boolean;
  minutes?: number;
  quiz?: QuizSpec;
}

const DEFAULT_QUESTIONS: QuestionSpec[] = [{ type: 'single', options: [true, false] }];

export interface CourseOverrides {
  authorId?: string;
  categoryId?: string;
  status?: CourseStatus;
  language?: Locale;
  level?: CourseLevel;
  lessons?: (LessonType | LessonSpec)[];
  title?: string;
  shortDescription?: string;
  slug?: string;
  tags?: string[];
  publishedAt?: Date;
}

/** A course with one module and the given lessons (quiz lessons get a one-question quiz). */
export async function createCourse(overrides: CourseOverrides = {}) {
  const authorId = overrides.authorId ?? (await createUser({ role: 'instructor' })).id;
  const categoryId = overrides.categoryId ?? (await createCategory()).id;
  const status = overrides.status ?? 'published';
  const course = await db.course.create({
    data: {
      authorId,
      categoryId,
      slug: overrides.slug ?? `course-${randomUUID()}`,
      title: overrides.title ?? 'Test course',
      shortDescription: overrides.shortDescription ?? 'Short description',
      description: 'Description',
      level: overrides.level ?? 'beginner',
      language: overrides.language ?? 'uk',
      status,
      wasPublished: status === 'published' || status === 'archived',
      publishedAt: status === 'published' ? (overrides.publishedAt ?? new Date()) : null,
      tags: overrides.tags
        ? {
            create: overrides.tags.map((name) => ({
              tag: { connectOrCreate: { where: { name }, create: { name } } },
            })),
          }
        : undefined,
    },
  });
  const module = await db.module.create({ data: { courseId: course.id, title: 'Module', position: 0 } });
  const specs = (overrides.lessons ?? ['text', 'video', 'quiz']).map((lesson) =>
    typeof lesson === 'string' ? { type: lesson } : lesson,
  );
  const lessons = [];
  for (const [position, spec] of specs.entries()) {
    const lesson = await db.lesson.create({
      data: {
        moduleId: module.id,
        title: `Lesson ${position + 1}`,
        type: spec.type,
        position,
        content: 'Lesson content',
        videoUrl: spec.type === 'video' ? 'https://youtu.be/dQw4w9WgXcQ' : null,
        isPreview: spec.isPreview ?? false,
        durationMinutes: spec.minutes ?? 10,
      },
    });
    lessons.push(lesson);
    if (spec.type === 'quiz') {
      const quiz = spec.quiz ?? {};
      await db.quiz.create({
        data: {
          lessonId: lesson.id,
          passScore: quiz.passScore ?? 70,
          maxAttempts: quiz.maxAttempts ?? null,
          shuffle: quiz.shuffle ?? false,
          revealAnswers: quiz.revealAnswers ?? 'after_pass_or_exhausted',
          questions: {
            create: (quiz.questions ?? DEFAULT_QUESTIONS).map((question, questionIndex) => ({
              type: question.type,
              text: `Question ${questionIndex + 1}`,
              points: question.points ?? 1,
              explanation: question.explanation ?? null,
              position: questionIndex,
              options: {
                create: question.options.map((isCorrect, optionIndex) => ({
                  text: `Option ${optionIndex + 1}`,
                  isCorrect,
                  position: optionIndex,
                })),
              },
            })),
          },
        },
      });
    }
  }
  return { ...course, lessons };
}

export async function enroll(userId: string, courseId: string, completedLessonIds: string[] = []) {
  const enrollment = await db.enrollment.create({ data: { userId, courseId } });
  if (completedLessonIds.length > 0) {
    await db.lessonCompletion.createMany({
      data: completedLessonIds.map((lessonId) => ({ enrollmentId: enrollment.id, lessonId })),
    });
  }
  return enrollment;
}

export async function addReview(
  userId: string,
  courseId: string,
  rating: number,
  options: { hidden?: boolean; text?: string } = {},
) {
  return db.review.create({
    data: {
      userId,
      courseId,
      rating,
      text: options.text ?? 'A helpful course with clear lessons.',
      status: options.hidden ? 'hidden' : 'visible',
      hiddenReason: options.hidden ? 'Spam' : null,
    },
  });
}
