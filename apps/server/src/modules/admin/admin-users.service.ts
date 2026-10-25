import type { AdminUserDetail, AdminUserRow, AdminUsersQuery } from '@learnly/contracts/admin';
import type { Page } from '@learnly/contracts/common';
import type { Role } from '@learnly/contracts/enums';
import { computeProgress } from '@learnly/contracts/progress';
import { db } from '../../lib/db.js';
import { notFound, ruleViolation } from '../../lib/errors.js';
import { toPage, toSkipTake } from '../../lib/pagination.js';
import type { Prisma, User } from '../../generated/prisma/client.js';
import type { AuthUser } from '../auth/auth.types.js';
import { loadCourseStats } from '../catalog/course-card.js';
import { recordAudit } from './audit.service.js';

function toRow(user: User): AdminUserRow {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    role: user.role,
    status: user.status,
    locale: user.locale,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export async function listUsers(query: AdminUsersQuery): Promise<Page<AdminUserRow>> {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { email: { contains: query.search, mode: 'insensitive' } }] }
      : {}),
  };
  const [users, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
    db.user.count({ where }),
  ]);
  return toPage(users.map(toRow), total, query);
}

async function findUser(userId: string): Promise<User> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound();
  return user;
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail> {
  const user = await findUser(userId);
  const [enrollments, courses, reviews] = await Promise.all([
    db.enrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: 'desc' },
      include: { course: { select: { title: true } }, _count: { select: { completions: true } } },
    }),
    db.course.findMany({ where: { authorId: userId }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, status: true } }),
    db.review.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { course: { select: { title: true } } } }),
  ]);
  const stats = await loadCourseStats(enrollments.map((enrollment) => enrollment.courseId));
  return {
    ...toRow(user),
    blockedReason: user.blockedReason,
    bio: user.bio,
    enrollments: enrollments.map((enrollment) => ({
      courseId: enrollment.courseId,
      courseTitle: enrollment.course.title,
      status: enrollment.status,
      progress: computeProgress(enrollment._count.completions, stats.get(enrollment.courseId)?.lessons ?? 0),
    })),
    courses,
    reviews: reviews.map((review) => ({ id: review.id, courseTitle: review.course.title, rating: review.rating, hidden: review.status === 'hidden' })),
  };
}

/** BR-U3: the platform always keeps at least one active administrator; nobody acts on themselves. */
async function assertNotLastAdmin(target: User, admin: AuthUser): Promise<void> {
  if (target.id === admin.id) throw ruleViolation('SELF', 'errors.admin.self');
  if (target.role !== 'admin' || target.status !== 'active') return;
  const activeAdmins = await db.user.count({ where: { role: 'admin', status: 'active' } });
  if (activeAdmins <= 1) throw ruleViolation('BR-U3', 'errors.admin.lastAdmin');
}

export async function changeRole(admin: AuthUser, userId: string, role: Role): Promise<AdminUserRow> {
  const target = await findUser(userId);
  if (role !== 'admin') await assertNotLastAdmin(target, admin);
  else if (target.id === admin.id) throw ruleViolation('SELF', 'errors.admin.self');
  const updated = await db.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data: { role } });
    await recordAudit(tx, admin.id, 'user.role', { type: 'user', id: userId }, { from: target.role, to: role });
    return user;
  });
  return toRow(updated);
}

/** A blocked user loses every session at once (BR-E4). */
export async function blockUser(admin: AuthUser, userId: string, reason: string): Promise<AdminUserRow> {
  const target = await findUser(userId);
  await assertNotLastAdmin(target, admin);
  const updated = await db.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data: { status: 'blocked', blockedReason: reason } });
    await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await recordAudit(tx, admin.id, 'user.block', { type: 'user', id: userId }, { reason });
    return user;
  });
  return toRow(updated);
}

export async function unblockUser(admin: AuthUser, userId: string): Promise<AdminUserRow> {
  await findUser(userId);
  const updated = await db.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data: { status: 'active', blockedReason: null } });
    await recordAudit(tx, admin.id, 'user.unblock', { type: 'user', id: userId });
    return user;
  });
  return toRow(updated);
}
