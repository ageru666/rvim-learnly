import type { AdminApplication, AdminApplicationsQuery } from '@learnly/contracts/admin';
import type { Page } from '@learnly/contracts/common';
import { db } from '../../lib/db.js';
import { notFound, ruleViolation } from '../../lib/errors.js';
import { deliverEmail } from '../../lib/mailer.js';
import { toPage, toSkipTake } from '../../lib/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../auth/auth.types.js';
import { notify } from '../notifications/notifications.service.js';
import { recordAudit } from './audit.service.js';

const applicationInclude = {
  user: { select: { id: true, name: true, avatarUrl: true, email: true, bio: true, role: true } },
} satisfies Prisma.InstructorApplicationInclude;

type ApplicationRow = Prisma.InstructorApplicationGetPayload<{ include: typeof applicationInclude }>;

function toDto(application: ApplicationRow): AdminApplication {
  return {
    id: application.id,
    motivation: application.motivation,
    experience: application.experience,
    status: application.status,
    reviewComment: application.reviewComment,
    createdAt: application.createdAt.toISOString(),
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    user: application.user,
  };
}

export async function listApplications(query: AdminApplicationsQuery): Promise<Page<AdminApplication>> {
  const where = query.status ? { status: query.status } : {};
  const [applications, total] = await Promise.all([
    db.instructorApplication.findMany({ where, include: applicationInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
    db.instructorApplication.count({ where }),
  ]);
  return toPage(applications.map(toDto), total, query);
}

export async function getApplication(applicationId: string): Promise<AdminApplication> {
  const application = await db.instructorApplication.findUnique({ where: { id: applicationId }, include: applicationInclude });
  if (!application) throw notFound();
  return toDto(application);
}

/** FR-ADMIN-4: approval makes the user an instructor; a rejection needs a comment. */
export async function decideApplication(
  admin: AuthUser,
  applicationId: string,
  approve: boolean,
  comment: string | null,
): Promise<AdminApplication> {
  const application = await db.instructorApplication.findUnique({ where: { id: applicationId }, select: { status: true, userId: true } });
  if (!application) throw notFound();
  if (application.status !== 'pending') throw ruleViolation('STATUS', 'errors.admin.applicationDecided');

  const saved = await db.$transaction(async (tx) => {
    const updated = await tx.instructorApplication.update({
      where: { id: applicationId },
      data: { status: approve ? 'approved' : 'rejected', reviewComment: comment, reviewedAt: new Date(), reviewedById: admin.id },
      include: applicationInclude,
    });
    if (approve) await tx.user.update({ where: { id: application.userId }, data: { role: 'instructor' } });
    await notify(tx, application.userId, approve ? 'application_approved' : 'application_rejected', {
      applicationId,
      ...(comment ? { comment } : {}),
    });
    await recordAudit(tx, admin.id, approve ? 'application.approve' : 'application.reject', { type: 'application', id: applicationId }, { comment });
    return updated;
  });

  const recipient = await db.user.findUniqueOrThrow({ where: { id: application.userId }, select: { email: true, name: true, locale: true } });
  await deliverEmail({
    to: recipient.email,
    locale: recipient.locale,
    template: approve ? 'application-approved' : 'application-rejected',
    subjectKey: approve ? 'emails.applicationApproved.subject' : 'emails.applicationRejected.subject',
    data: { name: recipient.name, reason: comment, link: approve ? '/app/teach' : '/teach' },
  });
  return toDto(saved);
}
