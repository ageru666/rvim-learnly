import type { CourseCard } from '@learnly/contracts/catalog';
import type { Page } from '@learnly/contracts/common';
import type { Locale } from '@learnly/contracts/enums';
import type { Dashboard, EnrollResult, MyCourse, MyCoursesQuery } from '@learnly/contracts/learning';
import { DASHBOARD_ACTIVE_COURSES, DASHBOARD_NOTIFICATIONS, RECOMMENDATIONS_LIMIT } from '@learnly/contracts/limits';
import { db } from '../../lib/db.js';
import { conflict, notFound, ruleViolation } from '../../lib/errors.js';
import { toPage, toSkipTake } from '../../lib/pagination.js';
import { Prisma } from '../../generated/prisma/client.js';
import { courseCardInclude, loadCourseCards, loadCourseStats, toCourseCard } from '../catalog/course-card.js';
import { computeProgress } from '@learnly/contracts/progress';
import { listMine } from '../certificates/certificates.service.js';
import { latestNotifications } from '../notifications/notifications.service.js';

/** First lesson in curriculum order: modules by position, then lessons by position. */
function firstLesson(courseId: string): Promise<{ id: string; title: string } | null> {
  return db.lesson.findFirst({
    where: { module: { courseId } },
    orderBy: [{ module: { position: 'asc' } }, { position: 'asc' }],
    select: { id: true, title: true },
  });
}

/** FR-LEARN-1 with BR-E1 (published only) and BR-E2 (not the author). */
export async function enroll(userId: string, courseId: string): Promise<EnrollResult> {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { status: true, authorId: true } });
  if (!course) throw notFound();
  if (course.status !== 'published') throw ruleViolation('BR-E1', 'errors.learning.notPublished');
  if (course.authorId === userId) throw ruleViolation('BR-E2', 'errors.learning.ownCourse');
  try {
    const enrollment = await db.enrollment.create({ data: { userId, courseId }, select: { id: true } });
    return { enrollmentId: enrollment.id, firstLessonId: (await firstLesson(courseId))?.id ?? null };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('errors.learning.alreadyEnrolled');
    }
    throw error;
  }
}

/** Leaving deletes the enrollment with its progress; a course with a certificate cannot be left. */
export async function leave(userId: string, courseId: string): Promise<void> {
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true, certificate: { select: { id: true } } },
  });
  if (!enrollment) throw notFound();
  if (enrollment.certificate) throw ruleViolation('CERTIFICATE_ISSUED', 'errors.learning.hasCertificate');
  await db.enrollment.delete({ where: { id: enrollment.id } });
}

const myCourseInclude = {
  course: { include: courseCardInclude },
  _count: { select: { completions: true } },
} satisfies Prisma.EnrollmentInclude;

type EnrollmentWithCourse = Prisma.EnrollmentGetPayload<{ include: typeof myCourseInclude }>;

async function toMyCourses(enrollments: EnrollmentWithCourse[], locale: Locale): Promise<MyCourse[]> {
  const stats = await loadCourseStats(enrollments.map((enrollment) => enrollment.courseId));
  return enrollments.map((enrollment) => {
    const courseStats = stats.get(enrollment.courseId);
    return {
      enrollmentId: enrollment.id,
      course: toCourseCard(enrollment.course, courseStats, locale),
      status: enrollment.status,
      progress: computeProgress(enrollment._count.completions, courseStats?.lessons ?? 0),
      lastLessonId: enrollment.lastLessonId,
      lastActivityAt: enrollment.lastActivityAt.toISOString(),
      completedAt: enrollment.completedAt?.toISOString() ?? null,
    };
  });
}

/** FR-LEARN-3: newest activity first, optionally by status and title. */
export async function listMyCourses(userId: string, query: MyCoursesQuery, locale: Locale): Promise<Page<MyCourse>> {
  const where: Prisma.EnrollmentWhereInput = {
    userId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { course: { title: { contains: query.search, mode: 'insensitive' } } } : {}),
  };
  const [enrollments, total] = await Promise.all([
    db.enrollment.findMany({
      where,
      include: myCourseInclude,
      orderBy: { lastActivityAt: 'desc' },
      ...toSkipTake(query),
    }),
    db.enrollment.count({ where }),
  ]);
  return toPage(await toMyCourses(enrollments, locale), total, query);
}

/** Up to 4 popular published courses from the student's categories (any category for a new student). */
async function recommendations(userId: string, categoryIds: string[], locale: Locale): Promise<CourseCard[]> {
  const categoryFilter = categoryIds.length > 0
    ? Prisma.sql`AND c.category_id IN (${Prisma.join(categoryIds.map((id) => Prisma.sql`${id}::uuid`))})`
    : Prisma.empty;
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT c.id FROM courses c
    JOIN course_stats s ON s.course_id = c.id
    WHERE c.status = 'published'
      AND c.author_id <> ${userId}::uuid
      AND NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = ${userId}::uuid)
      ${categoryFilter}
    ORDER BY s.students DESC, c.published_at DESC
    LIMIT ${RECOMMENDATIONS_LIMIT}`;
  return loadCourseCards(rows.map((row) => row.id), locale);
}

/** FR-LEARN-2: the learning part of the dashboard. */
export async function getDashboard(userId: string, locale: Locale): Promise<Dashboard> {
  const enrollments = await db.enrollment.findMany({
    where: { userId, status: 'active' },
    include: { ...myCourseInclude, lastLesson: { select: { id: true, title: true } } },
    orderBy: { lastActivityAt: 'desc' },
  });
  const active = await toMyCourses(enrollments.slice(0, DASHBOARD_ACTIVE_COURSES), locale);

  const latest = enrollments[0];
  const latestCourse = active[0];
  const resumeLesson = latest ? (latest.lastLesson ?? (await firstLesson(latest.courseId))) : null;

  const categoryIds = [
    ...new Set(enrollments.flatMap((enrollment) => (enrollment.course.categoryId ? [enrollment.course.categoryId] : []))),
  ];
  return {
    continue:
      latest && latestCourse && resumeLesson
        ? {
            courseId: latest.courseId,
            courseTitle: latest.course.title,
            lessonId: resumeLesson.id,
            lessonTitle: resumeLesson.title,
            progress: latestCourse.progress,
          }
        : null,
    active,
    certificates: await listMine(userId),
    notifications: await latestNotifications(userId, DASHBOARD_NOTIFICATIONS),
    recommendations: await recommendations(userId, categoryIds, locale),
  };
}
