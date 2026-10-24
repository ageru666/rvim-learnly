import { z } from 'zod';

export const LOCALES = ['uk', 'en'] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export const ROLES = ['student', 'instructor', 'admin'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const USER_STATUSES = ['active', 'blocked'] as const;
export const userStatusSchema = z.enum(USER_STATUSES);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const courseLevelSchema = z.enum(COURSE_LEVELS);
export type CourseLevel = z.infer<typeof courseLevelSchema>;

export const COURSE_STATUSES = ['draft', 'pending_review', 'published', 'archived'] as const;
export const courseStatusSchema = z.enum(COURSE_STATUSES);
export type CourseStatus = z.infer<typeof courseStatusSchema>;

export const LESSON_TYPES = ['text', 'video', 'quiz'] as const;
export const lessonTypeSchema = z.enum(LESSON_TYPES);
export type LessonType = z.infer<typeof lessonTypeSchema>;

export const QUESTION_TYPES = ['single', 'multiple'] as const;
export const questionTypeSchema = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const REVEAL_ANSWERS = ['always', 'after_pass_or_exhausted'] as const;
export const revealAnswersSchema = z.enum(REVEAL_ANSWERS);
export type RevealAnswers = z.infer<typeof revealAnswersSchema>;

export const ENROLLMENT_STATUSES = ['active', 'completed'] as const;
export const enrollmentStatusSchema = z.enum(ENROLLMENT_STATUSES);
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>;

export const REVIEW_STATUSES = ['visible', 'hidden'] as const;
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const ACCENTS = [
  'yellow',
  'green',
  'cyan',
  'blue',
  'indigo',
  'red',
  'pink',
  'magenta',
] as const;
export const accentSchema = z.enum(ACCENTS);
export type Accent = z.infer<typeof accentSchema>;

export const ONE_TIME_TOKEN_PURPOSES = ['password_reset', 'email_verify'] as const;
export const oneTimeTokenPurposeSchema = z.enum(ONE_TIME_TOKEN_PURPOSES);
export type OneTimeTokenPurpose = z.infer<typeof oneTimeTokenPurposeSchema>;

export const NOTIFICATION_TYPES = [
  'course_completed',
  'review_replied',
  'review_hidden',
  'application_approved',
  'application_rejected',
  'course_approved',
  'course_rejected',
  'course_unpublished',
  'course_new_review',
  'admin_course_submitted',
  'admin_application_submitted',
] as const;
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const AUDIT_ACTIONS = [
  'course.approve',
  'course.reject',
  'course.unpublish',
  'application.approve',
  'application.reject',
  'user.role',
  'user.block',
  'user.unblock',
  'category.create',
  'category.update',
  'category.delete',
  'review.hide',
  'review.unhide',
  'certificate.revoke',
] as const;
export const auditActionSchema = z.enum(AUDIT_ACTIONS);
export type AuditAction = z.infer<typeof auditActionSchema>;

/** BR-P1 readiness checklist items; the keys are also i18n keys under `readiness.*`. */
export const READINESS_ITEMS = [
  'title',
  'shortDescription',
  'description',
  'category',
  'level',
  'language',
  'cover',
  'outcomes',
  'modules',
  'moduleLessons',
  'lessonCount',
  'quizQuestions',
  'quizCorrectOptions',
  'videoUrls',
] as const;
export const readinessItemSchema = z.enum(READINESS_ITEMS);
export type ReadinessItem = z.infer<typeof readinessItemSchema>;

export const THEMES = ['light', 'dark', 'system'] as const;
export const themeSchema = z.enum(THEMES);
export type Theme = z.infer<typeof themeSchema>;
