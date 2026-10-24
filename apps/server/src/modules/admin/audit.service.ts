import type { AuditAction } from '@learnly/contracts/enums';
import type { Tx } from '../../lib/db.js';

/** FR-ADMIN-8: every state-changing administrator action is recorded in the same transaction. */
export async function recordAudit(
  tx: Tx,
  actorId: string,
  action: AuditAction,
  entity: { type: string; id: string },
  meta: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  await tx.auditLogEntry.create({
    data: { actorId, action, entityType: entity.type, entityId: entity.id, meta },
  });
}
