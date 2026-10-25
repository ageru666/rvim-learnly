import { z } from 'zod';
import { courseCardSchema } from './catalog.js';
import { certificateSchema } from './certificates.js';
import { dateTimeSchema, idSchema, pageQuerySchema } from './common.js';
import { notificationSchema } from './notifications.js';
import { enrollmentStatusSchema, lessonTypeSchema, localeSchema } from './enums.js';

export const myCourseSchema = z.object({
  enrollmentId: idSchema,
  course: courseCardSchema,
  status: enrollmentStatusSchema,
  progress: z.number().int(),
  lastLessonId: idSchema.nullable(),
  lastActivityAt: dateTimeSchema,
  completedAt: dateTimeSchema.nullable(),
});
export type MyCourse = z.infer<typeof myCourseSchema>;

export const myCoursesQuerySchema = pageQuerySchema.extend({
  status: enrollmentStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
});
export type MyCoursesQuery = z.infer<typeof myCoursesQuerySchema>;

export const continueLearningSchema = z.object({
  courseId: idSchema,
  courseTitle: z.string(),
  lessonId: idSchema,
  lessonTitle: z.string(),
  progress: z.number().int(),
});
export type ContinueLearning = z.infer<typeof continueLearningSchema>;

export const dashboardSchema = z.object({
  continue: continueLearningSchema.nullable(),
  active: z.array(myCourseSchema),
  certificates: z.array(certificateSchema),
  notifications: z.array(notificationSchema),
  recommendations: z.array(courseCardSchema),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

export const enrollResultSchema = z.object({ enrollmentId: idSchema, firstLessonId: idSchema.nullable() });
export type EnrollResult = z.infer<typeof enrollResultSchema>;

export const LEARN_MODES = ['student', 'preview'] as const;
export const learnModeSchema = z.enum(LEARN_MODES);
export type LearnMode = z.infer<typeof learnModeSchema>;

export const learnLessonSchema = z.object({
  id: idSchema,
  title: z.string(),
  type: lessonTypeSchema,
  durationMinutes: z.number().int(),
  completed: z.boolean(),
  quizId: idSchema.nullable(),
});
export type LearnLesson = z.infer<typeof learnLessonSchema>;

export const learnModuleSchema = z.object({
  id: idSchema,
  title: z.string(),
  lessons: z.array(learnLessonSchema),
});
export type LearnModule = z.infer<typeof learnModuleSchema>;

export const learnCourseSchema = z.object({
  course: z.object({ id: idSchema, slug: z.string(), title: z.string(), language: localeSchema }),
  /** `preview`: the author or an administrator looks at the course; progress is not saved (FR-LEARN-8). */
  mode: learnModeSchema,
  progress: z.number().int(),
  status: enrollmentStatusSchema.nullable(),
  lastLessonId: idSchema.nullable(),
  modules: z.array(learnModuleSchema),
});
export type LearnCourse = z.infer<typeof learnCourseSchema>;

export const lessonContentSchema = z.object({
  id: idSchema,
  courseId: idSchema,
  title: z.string(),
  type: lessonTypeSchema,
  content: z.string().nullable(),
  videoUrl: z.string().nullable(),
  durationMinutes: z.number().int(),
  quizId: idSchema.nullable(),
  prevLessonId: idSchema.nullable(),
  nextLessonId: idSchema.nullable(),
  completed: z.boolean(),
});
export type LessonContent = z.infer<typeof lessonContentSchema>;

export const progressResultSchema = z.object({
  progress: z.number().int(),
  completedLessonIds: z.array(idSchema),
  courseCompleted: z.boolean(),
  certificateCode: z.string().nullable(),
});
export type ProgressResult = z.infer<typeof progressResultSchema>;
