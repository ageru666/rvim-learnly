import { z } from 'zod';
import { dateTimeSchema, idSchema, pageQuerySchema } from './common.js';
import { accentSchema, courseLevelSchema, lessonTypeSchema, localeSchema } from './enums.js';
import { CATALOG_PAGE_SIZE, LIMITS } from './limits.js';
import { userLinksSchema, userSummarySchema } from './me.js';

export const CATALOG_SORTS = ['popular', 'newest', 'rating', 'title'] as const;
export const catalogSortSchema = z.enum(CATALOG_SORTS);
export type CatalogSort = z.infer<typeof catalogSortSchema>;

const MIN_RATING = 1;
const MAX_RATING = 5;

/** Empty strings from a plain GET form are treated as "no filter". */
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const catalogQuerySchema = pageQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSize.max).default(CATALOG_PAGE_SIZE),
  search: optionalText,
  category: optionalText,
  tag: optionalText,
  level: z.preprocess((value) => value || undefined, courseLevelSchema.optional()),
  language: z.preprocess((value) => value || undefined, localeSchema.optional()),
  minRating: z.preprocess(
    (value) => value || undefined,
    z.coerce.number().int().min(MIN_RATING).max(MAX_RATING).optional(),
  ),
  sort: z.preprocess((value) => value || undefined, catalogSortSchema.default('popular')),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export const categorySchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: z.string(),
  accent: accentSchema,
  courseCount: z.number().int(),
});
export type CategoryDto = z.infer<typeof categorySchema>;

export const ratingSchema = z.object({ avg: z.number().nullable(), count: z.number().int() });

export const courseCardSchema = z.object({
  id: idSchema,
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  coverUrl: z.string().nullable(),
  level: courseLevelSchema,
  language: localeSchema,
  category: z.object({ name: z.string(), slug: z.string(), accent: accentSchema }),
  author: userSummarySchema,
  tags: z.array(z.string()),
  lessonCount: z.number().int(),
  totalMinutes: z.number().int(),
  rating: ratingSchema,
  studentCount: z.number().int(),
});
export type CourseCard = z.infer<typeof courseCardSchema>;

export const reviewSchema = z.object({
  id: idSchema,
  user: userSummarySchema,
  rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
  text: z.string(),
  hidden: z.boolean(),
  authorReply: z.string().nullable(),
  authorRepliedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type ReviewDto = z.infer<typeof reviewSchema>;

export const reviewsQuerySchema = pageQuerySchema.extend({
  rating: z.preprocess(
    (value) => value || undefined,
    z.coerce.number().int().min(MIN_RATING).max(MAX_RATING).optional(),
  ),
});
export type ReviewsQuery = z.infer<typeof reviewsQuerySchema>;

export const curriculumLessonSchema = z.object({
  id: idSchema,
  title: z.string(),
  type: lessonTypeSchema,
  durationMinutes: z.number().int(),
  isPreview: z.boolean(),
});

export const curriculumModuleSchema = z.object({
  id: idSchema,
  title: z.string(),
  lessons: z.array(curriculumLessonSchema),
});
export type CurriculumModule = z.infer<typeof curriculumModuleSchema>;

export const ratingDistributionSchema = z.record(z.enum(['1', '2', '3', '4', '5']), z.number().int());
export type RatingDistribution = z.infer<typeof ratingDistributionSchema>;

export const courseViewerSchema = z.object({
  enrolled: z.boolean(),
  progress: z.number().int().nullable(),
  isAuthor: z.boolean(),
  canReview: z.boolean(),
  /** i18n key explaining why the viewer cannot review (BR-R1, BR-R2, BR-U4). */
  reviewBlockReason: z.string().nullable(),
  myReview: reviewSchema.nullable(),
});
export type CourseViewer = z.infer<typeof courseViewerSchema>;

export const courseDetailSchema = courseCardSchema.extend({
  description: z.string(),
  outcomes: z.array(z.string()),
  requirements: z.array(z.string()),
  updatedAt: dateTimeSchema,
  ratingDistribution: ratingDistributionSchema,
  curriculum: z.array(curriculumModuleSchema),
  viewer: courseViewerSchema.nullable(),
});
export type CourseDetail = z.infer<typeof courseDetailSchema>;

export const lessonPreviewSchema = z.object({
  id: idSchema,
  title: z.string(),
  type: lessonTypeSchema,
  content: z.string().nullable(),
  videoUrl: z.string().nullable(),
  durationMinutes: z.number().int(),
});
export type LessonPreview = z.infer<typeof lessonPreviewSchema>;

export const instructorProfileSchema = z.object({
  author: userSummarySchema.extend({ bio: z.string().nullable(), links: userLinksSchema }),
  studentCount: z.number().int(),
  ratingAvg: z.number().nullable(),
  courses: z.array(courseCardSchema),
});
export type InstructorProfile = z.infer<typeof instructorProfileSchema>;

export const publicStatsSchema = z.object({
  courses: z.number().int(),
  students: z.number().int(),
  instructors: z.number().int(),
});
export type PublicStats = z.infer<typeof publicStatsSchema>;
