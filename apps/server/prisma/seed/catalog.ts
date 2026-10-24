import { slugify } from '@learnly/contracts/slugify';
import type { CourseStatus, LessonType, Locale } from '@learnly/contracts/enums';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { CATEGORIES } from './content/categories.js';
import { digitalMarketing, sqlForAnalysts } from './content/business.js';
import { designSystems, englishForIt } from './content/english.js';
import { timeManagement, uxResearchDraft } from './content/personal.js';
import { gitBasics, javascriptBasics, jqueryLegacy, pythonFirstSteps } from './content/programming.js';
import { generateCover } from './covers.js';
import { daysAgo } from './random.js';
import type { AuthorKey, CategoryKey, CourseSeed, LessonSeed } from './types.js';

export const COURSES: CourseSeed[] = [
  javascriptBasics,
  gitBasics,
  sqlForAnalysts,
  digitalMarketing,
  timeManagement,
  englishForIt,
  designSystems,
  pythonFirstSteps,
  uxResearchDraft,
  jqueryLegacy,
];

export interface SeededQuestion {
  id: string;
  points: number;
  explanation: string | null;
  options: { id: string; isCorrect: boolean }[];
}

export interface SeededLesson {
  id: string;
  type: LessonType;
  quiz: { id: string; questions: SeededQuestion[] } | null;
}

export interface SeededCourse {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  language: Locale;
  authorId: string;
  /** All lessons in curriculum order. */
  lessons: SeededLesson[];
}

async function createLesson(
  db: PrismaClient,
  moduleId: string,
  lesson: LessonSeed,
  position: number,
): Promise<SeededLesson> {
  const created = await db.lesson.create({
    data: {
      moduleId,
      position,
      title: lesson.title,
      type: lesson.type,
      durationMinutes: lesson.minutes,
      isPreview: lesson.preview ?? false,
      content: lesson.type === 'quiz' ? null : lesson.content,
      videoUrl: lesson.type === 'video' ? lesson.videoUrl : null,
    },
    select: { id: true },
  });
  if (lesson.type !== 'quiz') return { id: created.id, type: lesson.type, quiz: null };

  const quiz = await db.quiz.create({
    data: {
      lessonId: created.id,
      passScore: lesson.quiz.passScore ?? 70,
      maxAttempts: lesson.quiz.maxAttempts ?? null,
    },
    select: { id: true },
  });
  const questions: SeededQuestion[] = [];
  for (const [index, question] of lesson.quiz.questions.entries()) {
    const correctCount = question.options.filter(([, isCorrect]) => isCorrect).length;
    const created = await db.question.create({
      data: {
        quizId: quiz.id,
        position: index,
        text: question.text,
        explanation: question.explanation ?? null,
        points: question.points ?? 1,
        type: correctCount > 1 ? 'multiple' : 'single',
        options: {
          create: question.options.map(([text, isCorrect], position) => ({ text, isCorrect, position })),
        },
      },
      select: { id: true, points: true, explanation: true, options: { select: { id: true, isCorrect: true } } },
    });
    questions.push(created);
  }
  return { id: created.id, type: 'quiz', quiz: { id: quiz.id, questions } };
}

async function createTags(db: PrismaClient, courseId: string, tags: string[]): Promise<void> {
  for (const name of tags) {
    const tag = await db.tag.upsert({ where: { name }, create: { name }, update: {} });
    await db.courseTag.create({ data: { courseId, tagId: tag.id } });
  }
}

export async function seedCatalog(
  db: PrismaClient,
  authors: Record<AuthorKey, string>,
): Promise<SeededCourse[]> {
  const categoryIds = new Map<CategoryKey, string>();
  const accents = new Map(CATEGORIES.map((category) => [category.key, category.accent]));
  for (const [index, category] of CATEGORIES.entries()) {
    const created = await db.category.create({
      data: {
        nameUk: category.nameUk,
        nameEn: category.nameEn,
        slug: slugify(category.nameEn),
        accent: category.accent,
        sortOrder: index,
      },
    });
    categoryIds.set(category.key, created.id);
  }

  const seeded: SeededCourse[] = [];
  for (const [index, course] of COURSES.entries()) {
    const publishedDaysAgo = 150 - index * 12;
    const wasPublished = course.status === 'published' || course.status === 'archived';
    const created = await db.course.create({
      data: {
        authorId: authors[course.author],
        categoryId: categoryIds.get(course.category) ?? null,
        slug: slugify(course.title),
        title: course.title,
        shortDescription: course.shortDescription,
        description: course.description,
        coverUrl: await generateCover(accents.get(course.category) ?? 'blue', index),
        level: course.level,
        language: course.language,
        outcomes: course.outcomes,
        requirements: course.requirements,
        status: course.status,
        wasPublished,
        submittedAt: course.status === 'draft' ? null : daysAgo(publishedDaysAgo + 2),
        publishedAt: wasPublished ? daysAgo(publishedDaysAgo) : null,
        createdAt: daysAgo(publishedDaysAgo + 10),
      },
      select: { id: true, slug: true },
    });
    await createTags(db, created.id, course.tags);

    const lessons: SeededLesson[] = [];
    for (const [moduleIndex, module] of course.modules.entries()) {
      const createdModule = await db.module.create({
        data: { courseId: created.id, title: module.title, position: moduleIndex },
        select: { id: true },
      });
      for (const [lessonIndex, lesson] of module.lessons.entries()) {
        lessons.push(await createLesson(db, createdModule.id, lesson, lessonIndex));
      }
    }
    seeded.push({
      id: created.id,
      slug: created.slug,
      title: course.title,
      status: course.status,
      language: course.language,
      authorId: authors[course.author],
      lessons,
    });
  }
  return seeded;
}
