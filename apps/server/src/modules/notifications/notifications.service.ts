import type { NotificationType } from '@learnly/contracts/enums';
import type { Tx } from '../../lib/db.js';

/** Ids and titles of related objects; the text is rendered from dictionaries when displayed. */
export type NotificationPayload = Readonly<
  Partial<{
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    reviewId: string;
    applicationId: string;
    certificateCode: string;
    comment: string;
  }>
>;

export async function notify(
  tx: Tx,
  userId: string,
  type: NotificationType,
  payload: NotificationPayload = {},
): Promise<void> {
  await tx.notification.create({ data: { userId, type, payload } });
}

export async function notifyAdmins(
  tx: Tx,
  type: NotificationType,
  payload: NotificationPayload = {},
): Promise<void> {
  const admins = await tx.user.findMany({
    where: { role: 'admin', status: 'active' },
    select: { id: true },
  });
  await tx.notification.createMany({
    data: admins.map((admin) => ({ userId: admin.id, type, payload })),
  });
}
