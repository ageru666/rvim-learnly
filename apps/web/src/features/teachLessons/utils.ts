import { lessonTypeSchema } from '@learnly/contracts/enums';
import type { LessonEditor, UpdateLessonInput } from '@learnly/contracts/instructor';
import { LIMITS } from '@learnly/contracts/limits';
import { quizEditorSchema, type QuizEditor } from '@learnly/contracts/quizzes';
import { VALIDATION_MESSAGES } from '@learnly/contracts/validation';
import { parseVideoUrl } from '@learnly/contracts/video';
import { z } from 'zod';

/** The lesson editor form: plain strings while typing, a quiz only for quiz lessons. */
export const lessonFormSchema = z.object({
  title: z.string(),
  type: lessonTypeSchema,
  durationMinutes: z.number(),
  isPreview: z.boolean(),
  content: z.string(),
  videoUrl: z.string(),
  quiz: quizEditorSchema.nullable(),
});
export type LessonForm = z.infer<typeof lessonFormSchema>;

const EMPTY_QUIZ: QuizEditor = {
  passScore: LIMITS.passScore.default,
  maxAttempts: null,
  shuffle: false,
  revealAnswers: 'after_pass_or_exhausted',
  questions: [],
};

export function toLessonForm(lesson: LessonEditor): LessonForm {
  return {
    title: lesson.title,
    type: lesson.type,
    durationMinutes: lesson.durationMinutes,
    isPreview: lesson.isPreview,
    content: lesson.content ?? '',
    videoUrl: lesson.videoUrl ?? '',
    quiz: lesson.quiz ?? (lesson.type === 'quiz' ? EMPTY_QUIZ : null),
  };
}

/** The PATCH body: lesson fields only (the quiz is saved separately); empty texts become null. */
export function toLessonUpdate(form: LessonForm): UpdateLessonInput {
  return {
    title: form.title.trim(),
    type: form.type,
    durationMinutes: form.durationMinutes,
    isPreview: form.isPreview,
    content: form.content.trim() ? form.content : null,
    videoUrl: form.type === 'video' && form.videoUrl.trim() ? form.videoUrl.trim() : null,
  };
}

/** A quiz lesson always edits a quiz, even right after switching the type. */
export function quizFor(form: Pick<LessonForm, 'type' | 'quiz'>): QuizEditor | null {
  if (form.type !== 'quiz') return null;
  return form.quiz ?? EMPTY_QUIZ;
}

/** What the form checks before saving; the server checks the same rules again. */
export const lessonFormValidationSchema = lessonFormSchema
  .extend({
    title: z.string().trim().min(LIMITS.lessonTitle.min).max(LIMITS.lessonTitle.max),
    durationMinutes: z.number().int().min(LIMITS.lessonDuration.min).max(LIMITS.lessonDuration.max),
    content: z.string().max(LIMITS.lessonContent.max),
  })
  .superRefine((form, context) => {
    if (form.type === 'video' && parseVideoUrl(form.videoUrl.trim()) === null) {
      context.addIssue({ code: 'custom', path: ['videoUrl'], message: VALIDATION_MESSAGES.videoUrl });
    }
  });
