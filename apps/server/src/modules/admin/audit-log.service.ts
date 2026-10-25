import type { AuditEntry, AuditQuery } from '@learnly/contracts/admin';
import type { Page } from '@learnly/contracts/common';
import { auditActionSchema } from '@learnly/contracts/enums';
import { db } from '../../lib/db.js';
import { toPage, toSkipTake } from '../../lib/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const entryInclude = { actor: { select: { id: true, name: true, avatarUrl: true } } } satisfies Prisma.AuditLogEntryInclude;
type EntryRow = Prisma.AuditLogEntryGetPayload<{ include: typeof entryInclude }>;

function toEntry(entry: EntryRow): AuditEntry {
  return {
    id: entry.id,
    actor: entry.actor,
    action: auditActionSchema.parse(entry.action),
    entityType: entry.entityType,
    entityId: entry.entityId,
    meta: typeof entry.meta === 'object' && entry.meta !== null && !Array.isArray(entry.meta) ? entry.meta : {},
    createdAt: entry.createdAt.toISOString(),
  };
}

/** FR-ADMIN-8: filters by administrator, action and date range (inclusive days). */
export async function listAudit(query: AuditQuery): Promise<Page<AuditEntry>> {
  const where: Prisma.AuditLogEntryWhereInput = {
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lt: new Date(new Date(query.to).getTime() + DAY_MS) } : {}),
          },
        }
      : {}),
  };
  const [entries, total] = await Promise.all([
    db.auditLogEntry.findMany({ where, include: entryInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
    db.auditLogEntry.count({ where }),
  ]);
  return toPage(entries.map(toEntry), total, query);
}

export async function recentAudit(limit: number): Promise<AuditEntry[]> {
  const entries = await db.auditLogEntry.findMany({ include: entryInclude, orderBy: { createdAt: 'desc' }, take: limit });
  return entries.map(toEntry);
}

/** Administrators for the audit filter. */
export function listAdmins() {
  return db.user.findMany({ where: { role: 'admin' }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
}
