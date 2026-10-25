import type { CourseStatus, ReadinessItem } from '@learnly/contracts/enums';
import { COURSE_STATUSES } from '@learnly/contracts/enums';
import type {
  CourseEditor,
  CreateCourseInput,
  InstructorCourseRow,
  InstructorOverview,
  Readiness,
  UpdateCourseInput,
} from '@learnly/contracts/instructor';
import { MIN_COURSE_LESSONS, MIN_COURSE_OUTCOMES } from '@learnly/contracts/limits';
import { slugify } from '@learnly/contracts/slugify';
import { parseVideoUrl } from '@learnly/contracts/video';
import { db, type Tx } from '../../lib/db.js';
import { conflict, forbidden, notFound, ruleViolation } from '../../lib/errors.js';
import { deleteUpload, saveCover } from '../../lib/images.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../auth/auth.types.js';
import { loadCourseStats } from '../catalog/course-card.js';
import { notifyAdmins } from '../notifications/notifications.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_ENROLLMENTS_DAYS = 30;
const FALLBACK_SLUG = 'course';

const editorInclude = {
  tags: { include: { tag: true }, orderBy: { tag: { name: 'asc' } } },
  modules: {
    orderBy: { position: 'asc' },
    include: {
      lessons: {
        orderBy: { position: 'asc' },
        include: { quiz: { include: { questions: { include: { options: true } } } } },
      },
    },
  },
} satisfies Prisma.CourseInclude;

type EditorCourse = Prisma.CourseGetPayload<{ include: typeof editorInclude }>;

/** BR-P2, BR-P4: only drafts and published courses can be changed; BR-U2 is enforced by the role guard. */
function canEdit(status: CourseStatus): boolean {
  return status === 'draft' || status === 'published';
}

function toEditor(course: EditorCourse): CourseEditor {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription,
    description: course.description,
    coverUrl: course.coverUrl,
    level: course.level,
    language: course.language,
    categoryId: course.categoryId,
    tags: course.tags.map(({ tag }) => tag.name),
    outcomes: course.outcomes,
    requirements: course.requirements,
    status: course.status,
    moderationComment: course.moderationComment,
    editable: canEdit(course.status),
    updatedAt: course.updatedAt.toISOString(),
    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      position: module.position,
      lessons: module.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        durationMinutes: lesson.durationMinutes,
        isPreview: lesson.isPreview,
        position: lesson.position,
      })),
    })),
  };
}

/** Loads a course of the signed-in author; somebody else's course is forbidden. */
export async function ownCourse(user: AuthUser, courseId: string): Promise<EditorCourse> {
  const course = await db.course.findUnique({ where: { id: courseId }, include: editorInclude });
  if (!course) throw notFound();
  if (course.authorId !== user.id) throw forbidden();
  return course;
}

/** Throws when the course status does not allow changes (BR-P2 in review, BR-P4 archived). */
export function assertEditable(status: CourseStatus): void {
  if (status === 'pending_review') throw ruleViolation('BR-P2', 'errors.courses.inReview');
  if (status === 'archived') throw ruleViolation('BR-P4', 'errors.courses.archived');
}

export async function assertCourseEditable(user: AuthUser, courseId: string): Promise<void> {
  assertEditable((await ownCourse(user, courseId)).status);
}

async function slugTaken(slug: string, exceptCourseId?: string): Promise<boolean> {
  const [course, history] = await Promise.all([
    db.course.findFirst({ where: { slug, ...(exceptCourseId ? { id: { not: exceptCourseId } } : {}) }, select: { id: true } }),
    db.courseSlugHistory.findUnique({ where: { oldSlug: slug }, select: { courseId: true } }),
  ]);
  return course !== null || (history !== null && history.courseId !== exceptCourseId);
}

/** A slug from the title (KMU 2010 transliteration), with `-2`, `-3`, ... when taken. */
async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || FALLBACK_SLUG;
  let candidate = base;
  for (let suffix = 2; await slugTaken(candidate); suffix += 1) candidate = `${base}-${suffix}`;
  return candidate;
}

export async function getEditor(user: AuthUser, courseId: string): Promise<CourseEditor> {
  return toEditor(await ownCourse(user, courseId));
}

async function reloadEditor(courseId: string): Promise<CourseEditor> {
  return toEditor(await db.course.findUniqueOrThrow({ where: { id: courseId }, include: editorInclude }));
}

export async function createCourse(user: AuthUser, input: CreateCourseInput): Promise<CourseEditor> {
  const course = await db.course.create({
    data: { ...input, authorId: user.id, slug: await uniqueSlug(input.title) },
    select: { id: true },
  });
  return reloadEditor(course.id);
}

async function replaceTags(tx: Tx, courseId: string, names: readonly string[]): Promise<void> {
  await tx.courseTag.deleteMany({ where: { courseId } });
  for (const name of new Set(names)) {
    const tag = await tx.tag.upsert({ where: { name }, create: { name }, update: {}, select: { id: true } });
    await tx.courseTag.create({ data: { courseId, tagId: tag.id } });
  }
}

export async function updateCourse(user: AuthUser, courseId: string, input: UpdateCourseInput): Promise<CourseEditor> {
  const course = await ownCourse(user, courseId);
  assertEditable(course.status);
  const { tags, slug, ...fields } = input;
  const slugChanged = slug !== undefined && slug !== course.slug;
  if (slugChanged && (await slugTaken(slug, course.id))) throw conflict('errors.courses.slugTaken');

  await db.$transaction(async (tx) => {
    if (slugChanged) {
      await tx.courseSlugHistory.deleteMany({ where: { oldSlug: slug, courseId } });
      // BR-P6: links to a course that students may have seen keep working.
      if (course.wasPublished) await tx.courseSlugHistory.create({ data: { oldSlug: course.slug, courseId } });
    }
    await tx.course.update({ where: { id: courseId }, data: { ...fields, ...(slugChanged ? { slug } : {}) } });
    if (tags) await replaceTags(tx, courseId, tags);
  });
  return reloadEditor(courseId);
}

export async function uploadCover(user: AuthUser, courseId: string, file: Buffer): Promise<CourseEditor> {
  const course = await ownCourse(user, courseId);
  assertEditable(course.status);
  const coverUrl = await saveCover(file);
  await db.course.update({ where: { id: courseId }, data: { coverUrl } });
  await deleteUpload(course.coverUrl);
  return reloadEditor(courseId);
}

/** BR-P1: every item must be met before the course can be submitted. */
function readinessOf(course: EditorCourse): Readiness {
  const lessons = course.modules.flatMap((module) => module.lessons);
  const quizzes = lessons.flatMap((lesson) => (lesson.type === 'quiz' && lesson.quiz ? [lesson.quiz] : []));
  const questions = quizzes.flatMap((quiz) => quiz.questions);
  const checks: Record<ReadinessItem, boolean> = {
    title: course.title.trim().length > 0,
    shortDescription: Boolean(course.shortDescription?.trim()),
    description: Boolean(course.description?.trim()),
    category: course.categoryId !== null,
    level: true,
    language: true,
    cover: course.coverUrl !== null,
    outcomes: course.outcomes.length >= MIN_COURSE_OUTCOMES,
    modules: course.modules.length > 0,
    moduleLessons: course.modules.length > 0 && course.modules.every((module) => module.lessons.length > 0),
    lessonCount: lessons.length >= MIN_COURSE_LESSONS,
    quizQuestions: lessons.every((lesson) => lesson.type !== 'quiz' || (lesson.quiz?.questions.length ?? 0) > 0),
    quizCorrectOptions: questions.every((question) => question.options.some((option) => option.isCorrect)),
    videoUrls: lessons.every((lesson) => lesson.type !== 'video' || (lesson.videoUrl !== null && parseVideoUrl(lesson.videoUrl) !== null)),
  };
  const items = Object.entries(checks).map(([key, ok]) => ({ key: key as ReadinessItem, ok }));
  return { ready: items.every((item) => item.ok), items };
}

export async function getReadiness(user: AuthUser, courseId: string): Promise<Readiness> {
  return readinessOf(await ownCourse(user, courseId));
}

function wrongStatus(): never {
  throw ruleViolation('STATUS', 'errors.courses.wrongStatus');
}

export async function submitCourse(user: AuthUser, courseId: string): Promise<CourseEditor> {
  const course = await ownCourse(user, courseId);
  if (course.status !== 'draft') wrongStatus();
  if (!user.emailVerified) throw ruleViolation('BR-U4', 'errors.auth.emailNotVerified');
  const readiness = readinessOf(course);
  if (!readiness.ready) {
    throw ruleViolation('BR-P1', 'errors.courses.notReady', {
      unmet: readiness.items.filter((item) => !item.ok).map((item) => item.key),
    });
  }
  await db.$transaction(async (tx) => {
    await tx.course.update({ where: { id: courseId }, data: { status: 'pending_review', submittedAt: new Date() } });
    await notifyAdmins(tx, 'admin_course_submitted', { courseId, courseTitle: course.title });
  });
  return reloadEditor(courseId);
}

async function transition(user: AuthUser, courseId: string, from: CourseStatus, to: CourseStatus, extra: Prisma.CourseUpdateInput = {}) {
  const course = await ownCourse(user, courseId);
  if (course.status !== from) wrongStatus();
  await db.course.update({ where: { id: courseId }, data: { status: to, ...extra } });
  return { course, editor: await reloadEditor(courseId) };
}

/** BR-P2: back from review to the draft. */
export async function withdrawCourse(user: AuthUser, courseId: string): Promise<CourseEditor> {
  return (await transition(user, courseId, 'pending_review', 'draft')).editor;
}

/** BR-P4: hidden from the catalog, enrolled students keep their access. */
export async function archiveCourse(user: AuthUser, courseId: string): Promise<CourseEditor> {
  return (await transition(user, courseId, 'published', 'archived')).editor;
}

/** BR-P4: a course that was published before archiving returns without moderation. */
export async function restoreCourse(user: AuthUser, courseId: string): Promise<CourseEditor> {
  const course = await ownCourse(user, courseId);
  if (course.status !== 'archived' || !course.wasPublished) wrongStatus();
  return (await transition(user, courseId, 'archived', 'published', { publishedAt: new Date() })).editor;
}

/** BR-P5: only a draft that never had students; otherwise the course is archived instead. */
export async function deleteCourse(user: AuthUser, courseId: string): Promise<void> {
  const course = await ownCourse(user, courseId);
  const enrollments = await db.enrollment.count({ where: { courseId } });
  if (course.status !== 'draft' || course.wasPublished || enrollments > 0) {
    throw ruleViolation('BR-P5', 'errors.courses.notDeletable');
  }
  await db.course.delete({ where: { id: courseId } });
  await deleteUpload(course.coverUrl);
}

export async function listMyCourses(user: AuthUser, status: CourseStatus | undefined): Promise<InstructorCourseRow[]> {
  const courses = await db.course.findMany({
    where: { authorId: user.id, ...(status ? { status } : {}) },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, slug: true, title: true, status: true, coverUrl: true, updatedAt: true },
  });
  const stats = await loadCourseStats(courses.map((course) => course.id));
  return courses.map((course) => {
    const courseStats = stats.get(course.id);
    return {
      ...course,
      lessonCount: courseStats?.lessons ?? 0,
      studentCount: courseStats?.students ?? 0,
      ratingAvg: courseStats?.ratingAvg ?? null,
      updatedAt: course.updatedAt.toISOString(),
    };
  });
}

/** FR-TEACH-1: courses by status, students, average rating and recent enrollments. */
export async function getOverview(user: AuthUser): Promise<InstructorOverview> {
  const own = { course: { authorId: user.id } };
  const [groups, students, rating, recent] = await Promise.all([
    db.course.groupBy({ by: ['status'], where: { authorId: user.id }, _count: { _all: true } }),
    db.enrollment.count({ where: own }),
    db.review.aggregate({ where: { ...own, status: 'visible' }, _avg: { rating: true } }),
    db.enrollment.count({ where: { ...own, enrolledAt: { gte: new Date(Date.now() - RECENT_ENROLLMENTS_DAYS * DAY_MS) } } }),
  ]);
  const byStatus = Object.fromEntries(COURSE_STATUSES.map((status) => [status, 0])) as Record<CourseStatus, number>;
  for (const group of groups) byStatus[group.status] = group._count._all;
  const avg = rating._avg.rating;
  return { byStatus, students, ratingAvg: avg === null ? null : Math.round(avg * 10) / 10, enrollments30d: recent };
}
