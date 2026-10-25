import type { Page } from '@learnly/contracts/common';
import type { CourseStats, StudentRow, StudentsQuery } from '@learnly/contracts/instructor';
import { computeProgress } from '@learnly/contracts/progress';
import type { MessageKey } from '@learnly/i18n/keys';
import type { Translator } from '@learnly/i18n/translator';
import { formatDate } from '@learnly/i18n/format';
import { db } from '../../lib/db.js';
import { toPage } from '../../lib/pagination.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ownCourse } from '../courses/courses.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 12;
const PERCENT = 100;
const CSV_BOM = '﻿';

/** All students of a course with progress and quiz results; courses are small enough to rank in memory. */
async function courseStudents(courseId: string): Promise<{ rows: StudentRow[]; quizTitles: { quizId: string; title: string }[] }> {
  const [enrollments, lessonCount, quizzes] = await Promise.all([
    db.enrollment.findMany({
      where: { courseId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { completions: true } },
        attempts: { select: { quizId: true, scorePercent: true, passed: true } },
      },
    }),
    db.lesson.count({ where: { module: { courseId } } }),
    db.quiz.findMany({
      where: { lesson: { module: { courseId } } },
      orderBy: [{ lesson: { module: { position: 'asc' } } }, { lesson: { position: 'asc' } }],
      select: { id: true, lesson: { select: { title: true } } },
    }),
  ]);
  const rows = enrollments.map((enrollment) => ({
    userId: enrollment.user.id,
    name: enrollment.user.name,
    avatarUrl: enrollment.user.avatarUrl,
    enrolledAt: enrollment.enrolledAt.toISOString(),
    progress: computeProgress(enrollment._count.completions, lessonCount),
    lastActivityAt: enrollment.lastActivityAt.toISOString(),
    status: enrollment.status,
    quizzes: quizzes.map((quiz) => {
      const attempts = enrollment.attempts.filter((attempt) => attempt.quizId === quiz.id);
      return {
        quizId: quiz.id,
        title: quiz.lesson.title,
        bestScore: attempts.length > 0 ? Math.max(...attempts.map((attempt) => attempt.scorePercent)) : null,
        attempts: attempts.length,
        passed: attempts.some((attempt) => attempt.passed),
      };
    }),
  }));
  return { rows, quizTitles: quizzes.map((quiz) => ({ quizId: quiz.id, title: quiz.lesson.title })) };
}

const SORTS: Record<StudentsQuery['sort'], (a: StudentRow, b: StudentRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  enrolledAt: (a, b) => Date.parse(b.enrolledAt) - Date.parse(a.enrolledAt),
  progress: (a, b) => b.progress - a.progress,
  lastActivity: (a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt),
};

function filterAndSort(rows: StudentRow[], query: Pick<StudentsQuery, 'search' | 'sort'>): StudentRow[] {
  const needle = query.search?.toLocaleLowerCase();
  return rows.filter((row) => !needle || row.name.toLocaleLowerCase().includes(needle)).sort(SORTS[query.sort]);
}

/** FR-TEACH-5. */
export async function listStudents(user: AuthUser, courseId: string, query: StudentsQuery): Promise<Page<StudentRow>> {
  await ownCourse(user, courseId);
  const rows = filterAndSort((await courseStudents(courseId)).rows, query);
  const start = (query.page - 1) * query.limit;
  return toPage(rows.slice(start, start + query.limit), rows.length, query);
}

const CSV_COLUMNS: MessageKey[] = ['csv.students.name', 'csv.students.enrolledAt', 'csv.students.progress', 'csv.students.lastActivity', 'csv.students.status'];

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",;\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** CSV with a UTF-8 BOM (Excel) and headers in the requester's locale; one column per quiz. */
export async function exportStudentsCsv(
  user: AuthUser,
  courseId: string,
  query: Pick<StudentsQuery, 'search' | 'sort'>,
  i18n: Translator,
): Promise<string> {
  await ownCourse(user, courseId);
  const { rows, quizTitles } = await courseStudents(courseId);
  const header = [...CSV_COLUMNS.map((key) => i18n.translate(key)), ...quizTitles.map((quiz) => i18n.t('csv.students.quiz', { title: quiz.title }))];
  const lines = filterAndSort(rows, query).map((row) => [
    row.name,
    formatDate(i18n.locale, row.enrolledAt),
    row.progress,
    formatDate(i18n.locale, row.lastActivityAt),
    i18n.translate(`enums.enrollmentStatus.${row.status}`),
    ...row.quizzes.map((quiz) => quiz.bestScore ?? ''),
  ]);
  return CSV_BOM + [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function mondayUtc(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - offset * DAY_MS);
}

const share = (part: number, whole: number) => (whole === 0 ? 0 : part / whole);

/** FR-TEACH-6: weekly enrollments, the completion funnel, quiz results and ratings. */
export async function getCourseStats(user: AuthUser, courseId: string): Promise<CourseStats> {
  const course = await ownCourse(user, courseId);
  const lessons = course.modules.flatMap((module) => module.lessons);
  const quizLessons = lessons.filter((lesson) => lesson.quiz);
  const firstWeek = new Date(mondayUtc(new Date()).getTime() - (WEEKS - 1) * 7 * DAY_MS);

  const [enrollments, completions, attempts, ratings] = await Promise.all([
    db.enrollment.findMany({ where: { courseId }, select: { status: true, enrolledAt: true, _count: { select: { completions: true } } } }),
    db.lessonCompletion.groupBy({ by: ['lessonId'], where: { lesson: { module: { courseId } } }, _count: { _all: true } }),
    db.quizAttempt.findMany({
      where: { quiz: { lesson: { module: { courseId } } } },
      orderBy: { submittedAt: 'asc' },
      select: { quizId: true, enrollmentId: true, scorePercent: true, passed: true },
    }),
    db.review.groupBy({ by: ['rating'], where: { courseId, status: 'visible' }, _count: { _all: true } }),
  ]);

  const students = enrollments.length;
  const avgProgress = students === 0 ? 0 : Math.round(enrollments.reduce((sum, item) => sum + computeProgress(item._count.completions, lessons.length), 0) / students);
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as CourseStats['ratingDistribution'];
  let ratingSum = 0;
  let ratingCount = 0;
  for (const group of ratings) {
    ratingDistribution[String(group.rating) as keyof CourseStats['ratingDistribution']] = group._count._all;
    ratingSum += group.rating * group._count._all;
    ratingCount += group._count._all;
  }
  const completedByLesson = new Map(completions.map((group) => [group.lessonId, group._count._all]));

  return {
    totals: {
      students,
      completed: enrollments.filter((item) => item.status === 'completed').length,
      avgProgress,
      ratingAvg: ratingCount === 0 ? null : Math.round((ratingSum / ratingCount) * 10) / 10,
    },
    enrollmentsByWeek: Array.from({ length: WEEKS }, (_, index) => {
      const start = new Date(firstWeek.getTime() + index * 7 * DAY_MS);
      const end = start.getTime() + 7 * DAY_MS;
      return {
        weekStart: start.toISOString().slice(0, 10),
        count: enrollments.filter((item) => item.enrolledAt.getTime() >= start.getTime() && item.enrolledAt.getTime() < end).length,
      };
    }),
    funnel: lessons.map((lesson) => ({ lessonId: lesson.id, title: lesson.title, completedShare: share(completedByLesson.get(lesson.id) ?? 0, students) })),
    quizzes: quizLessons.map((lesson) => {
      const quizId = lesson.quiz?.id ?? '';
      const ofQuiz = attempts.filter((attempt) => attempt.quizId === quizId);
      const firstAttempts = new Map<string, boolean>();
      for (const attempt of ofQuiz) if (!firstAttempts.has(attempt.enrollmentId)) firstAttempts.set(attempt.enrollmentId, attempt.passed);
      const firstPasses = [...firstAttempts.values()].filter(Boolean).length;
      return {
        quizId,
        title: lesson.title,
        avgScore: ofQuiz.length === 0 ? null : Math.round(ofQuiz.reduce((sum, attempt) => sum + attempt.scorePercent, 0) / ofQuiz.length),
        firstTryPassShare: firstAttempts.size === 0 ? null : Math.round(share(firstPasses, firstAttempts.size) * PERCENT) / PERCENT,
      };
    }),
    ratingDistribution,
  };
}
