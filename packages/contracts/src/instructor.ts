import { z } from 'zod';
import { dateTimeSchema, idSchema, pageQuerySchema } from './common.js';
import {
  courseLevelSchema,
  courseStatusSchema,
  enrollmentStatusSchema,
  lessonTypeSchema,
  localeSchema,
  readinessItemSchema,
} from './enums.js';
import { LIMITS } from './limits.js';
import { quizEditorSchema } from './quizzes.js';
import { VALIDATION_MESSAGES } from './validation.js';
import { parseVideoUrl } from './video.js';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const courseTitleSchema = z.string().trim().min(LIMITS.courseTitle.min).max(LIMITS.courseTitle.max);
const listItemsSchema = z
  .array(z.string().trim().min(1).max(LIMITS.courseListItem.max))
  .max(LIMITS.courseListItems.max);

export const createCourseSchema = z.object({
  title: courseTitleSchema,
  categoryId: idSchema,
  level: courseLevelSchema,
  language: localeSchema,
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z
  .object({
    title: courseTitleSchema,
    slug: z.string().trim().max(LIMITS.slug.max).regex(SLUG_PATTERN, { error: VALIDATION_MESSAGES.slugFormat }),
    shortDescription: z.string().trim().max(LIMITS.courseShortDescription.max),
    description: z.string().max(LIMITS.courseDescription.max),
    categoryId: idSchema,
    level: courseLevelSchema,
    language: localeSchema,
    tags: z
      .array(z.string().trim().toLowerCase().min(LIMITS.tag.min).max(LIMITS.tag.max))
      .max(LIMITS.tagsPerCourse.max),
    outcomes: listItemsSchema,
    requirements: listItemsSchema,
  })
  .partial();
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const moduleLessonSchema = z.object({
  id: idSchema,
  title: z.string(),
  type: lessonTypeSchema,
  durationMinutes: z.number().int(),
  isPreview: z.boolean(),
  position: z.number().int(),
});

export const moduleDtoSchema = z.object({
  id: idSchema,
  title: z.string(),
  position: z.number().int(),
  lessons: z.array(moduleLessonSchema),
});
export type ModuleDto = z.infer<typeof moduleDtoSchema>;

export const courseEditorSchema = z.object({
  id: idSchema,
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string().nullable(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  level: courseLevelSchema,
  language: localeSchema,
  categoryId: idSchema.nullable(),
  tags: z.array(z.string()),
  outcomes: z.array(z.string()),
  requirements: z.array(z.string()),
  status: courseStatusSchema,
  moderationComment: z.string().nullable(),
  /** BR-P2, BR-U2: false in review, archived, or when the author lost the instructor role. */
  editable: z.boolean(),
  updatedAt: dateTimeSchema,
  modules: z.array(moduleDtoSchema),
});
export type CourseEditor = z.infer<typeof courseEditorSchema>;

export const instructorCourseRowSchema = z.object({
  id: idSchema,
  slug: z.string(),
  title: z.string(),
  status: courseStatusSchema,
  coverUrl: z.string().nullable(),
  lessonCount: z.number().int(),
  studentCount: z.number().int(),
  ratingAvg: z.number().nullable(),
  updatedAt: dateTimeSchema,
});
export type InstructorCourseRow = z.infer<typeof instructorCourseRowSchema>;

export const instructorCoursesQuerySchema = z.object({ status: courseStatusSchema.optional() });

export const instructorOverviewSchema = z.object({
  byStatus: z.record(courseStatusSchema, z.number().int()),
  students: z.number().int(),
  ratingAvg: z.number().nullable(),
  enrollments30d: z.number().int(),
});
export type InstructorOverview = z.infer<typeof instructorOverviewSchema>;

/** BR-P1 checklist; each key is translated as `readiness.<key>`. */
export const readinessSchema = z.object({
  ready: z.boolean(),
  items: z.array(z.object({ key: readinessItemSchema, ok: z.boolean() })),
});
export type Readiness = z.infer<typeof readinessSchema>;

export const moduleTitleSchema = z.object({
  title: z.string().trim().min(LIMITS.moduleTitle.min).max(LIMITS.moduleTitle.max),
});

/** The complete new order: every module of the course with every one of its lessons. */
export const structureSchema = z.object({
  modules: z.array(z.object({ moduleId: idSchema, lessonIds: z.array(idSchema) })),
});
export type StructureInput = z.infer<typeof structureSchema>;

const lessonTitleSchema = z.string().trim().min(LIMITS.lessonTitle.min).max(LIMITS.lessonTitle.max);

export const createLessonSchema = z.object({ title: lessonTitleSchema, type: lessonTypeSchema });
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

export const videoUrlSchema = z
  .string()
  .trim()
  .refine((url) => parseVideoUrl(url) !== null, { error: VALIDATION_MESSAGES.videoUrl });

export const updateLessonSchema = z
  .object({
    title: lessonTitleSchema,
    type: lessonTypeSchema,
    content: z.string().max(LIMITS.lessonContent.max).nullable(),
    videoUrl: videoUrlSchema.nullable(),
    durationMinutes: z.number().int().min(LIMITS.lessonDuration.min).max(LIMITS.lessonDuration.max),
    isPreview: z.boolean(),
  })
  .partial();
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;

export const lessonEditorSchema = z.object({
  id: idSchema,
  moduleId: idSchema,
  courseId: idSchema,
  title: z.string(),
  type: lessonTypeSchema,
  content: z.string().nullable(),
  videoUrl: z.string().nullable(),
  durationMinutes: z.number().int(),
  isPreview: z.boolean(),
  updatedAt: dateTimeSchema,
  quiz: quizEditorSchema.nullable(),
  /** The type cannot change once students completed or attempted the lesson. */
  typeLocked: z.boolean(),
  editable: z.boolean(),
});
export type LessonEditor = z.infer<typeof lessonEditorSchema>;

export const STUDENT_SORTS = ['name', 'enrolledAt', 'progress', 'lastActivity'] as const;
export const studentSortSchema = z.enum(STUDENT_SORTS);
export type StudentSort = z.infer<typeof studentSortSchema>;

export const studentsQuerySchema = pageQuerySchema.extend({
  search: z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().max(100).optional()),
  sort: studentSortSchema.default('lastActivity'),
});
export type StudentsQuery = z.infer<typeof studentsQuerySchema>;

export const studentRowSchema = z.object({
  userId: idSchema,
  name: z.string(),
  avatarUrl: z.string().nullable(),
  enrolledAt: dateTimeSchema,
  progress: z.number().int(),
  lastActivityAt: dateTimeSchema,
  status: enrollmentStatusSchema,
  quizzes: z.array(
    z.object({ quizId: idSchema, title: z.string(), bestScore: z.number().int().nullable(), attempts: z.number().int(), passed: z.boolean() }),
  ),
});
export type StudentRow = z.infer<typeof studentRowSchema>;

export const courseStatsSchema = z.object({
  totals: z.object({
    students: z.number().int(),
    completed: z.number().int(),
    avgProgress: z.number().int(),
    ratingAvg: z.number().nullable(),
  }),
  /** 12 weeks, oldest first; `weekStart` is the Monday (UTC) of the week. */
  enrollmentsByWeek: z.array(z.object({ weekStart: z.iso.date(), count: z.number().int() })),
  /** Share (0..1) of students who completed each lesson, in curriculum order. */
  funnel: z.array(z.object({ lessonId: idSchema, title: z.string(), completedShare: z.number() })),
  quizzes: z.array(
    z.object({ quizId: idSchema, title: z.string(), avgScore: z.number().nullable(), firstTryPassShare: z.number().nullable() }),
  ),
  ratingDistribution: z.record(z.enum(['1', '2', '3', '4', '5']), z.number().int()),
});
export type CourseStats = z.infer<typeof courseStatsSchema>;
