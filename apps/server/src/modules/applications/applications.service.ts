import type { ApplicationDto, ApplyInput, MyApplication } from '@learnly/contracts/applications';
import { APPLICATION_RETRY_DAYS } from '@learnly/contracts/limits';
import { db } from '../../lib/db.js';
import { ruleViolation } from '../../lib/errors.js';
import type { AuthUser } from '../auth/auth.types.js';
import { notifyAdmins } from '../notifications/notifications.service.js';
import type { InstructorApplication } from '../../generated/prisma/client.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDto(application: InstructorApplication): ApplicationDto {
  return {
    id: application.id,
    motivation: application.motivation,
    experience: application.experience,
    status: application.status,
    reviewComment: application.reviewComment,
    createdAt: application.createdAt.toISOString(),
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
  };
}

function latestApplication(userId: string) {
  return db.instructorApplication.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

/** BR-U1: one pending application; after a rejection, a new one only after 7 days. */
function nextAllowedAt(latest: InstructorApplication | null): Date | null {
  if (latest?.status !== 'rejected' || !latest.reviewedAt) return null;
  const allowed = new Date(latest.reviewedAt.getTime() + APPLICATION_RETRY_DAYS * DAY_MS);
  return allowed.getTime() > Date.now() ? allowed : null;
}

export async function getMyApplication(user: AuthUser): Promise<MyApplication> {
  const latest = await latestApplication(user.id);
  const retryAt = nextAllowedAt(latest);
  return {
    application: latest ? toDto(latest) : null,
    canApplyAt: retryAt?.toISOString() ?? null,
    canApply: user.role === 'student' && latest?.status !== 'pending' && retryAt === null,
  };
}

export async function applyForInstructor(user: AuthUser, input: ApplyInput): Promise<ApplicationDto> {
  if (user.role !== 'student') throw ruleViolation('ROLE', 'errors.applications.alreadyInstructor');
  if (!user.emailVerified) throw ruleViolation('BR-U4', 'errors.auth.emailNotVerified');
  const latest = await latestApplication(user.id);
  if (latest?.status === 'pending') throw ruleViolation('BR-U1', 'errors.applications.pending');
  if (nextAllowedAt(latest)) throw ruleViolation('BR-U1', 'errors.applications.tooSoon', { params: { days: APPLICATION_RETRY_DAYS } });

  const application = await db.$transaction(async (tx) => {
    const created = await tx.instructorApplication.create({
      data: { userId: user.id, motivation: input.motivation, experience: input.experience ?? null },
    });
    await notifyAdmins(tx, 'admin_application_submitted', { applicationId: created.id });
    return created;
  });
  return toDto(application);
}
