import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common.js';
import { questionTypeSchema, revealAnswersSchema } from './enums.js';
import { progressResultSchema } from './learning.js';
import { LIMITS } from './limits.js';
import { VALIDATION_MESSAGES } from './validation.js';

/** What a student sees before submitting: no `isCorrect`, no explanations (FR-QUIZ-5). */
export const quizForStudentSchema = z.object({
  id: idSchema,
  lessonId: idSchema,
  passScore: z.number().int(),
  maxAttempts: z.number().int().nullable(),
  attemptsUsed: z.number().int(),
  bestScore: z.number().int().nullable(),
  passed: z.boolean(),
  shuffle: z.boolean(),
  /** `preview`: the author or an administrator looks at the quiz and cannot submit it. */
  canSubmit: z.boolean(),
  questions: z.array(
    z.object({
      id: idSchema,
      type: questionTypeSchema,
      text: z.string(),
      points: z.number().int(),
      options: z.array(z.object({ id: idSchema, text: z.string() })),
    }),
  ),
});
export type QuizForStudent = z.infer<typeof quizForStudentSchema>;
export type StudentQuestion = QuizForStudent['questions'][number];

/** Selected option ids per question id; an unanswered question may be left out. */
export const answersSchema = z.record(idSchema, z.array(idSchema).max(LIMITS.optionsPerQuestion.max));
export type Answers = z.infer<typeof answersSchema>;

export const submitAttemptSchema = z.object({ answers: answersSchema });
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const questionResultSchema = z.object({
  id: idSchema,
  correct: z.boolean(),
  explanation: z.string().nullable(),
  /** null while the quiz settings keep the correct answers hidden (FR-QUIZ-2). */
  correctOptionIds: z.array(idSchema).nullable(),
});
export type QuestionResult = z.infer<typeof questionResultSchema>;

export const attemptResultSchema = z.object({
  id: idSchema,
  scorePercent: z.number().int(),
  scorePoints: z.number().int(),
  maxPoints: z.number().int(),
  passed: z.boolean(),
  attemptsLeft: z.number().int().nullable(),
  answersRevealed: z.boolean(),
  questions: z.array(questionResultSchema),
  progress: progressResultSchema,
});
export type AttemptResult = z.infer<typeof attemptResultSchema>;

export const attemptSummarySchema = z.object({
  id: idSchema,
  scorePercent: z.number().int(),
  passed: z.boolean(),
  submittedAt: dateTimeSchema,
});
export type AttemptSummary = z.infer<typeof attemptSummarySchema>;

const optionEditorSchema = z.object({
  id: idSchema.optional(),
  text: z.string().trim().min(LIMITS.optionText.min).max(LIMITS.optionText.max),
  isCorrect: z.boolean(),
});

const questionEditorSchema = z
  .object({
    id: idSchema.optional(),
    type: questionTypeSchema,
    text: z.string().trim().min(LIMITS.questionText.min).max(LIMITS.questionText.max),
    explanation: z.string().trim().max(LIMITS.questionExplanation.max).nullable(),
    points: z.number().int().min(LIMITS.questionPoints.min).max(LIMITS.questionPoints.max),
    options: z.array(optionEditorSchema).min(LIMITS.optionsPerQuestion.min).max(LIMITS.optionsPerQuestion.max),
  })
  .superRefine((question, context) => {
    const correct = question.options.filter((option) => option.isCorrect).length;
    if (question.type === 'single' && correct !== 1) {
      context.addIssue({ code: 'custom', path: ['options'], message: VALIDATION_MESSAGES.singleNeedsOneCorrect });
    }
    if (question.type === 'multiple' && correct === 0) {
      context.addIssue({ code: 'custom', path: ['options'], message: VALIDATION_MESSAGES.multipleNeedsCorrect });
    }
  });

/** The author's quiz editor (US7 uses it); new questions and options come without ids. */
export const quizEditorSchema = z.object({
  passScore: z.number().int().min(LIMITS.passScore.min).max(LIMITS.passScore.max),
  maxAttempts: z.number().int().min(LIMITS.maxAttempts.min).max(LIMITS.maxAttempts.max).nullable(),
  shuffle: z.boolean(),
  revealAnswers: revealAnswersSchema,
  questions: z.array(questionEditorSchema),
});
export type QuizEditor = z.infer<typeof quizEditorSchema>;
