import type { EnrollmentStatus } from '@learnly/contracts/enums';
import type { LearnCourse, LessonContent, ProgressResult } from '@learnly/contracts/learning';
import { db, type Tx } from '../../lib/db.js';
import { issueForEnrollment } from '../certificates/certificates.service.js';
import { notify } from '../notifications/notifications.service.js';
import { forbidden, notFound, ruleViolation } from '../../lib/errors.js';
import type { AuthUser } from '../auth/auth.types.js';
import { computeProgress } from '@learnly/contracts/progress';

/** Who is looking at the course: an enrolled student, or its author / an administrator in preview. */
type LearnerContext =
  | { mode: 'student'; enrollment: { id: string; status: EnrollmentStatus; lastLessonId: string | null } }
  | { mode: 'preview'; enrollment: null };

/**
 * BR-E3: full content for enrolled users, the author and administrators. Everyone else sees only
 * the preview lessons on the public course page.
 */
export async function learnerContext(user: AuthUser, courseId: string): Promise<LearnerContext> {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { authorId: true } });
  if (!course) throw notFound();
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true, status: true, lastLessonId: true },
  });
  if (enrollment) return { mode: 'student', enrollment };
  if (course.authorId === user.id || user.role === 'admin') return { mode: 'preview', enrollment: null };
  throw forbidden('errors.learning.notEnrolled');
}

function loadCurriculum(courseId: string) {
  return db.module.findMany({
    where: { courseId },
    orderBy: { position: 'asc' },
    include: { lessons: { orderBy: { position: 'asc' }, include: { quiz: { select: { id: true } } } } },
  });
}

async function completedLessonIds(enrollmentId: string | undefined): Promise<string[]> {
  if (!enrollmentId) return [];
  const completions = await db.lessonCompletion.findMany({ where: { enrollmentId }, select: { lessonId: true } });
  return completions.map((completion) => completion.lessonId);
}

export async function getLearnCourse(user: AuthUser, courseId: string): Promise<LearnCourse> {
  const context = await learnerContext(user, courseId);
  const [course, modules, completed] = await Promise.all([
    db.course.findUniqueOrThrow({ where: { id: courseId }, select: { id: true, slug: true, title: true, language: true } }),
    loadCurriculum(courseId),
    completedLessonIds(context.enrollment?.id),
  ]);
  const done = new Set(completed);
  const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  return {
    course,
    mode: context.mode,
    progress: computeProgress(done.size, totalLessons),
    status: context.enrollment?.status ?? null,
    lastLessonId: context.enrollment?.lastLessonId ?? null,
    modules: modules.map((module) => ({
      id: module.id,
      title: module.title,
      lessons: module.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        durationMinutes: lesson.durationMinutes,
        completed: done.has(lesson.id),
        quizId: lesson.quiz?.id ?? null,
      })),
    })),
  };
}

async function findLesson(lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } }, quiz: { select: { id: true } } },
  });
  if (!lesson) throw notFound();
  return lesson;
}

/** Opens a lesson; for a student it becomes the last opened lesson (FR-LEARN-4). */
export async function openLesson(user: AuthUser, lessonId: string): Promise<LessonContent> {
  const lesson = await findLesson(lessonId);
  const courseId = lesson.module.courseId;
  const context = await learnerContext(user, courseId);
  const [modules, completed] = await Promise.all([loadCurriculum(courseId), completedLessonIds(context.enrollment?.id)]);
  if (context.enrollment) {
    await db.enrollment.update({
      where: { id: context.enrollment.id },
      data: { lastLessonId: lesson.id, lastActivityAt: new Date() },
    });
  }
  const order = modules.flatMap((module) => module.lessons.map((item) => item.id));
  const index = order.indexOf(lesson.id);
  return {
    id: lesson.id,
    courseId,
    title: lesson.title,
    type: lesson.type,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    durationMinutes: lesson.durationMinutes,
    quizId: lesson.quiz?.id ?? null,
    prevLessonId: order[index - 1] ?? null,
    nextLessonId: order[index + 1] ?? null,
    completed: completed.includes(lesson.id),
  };
}

/** Progress of one enrollment after a change (BR-L3), with the completion state (BR-C1). */
export async function progressOf(enrollmentId: string, courseId: string): Promise<ProgressResult> {
  const [completed, totalLessons, enrollment] = await Promise.all([
    completedLessonIds(enrollmentId),
    db.lesson.count({ where: { module: { courseId } } }),
    db.enrollment.findUniqueOrThrow({
      where: { id: enrollmentId },
      select: { status: true, certificate: { select: { code: true } } },
    }),
  ]);
  return {
    progress: computeProgress(completed.length, totalLessons),
    completedLessonIds: completed,
    courseCompleted: enrollment.status === 'completed',
    certificateCode: enrollment.certificate?.code ?? null,
  };
}

/** Serializes completion checks of one enrollment (concurrent requests wait for each other). */
export async function lockEnrollment(tx: Tx, enrollmentId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM enrollments WHERE id = ${enrollmentId}::uuid FOR UPDATE`;
}

/**
 * BR-C1: when every lesson is completed, the enrollment becomes `completed`, the certificate is issued
 * and the student is notified, exactly once. BR-C2: a completed enrollment stays completed when
 * lessons are added later. The caller holds the enrollment lock (`lockEnrollment`).
 */
export async function checkCompletion(tx: Tx, enrollmentId: string): Promise<void> {
  const enrollment = await tx.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    select: { userId: true, status: true, courseId: true, course: { select: { title: true, slug: true } } },
  });
  if (enrollment.status === 'completed') return;
  const [totalLessons, completed] = await Promise.all([
    tx.lesson.count({ where: { module: { courseId: enrollment.courseId } } }),
    tx.lessonCompletion.count({ where: { enrollmentId } }),
  ]);
  if (totalLessons === 0 || completed < totalLessons) return;

  await tx.enrollment.update({ where: { id: enrollmentId }, data: { status: 'completed', completedAt: new Date() } });
  const certificateCode = await issueForEnrollment(tx, enrollmentId);
  await notify(tx, enrollment.userId, 'course_completed', {
    courseId: enrollment.courseId,
    courseTitle: enrollment.course.title,
    courseSlug: enrollment.course.slug,
    certificateCode,
  });
}

/** Text and video lessons are marked by hand (BR-L1); quiz lessons only by passing the quiz (BR-L2). */
async function manualCompletionTarget(user: AuthUser, lessonId: string) {
  const lesson = await findLesson(lessonId);
  const courseId = lesson.module.courseId;
  const context = await learnerContext(user, courseId);
  if (!context.enrollment) throw ruleViolation('FR-LEARN-8', 'errors.learning.previewMode');
  if (lesson.type === 'quiz') throw ruleViolation('BR-L2', 'errors.learning.quizCompletion');
  return { lessonId: lesson.id, courseId, enrollmentId: context.enrollment.id };
}

export async function completeLesson(user: AuthUser, lessonId: string): Promise<ProgressResult> {
  const target = await manualCompletionTarget(user, lessonId);
  await db.$transaction(async (tx) => {
    await lockEnrollment(tx, target.enrollmentId);
    await tx.lessonCompletion.createMany({
      data: { enrollmentId: target.enrollmentId, lessonId: target.lessonId },
      skipDuplicates: true,
    });
    await tx.enrollment.update({ where: { id: target.enrollmentId }, data: { lastActivityAt: new Date() } });
    await checkCompletion(tx, target.enrollmentId);
  });
  return progressOf(target.enrollmentId, target.courseId);
}

export async function uncompleteLesson(user: AuthUser, lessonId: string): Promise<ProgressResult> {
  const target = await manualCompletionTarget(user, lessonId);
  await db.lessonCompletion.deleteMany({ where: { enrollmentId: target.enrollmentId, lessonId: target.lessonId } });
  return progressOf(target.enrollmentId, target.courseId);
}
