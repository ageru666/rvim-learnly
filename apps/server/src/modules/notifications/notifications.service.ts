import type { Page, PageQuery } from '@learnly/contracts/common';
import { notificationTypeSchema, type NotificationType } from '@learnly/contracts/enums';
import {
  buildNotificationLink,
  notificationPayloadSchema,
  type NotificationDto,
  type NotificationPayload,
} from '@learnly/contracts/notifications';
import { db, type Tx } from '../../lib/db.js';
import { notFound } from '../../lib/errors.js';
import { toPage, toSkipTake } from '../../lib/pagination.js';
import type { Notification } from '../../generated/prisma/client.js';

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

/** The text is rendered from `notifications.<type>` in the viewer's locale; the link is shared with the SPA. */
function toDto(notification: Notification): NotificationDto {
  const payload = notificationPayloadSchema.catch({}).parse(notification.payload);
  const type = notificationTypeSchema.parse(notification.type);
  return {
    id: notification.id,
    type,
    payload,
    read: notification.readAt !== null,
    createdAt: notification.createdAt.toISOString(),
    link: buildNotificationLink(type, payload),
  };
}

/** Newest first. */
export async function listNotifications(userId: string, query: PageQuery): Promise<Page<NotificationDto>> {
  const [notifications, total] = await Promise.all([
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
    db.notification.count({ where: { userId } }),
  ]);
  return toPage(notifications.map(toDto), total, query);
}

export async function latestNotifications(userId: string, limit: number): Promise<NotificationDto[]> {
  const notifications = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit });
  return notifications.map(toDto);
}

export function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

/** Somebody else's notification is "not found", so ids reveal nothing. */
export async function markRead(userId: string, notificationId: string): Promise<void> {
  const { count } = await db.notification.updateMany({ where: { id: notificationId, userId }, data: { readAt: new Date() } });
  if (count === 0) throw notFound();
}

export async function markAllRead(userId: string): Promise<void> {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
