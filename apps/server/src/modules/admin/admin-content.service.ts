import type {
  AdminCertificate,
  AdminCertificatesQuery,
  AdminReview,
  AdminReviewsQuery,
} from '@learnly/contracts/admin';
import type { Page } from '@learnly/contracts/common';
import { db } from '../../lib/db.js';
import { notFound, ruleViolation } from '../../lib/errors.js';
import { toPage, toSkipTake } from '../../lib/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../auth/auth.types.js';
import { certificateInclude, toCertificateDto, type CertificateRow } from '../certificates/certificates.service.js';
import { notify } from '../notifications/notifications.service.js';
import { reviewInclude, toReviewDto } from '../reviews/review-dto.js';
import { recordAudit } from './audit.service.js';

const adminReviewInclude = { ...reviewInclude, course: { select: { id: true, title: true, slug: true } } } satisfies Prisma.ReviewInclude;

/** FR-ADMIN-6: newest first, by rating and status. */
export async function listAdminReviews(query: AdminReviewsQuery): Promise<Page<AdminReview>> {
  const where: Prisma.ReviewWhereInput = {
    ...(query.rating ? { rating: query.rating } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const [reviews, total] = await Promise.all([
    db.review.findMany({ where, include: adminReviewInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
    db.review.count({ where }),
  ]);
  return toPage(
    reviews.map((review) => ({ ...toReviewDto(review), course: review.course, hiddenReason: review.hiddenReason })),
    total,
    query,
  );
}

/** Hiding takes the review out of the rating; the reviewer learns why (`review_hidden`). */
export async function setReviewHidden(admin: AuthUser, reviewId: string, hidden: boolean, reason: string | null): Promise<void> {
  const review = await db.review.findUnique({ where: { id: reviewId }, include: { course: { select: { id: true, title: true, slug: true } } } });
  if (!review) throw notFound();
  await db.$transaction(async (tx) => {
    await tx.review.update({ where: { id: reviewId }, data: { status: hidden ? 'hidden' : 'visible', hiddenReason: hidden ? reason : null } });
    if (hidden) {
      await notify(tx, review.userId, 'review_hidden', {
        courseId: review.course.id,
        courseTitle: review.course.title,
        courseSlug: review.course.slug,
        reviewId,
        comment: reason ?? '',
      });
    }
    await recordAudit(tx, admin.id, hidden ? 'review.hide' : 'review.unhide', { type: 'review', id: reviewId }, { reason });
  });
}

function toAdminCertificate(certificate: CertificateRow): AdminCertificate {
  return { ...toCertificateDto(certificate), revokedReason: certificate.revokedReason };
}

/** FR-ADMIN-7: search by code or student name. */
export async function listAdminCertificates(query: AdminCertificatesQuery): Promise<Page<AdminCertificate>> {
  const where: Prisma.CertificateWhereInput = query.search
    ? { OR: [{ code: { contains: query.search.toUpperCase() } }, { studentName: { contains: query.search, mode: 'insensitive' } }] }
    : {};
  const [certificates, total] = await Promise.all([
    db.certificate.findMany({ where, include: certificateInclude, orderBy: { issuedAt: 'desc' }, ...toSkipTake(query) }),
    db.certificate.count({ where }),
  ]);
  return toPage(certificates.map(toAdminCertificate), total, query);
}

export async function revokeCertificate(admin: AuthUser, code: string, reason: string): Promise<AdminCertificate> {
  const certificate = await db.certificate.findUnique({ where: { code } });
  if (!certificate) throw notFound();
  if (certificate.revokedAt) throw ruleViolation('ALREADY_REVOKED', 'errors.admin.certificateRevoked');
  const revoked = await db.$transaction(async (tx) => {
    const saved = await tx.certificate.update({
      where: { code },
      data: { revokedAt: new Date(), revokedReason: reason },
      include: certificateInclude,
    });
    await recordAudit(tx, admin.id, 'certificate.revoke', { type: 'certificate', id: certificate.id }, { code, reason });
    return saved;
  });
  return toAdminCertificate(revoked);
}
