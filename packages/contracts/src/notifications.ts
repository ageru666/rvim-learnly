import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common.js';
import { notificationTypeSchema, type NotificationType } from './enums.js';

/** Ids and titles of related objects; the text is rendered from `notifications.<type>` at display time. */
export const notificationPayloadSchema = z.object({
  courseId: idSchema.optional(),
  courseTitle: z.string().optional(),
  courseSlug: z.string().optional(),
  reviewId: idSchema.optional(),
  applicationId: idSchema.optional(),
  certificateCode: z.string().optional(),
  comment: z.string().optional(),
});
export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;

export const notificationSchema = z.object({
  id: idSchema,
  type: notificationTypeSchema,
  payload: notificationPayloadSchema,
  read: z.boolean(),
  createdAt: dateTimeSchema,
  /** Where the notification leads: a site path, `/app/...` for the dashboard or `/admin/...`. */
  link: z.string(),
});
export type NotificationDto = z.infer<typeof notificationSchema>;

export const unreadCountSchema = z.object({ count: z.number().int() });

const LINKS: Record<NotificationType, (payload: NotificationPayload) => string> = {
  course_completed: (p) => (p.certificateCode ? `/certificates/${p.certificateCode}` : `/app/learn/${p.courseId ?? ''}`),
  review_replied: (p) => `/courses/${p.courseSlug ?? ''}#reviews`,
  review_hidden: (p) => `/courses/${p.courseSlug ?? ''}#reviews`,
  application_approved: () => '/app/teach',
  application_rejected: () => '/teach',
  course_approved: (p) => `/courses/${p.courseSlug ?? ''}`,
  course_rejected: (p) => `/app/teach/courses/${p.courseId ?? ''}`,
  course_unpublished: (p) => `/app/teach/courses/${p.courseId ?? ''}`,
  course_new_review: () => '/app/teach/reviews',
  admin_course_submitted: (p) => `/admin/courses/${p.courseId ?? ''}`,
  admin_application_submitted: (p) => `/admin/applications/${p.applicationId ?? ''}`,
};

/** The same link on the server (in the DTO) and in the SPA. */
export function buildNotificationLink(type: NotificationType, payload: NotificationPayload): string {
  return LINKS[type](payload);
}
