import { z } from 'zod';
import { applicationSchema } from './applications.js';
import { courseCardSchema, reviewSchema } from './catalog.js';
import { certificateSchema } from './certificates.js';
import { dateTimeSchema, idSchema, pageQuerySchema } from './common.js';
import {
  accentSchema,
  applicationStatusSchema,
  auditActionSchema,
  courseStatusSchema,
  localeSchema,
  reviewStatusSchema,
  roleSchema,
  userStatusSchema,
} from './enums.js';
import { LIMITS } from './limits.js';
import { userSummarySchema } from './me.js';

/** Every moderation decision and block carries a reason (FR-ADMIN-3, FR-ADMIN-2). */
export const reasonSchema = z.object({ reason: z.string().trim().min(LIMITS.reason.min).max(LIMITS.reason.max) });
export type ReasonInput = z.infer<typeof reasonSchema>;

export const roleChangeSchema = z.object({ role: roleSchema });

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
const optionalFilter = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());

export const adminUsersQuerySchema = pageQuerySchema.extend({
  search: optionalFilter(z.string().trim().max(100)),
  role: optionalFilter(roleSchema),
  status: optionalFilter(userStatusSchema),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export const adminUserRowSchema = userSummarySchema.extend({
  email: z.string(),
  emailVerified: z.boolean(),
  role: roleSchema,
  status: userStatusSchema,
  locale: localeSchema,
  createdAt: dateTimeSchema,
  lastLoginAt: dateTimeSchema.nullable(),
});
export type AdminUserRow = z.infer<typeof adminUserRowSchema>;

export const adminUserDetailSchema = adminUserRowSchema.extend({
  blockedReason: z.string().nullable(),
  bio: z.string().nullable(),
  enrollments: z.array(z.object({ courseId: idSchema, courseTitle: z.string(), status: z.string(), progress: z.number().int() })),
  courses: z.array(z.object({ id: idSchema, title: z.string(), status: courseStatusSchema })),
  reviews: z.array(z.object({ id: idSchema, courseTitle: z.string(), rating: z.number().int(), hidden: z.boolean() })),
});
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;

export const adminCoursesQuerySchema = pageQuerySchema.extend({
  status: optionalFilter(courseStatusSchema),
  search: optionalFilter(z.string().trim().max(100)),
});
export type AdminCoursesQuery = z.infer<typeof adminCoursesQuerySchema>;

export const adminCourseRowSchema = courseCardSchema.extend({
  status: courseStatusSchema,
  submittedAt: dateTimeSchema.nullable(),
});
export type AdminCourseRow = z.infer<typeof adminCourseRowSchema>;

export const adminApplicationsQuerySchema = pageQuerySchema.extend({ status: optionalFilter(applicationStatusSchema) });
export type AdminApplicationsQuery = z.infer<typeof adminApplicationsQuerySchema>;

export const adminApplicationSchema = applicationSchema.extend({
  user: userSummarySchema.extend({ email: z.string(), bio: z.string().nullable(), role: roleSchema }),
});
export type AdminApplication = z.infer<typeof adminApplicationSchema>;

const categoryNameSchema = z.string().trim().min(LIMITS.categoryName.min).max(LIMITS.categoryName.max);

/** FR-ADMIN-5: names in both languages are required. */
export const categoryInputSchema = z.object({
  nameUk: categoryNameSchema,
  nameEn: categoryNameSchema,
  accent: accentSchema,
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const adminCategorySchema = z.object({
  id: idSchema,
  nameUk: z.string(),
  nameEn: z.string(),
  slug: z.string(),
  accent: accentSchema,
  sortOrder: z.number().int(),
  courseCount: z.number().int(),
});
export type AdminCategory = z.infer<typeof adminCategorySchema>;

export const adminReviewsQuerySchema = pageQuerySchema.extend({
  rating: optionalFilter(z.coerce.number().int().min(1).max(5)),
  status: optionalFilter(reviewStatusSchema),
});
export type AdminReviewsQuery = z.infer<typeof adminReviewsQuerySchema>;

export const adminReviewSchema = reviewSchema.extend({
  course: z.object({ id: idSchema, title: z.string(), slug: z.string() }),
  hiddenReason: z.string().nullable(),
});
export type AdminReview = z.infer<typeof adminReviewSchema>;

export const adminCertificatesQuerySchema = pageQuerySchema.extend({ search: optionalFilter(z.string().trim().max(100)) });
export type AdminCertificatesQuery = z.infer<typeof adminCertificatesQuerySchema>;

export const adminCertificateSchema = certificateSchema.extend({ revokedReason: z.string().nullable() });
export type AdminCertificate = z.infer<typeof adminCertificateSchema>;

export const auditQuerySchema = pageQuerySchema.extend({
  actorId: optionalFilter(idSchema),
  action: optionalFilter(auditActionSchema),
  from: optionalFilter(z.iso.date()),
  to: optionalFilter(z.iso.date()),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const auditEntrySchema = z.object({
  id: idSchema,
  actor: userSummarySchema,
  action: auditActionSchema,
  entityType: z.string(),
  entityId: idSchema,
  meta: z.record(z.string(), z.unknown()),
  createdAt: dateTimeSchema,
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const adminStatsSchema = z.object({
  cards: z.object({
    users: z.number().int(),
    users7d: z.number().int(),
    published: z.number().int(),
    pending: z.number().int(),
    applications: z.number().int(),
    enrollments7d: z.number().int(),
  }),
  daily: z.array(z.object({ date: z.iso.date(), registrations: z.number().int(), enrollments: z.number().int() })),
  topCourses: z.array(courseCardSchema),
  recentAudit: z.array(auditEntrySchema),
});
export type AdminStats = z.infer<typeof adminStatsSchema>;
