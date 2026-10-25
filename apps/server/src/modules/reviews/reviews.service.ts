import type { ReviewDto } from '@learnly/contracts/catalog';
import type { Page } from '@learnly/contracts/common';
import { REVIEW_MIN_PROGRESS } from '@learnly/contracts/limits';
import { computeProgress } from '@learnly/contracts/progress';
import type {
  CreateReviewInput,
  InstructorReview,
  InstructorReviewsQuery,
  UpdateReviewInput,
} from '@learnly/contracts/reviews';
import type { MessageKey } from '@learnly/i18n/keys';
import { db } from '../../lib/db.js';
import { conflict, forbidden, notFound, ruleViolation } from '../../lib/errors.js';
import { toPage, toSkipTake } from '../../lib/pagination.js';
import type { AuthUser } from '../auth/auth.types.js';
import { notify } from '../notifications/notifications.service.js';
import { reviewInclude, toReviewDto } from './review-dto.js';

/** Why a user may not review a course; the key is shown on the course page and in API errors. */
interface ReviewBlock {
  rule: string;
  reason: MessageKey;
}

export interface ReviewEligibility {
  block: ReviewBlock | null;
  myReview: ReviewDto | null;
}

/** BR-R1 (≥ 30 % or completed), BR-R2 (once, not the author), BR-U4 (verified email). */
export async function reviewEligibility(user: AuthUser, courseId: string): Promise<ReviewEligibility> {
  const [course, enrollment, existing, totalLessons] = await Promise.all([
    db.course.findUniqueOrThrow({ where: { id: courseId }, select: { authorId: true } }),
    db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { status: true, _count: { select: { completions: true } } },
    }),
    db.review.findUnique({ where: { userId_courseId: { userId: user.id, courseId } }, include: reviewInclude }),
    db.lesson.count({ where: { module: { courseId } } }),
  ]);
  const myReview = existing ? toReviewDto(existing) : null;
  const block = (): ReviewBlock | null => {
    if (course.authorId === user.id) return { rule: 'BR-R2', reason: 'errors.reviews.ownCourse' };
    if (!enrollment) return { rule: 'BR-R1', reason: 'errors.reviews.notEnrolled' };
    const progress = computeProgress(enrollment._count.completions, totalLessons);
    if (enrollment.status !== 'completed' && progress < REVIEW_MIN_PROGRESS) {
      return { rule: 'BR-R1', reason: 'errors.reviews.lowProgress' };
    }
    if (!user.emailVerified) return { rule: 'BR-U4', reason: 'errors.auth.emailNotVerified' };
    return null;
  };
  return { block: block(), myReview };
}

export async function createReview(user: AuthUser, courseId: string, input: CreateReviewInput): Promise<ReviewDto> {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { authorId: true, title: true, slug: true } });
  if (!course) throw notFound();
  const { block, myReview } = await reviewEligibility(user, courseId);
  if (block) throw ruleViolation(block.rule, block.reason, { params: { min: REVIEW_MIN_PROGRESS } });
  if (myReview) throw conflict('errors.reviews.alreadyReviewed');

  const review = await db.$transaction(async (tx) => {
    const created = await tx.review.create({ data: { userId: user.id, courseId, ...input }, include: reviewInclude });
    await notify(tx, course.authorId, 'course_new_review', {
      courseId,
      courseTitle: course.title,
      courseSlug: course.slug,
      reviewId: created.id,
    });
    return created;
  });
  return toReviewDto(review);
}

async function ownReview(user: AuthUser, reviewId: string) {
  const review = await db.review.findUnique({ where: { id: reviewId }, select: { userId: true } });
  if (!review) throw notFound();
  if (review.userId !== user.id) throw forbidden();
}

export async function updateReview(user: AuthUser, reviewId: string, input: UpdateReviewInput): Promise<ReviewDto> {
  await ownReview(user, reviewId);
  return toReviewDto(await db.review.update({ where: { id: reviewId }, data: input, include: reviewInclude }));
}

export async function deleteReview(user: AuthUser, reviewId: string): Promise<void> {
  await ownReview(user, reviewId);
  await db.review.delete({ where: { id: reviewId } });
}

/** The course author replies once and may edit the reply; the reviewer is told about the first reply. */
export async function replyToReview(user: AuthUser, reviewId: string, text: string): Promise<ReviewDto> {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { userId: true, authorReply: true, course: { select: { id: true, authorId: true, title: true, slug: true } } },
  });
  if (!review) throw notFound();
  if (review.course.authorId !== user.id) throw forbidden();
  const updated = await db.$transaction(async (tx) => {
    const saved = await tx.review.update({
      where: { id: reviewId },
      data: { authorReply: text, authorRepliedAt: new Date() },
      include: reviewInclude,
    });
    if (review.authorReply === null) {
      await notify(tx, review.userId, 'review_replied', {
        courseId: review.course.id,
        courseTitle: review.course.title,
        courseSlug: review.course.slug,
        reviewId,
      });
    }
    return saved;
  });
  return toReviewDto(updated);
}

/** FR-TEACH: reviews of the author's own courses, newest first, hidden ones included and marked. */
export async function listInstructorReviews(
  user: AuthUser,
  query: InstructorReviewsQuery,
): Promise<Page<InstructorReview>> {
  const where = { course: { authorId: user.id, ...(query.courseId ? { id: query.courseId } : {}) } };
  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      include: { ...reviewInclude, course: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(query),
    }),
    db.review.count({ where }),
  ]);
  return toPage(
    reviews.map((review) => ({ ...toReviewDto(review), course: review.course })),
    total,
    query,
  );
}
