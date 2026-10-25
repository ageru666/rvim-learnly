import type { AdminCourseRow, AdminCoursesQuery } from '@learnly/contracts/admin';
import type { Page } from '@learnly/contracts/common';
import type { CourseStatus, Locale } from '@learnly/contracts/enums';
import type { MessageKey } from '@learnly/i18n/keys';
import { db, type Tx } from '../../lib/db.js';
import { notFound, ruleViolation } from '../../lib/errors.js';
import { deliverEmail } from '../../lib/mailer.js';
import { toPage, toSkipTake } from '../../lib/pagination.js';
import type { NotificationType } from '@learnly/contracts/enums';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../auth/auth.types.js';
import { courseCardInclude, loadCourseStats, toCourseCard } from '../catalog/course-card.js';
import { notify } from '../notifications/notifications.service.js';
import { quizEditorInclude } from '../quizzes/quiz-editor.js';
import { recordAudit } from './audit.service.js';

export async function listAdminCourses(query: AdminCoursesQuery, locale: Locale): Promise<Page<AdminCourseRow>> {
  const where: Prisma.CourseWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
  };
  const [courses, total] = await Promise.all([
    db.course.findMany({ where, include: courseCardInclude, orderBy: { updatedAt: 'desc' }, ...toSkipTake(query) }),
    db.course.count({ where }),
  ]);
  const stats = await loadCourseStats(courses.map((course) => course.id));
  return toPage(
    courses.map((course) => ({
      ...toCourseCard(course, stats.get(course.id), locale),
      status: course.status,
      submittedAt: course.submittedAt?.toISOString() ?? null,
    })),
    total,
    query,
  );
}

/** FR-ADMIN-3: the queue, oldest submission first. */
export function moderationQueue(locale: Locale) {
  return db.course
    .findMany({ where: { status: 'pending_review' }, include: courseCardInclude, orderBy: { submittedAt: 'asc' } })
    .then((courses) =>
      courses.map((course) => ({ ...toCourseCard(course, undefined, locale), status: course.status, submittedAt: course.submittedAt?.toISOString() ?? null })),
    );
}

/** The full course for moderation: every lesson with its content and every quiz with answers. */
export async function getModerationCourse(courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      ...courseCardInclude,
      modules: {
        orderBy: { position: 'asc' },
        include: { lessons: { orderBy: { position: 'asc' }, include: { quiz: { include: quizEditorInclude } } } },
      },
    },
  });
  if (!course) throw notFound();
  return course;
}

interface Decision {
  from: CourseStatus;
  to: CourseStatus;
  notification: NotificationType;
  email: { template: string; subjectKey: MessageKey; link: (courseId: string, slug: string) => string };
  audit: 'course.approve' | 'course.reject' | 'course.unpublish';
}

const DECISIONS = {
  approve: {
    from: 'pending_review',
    to: 'published',
    notification: 'course_approved',
    email: { template: 'course-approved', subjectKey: 'emails.courseApproved.subject', link: (_id, slug) => `/courses/${slug}` },
    audit: 'course.approve',
  },
  reject: {
    from: 'pending_review',
    to: 'draft',
    notification: 'course_rejected',
    email: { template: 'course-rejected', subjectKey: 'emails.courseRejected.subject', link: (id) => `/app/teach/courses/${id}` },
    audit: 'course.reject',
  },
  unpublish: {
    from: 'published',
    to: 'draft',
    notification: 'course_unpublished',
    email: { template: 'course-unpublished', subjectKey: 'emails.courseUnpublished.subject', link: (id) => `/app/teach/courses/${id}` },
    audit: 'course.unpublish',
  },
} as const satisfies Record<string, Decision>;

export type ModerationAction = keyof typeof DECISIONS;

async function applyDecision(tx: Tx, decision: Decision, courseId: string, reason: string | null) {
  const now = new Date();
  const data: Prisma.CourseUpdateInput =
    decision.to === 'published'
      ? { status: 'published', publishedAt: now, wasPublished: true, moderationComment: null }
      : { status: decision.to, moderationComment: reason };
  return tx.course.update({ where: { id: courseId }, data, include: { author: true } });
}

/**
 * FR-ADMIN-3: approve publishes the course; reject (reason required) returns it to the draft;
 * unpublish (reason required) hides a published course. The author gets a notification and an
 * email in their own locale; enrolled students keep their access (BR-P3).
 */
export async function moderateCourse(admin: AuthUser, courseId: string, action: ModerationAction, reason: string | null): Promise<CourseStatus> {
  const decision: Decision = DECISIONS[action];
  const course = await db.course.findUnique({ where: { id: courseId }, select: { status: true } });
  if (!course) throw notFound();
  if (course.status !== decision.from) throw ruleViolation('STATUS', 'errors.courses.wrongStatus');

  const updated = await db.$transaction(async (tx) => {
    const saved = await applyDecision(tx, decision, courseId, reason);
    await notify(tx, saved.authorId, decision.notification, {
      courseId,
      courseTitle: saved.title,
      courseSlug: saved.slug,
      ...(reason ? { comment: reason } : {}),
    });
    await recordAudit(tx, admin.id, decision.audit, { type: 'course', id: courseId }, { title: saved.title, reason });
    return saved;
  });
  await deliverEmail({
    to: updated.author.email,
    locale: updated.author.locale,
    template: decision.email.template,
    subjectKey: decision.email.subjectKey,
    data: { name: updated.author.name, courseTitle: updated.title, reason, link: decision.email.link(courseId, updated.slug) },
  });
  return updated.status;
}
