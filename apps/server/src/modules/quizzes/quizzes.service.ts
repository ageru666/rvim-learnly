import { randomInt } from 'node:crypto';
import type { AttemptResult, AttemptSummary, Answers, QuizForStudent } from '@learnly/contracts/quizzes';
import { db } from '../../lib/db.js';
import { AppError, notFound, ruleViolation } from '../../lib/errors.js';
import type { AuthUser } from '../auth/auth.types.js';
import { checkCompletion, learnerContext, lockEnrollment, progressOf } from '../learning/progress.service.js';
import { gradeAttempt, shouldRevealAnswers } from './grading.js';

/** Fisher–Yates with a cryptographic generator, so the order cannot be predicted. */
function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    [result[index], result[other]] = [result[other] as T, result[index] as T];
  }
  return result;
}

async function loadQuiz(quizId: string) {
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      lesson: { select: { module: { select: { courseId: true } } } },
      questions: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } },
    },
  });
  if (!quiz) throw notFound();
  return quiz;
}

async function attemptStats(enrollmentId: string, quizId: string) {
  const [used, best, passedCount] = await Promise.all([
    db.quizAttempt.count({ where: { enrollmentId, quizId } }),
    db.quizAttempt.aggregate({ where: { enrollmentId, quizId }, _max: { scorePercent: true } }),
    db.quizAttempt.count({ where: { enrollmentId, quizId, passed: true } }),
  ]);
  return { used, bestScore: best._max.scorePercent, passed: passedCount > 0 };
}

/** FR-QUIZ-3: the start screen data and the questions without correct answers (FR-QUIZ-5). */
export async function getForStudent(user: AuthUser, quizId: string): Promise<QuizForStudent> {
  const quiz = await loadQuiz(quizId);
  const context = await learnerContext(user, quiz.lesson.module.courseId);
  const stats = context.enrollment
    ? await attemptStats(context.enrollment.id, quiz.id)
    : { used: 0, bestScore: null, passed: false };
  const order = <T>(items: readonly T[]) => (quiz.shuffle ? shuffled(items) : [...items]);
  return {
    id: quiz.id,
    lessonId: quiz.lessonId,
    passScore: quiz.passScore,
    maxAttempts: quiz.maxAttempts,
    attemptsUsed: stats.used,
    bestScore: stats.bestScore,
    passed: stats.passed,
    shuffle: quiz.shuffle,
    canSubmit: context.mode === 'student' && (quiz.maxAttempts === null || stats.used < quiz.maxAttempts),
    questions: order(quiz.questions).map((question) => ({
      id: question.id,
      type: question.type,
      text: question.text,
      points: question.points,
      options: order(question.options).map((option) => ({ id: option.id, text: option.text })),
    })),
  };
}

/**
 * Grades and stores an attempt. The enrollment row is locked, so parallel submissions cannot exceed
 * the attempt limit (BR-Q3); the first passing attempt completes the quiz lesson (BR-L2).
 */
export async function submitAttempt(user: AuthUser, quizId: string, answers: Answers): Promise<AttemptResult> {
  const quiz = await loadQuiz(quizId);
  const courseId = quiz.lesson.module.courseId;
  const context = await learnerContext(user, courseId);
  if (!context.enrollment) throw ruleViolation('FR-LEARN-8', 'errors.learning.previewMode');
  const enrollmentId = context.enrollment.id;

  const outcome = gradeAttempt(quiz.questions, answers, quiz.passScore);
  if (!outcome.ok) {
    throw new AppError('VALIDATION_ERROR', 'errors.quizzes.invalidAnswers');
  }
  const { grade } = outcome;

  const { attemptId, used, everPassed } = await db.$transaction(async (tx) => {
    await lockEnrollment(tx, enrollmentId);
    const before = await tx.quizAttempt.count({ where: { enrollmentId, quizId } });
    if (quiz.maxAttempts !== null && before >= quiz.maxAttempts) {
      throw ruleViolation('BR-Q3', 'errors.quizzes.noAttemptsLeft');
    }
    const attempt = await tx.quizAttempt.create({
      data: {
        enrollmentId,
        quizId,
        answers,
        result: { questions: grade.questions },
        scorePoints: grade.scorePoints,
        maxPoints: grade.maxPoints,
        scorePercent: grade.scorePercent,
        passed: grade.passed,
      },
      select: { id: true },
    });
    if (grade.passed) {
      await tx.lessonCompletion.createMany({ data: { enrollmentId, lessonId: quiz.lessonId }, skipDuplicates: true });
      await checkCompletion(tx, enrollmentId);
    }
    await tx.enrollment.update({ where: { id: enrollmentId }, data: { lastActivityAt: new Date() } });
    const passedBefore = await tx.quizAttempt.count({ where: { enrollmentId, quizId, passed: true } });
    return { attemptId: attempt.id, used: before + 1, everPassed: passedBefore > 0 };
  });

  const attemptsLeft = quiz.maxAttempts === null ? null : quiz.maxAttempts - used;
  const revealed = shouldRevealAnswers(quiz.revealAnswers, everPassed, attemptsLeft);
  return {
    id: attemptId,
    scorePercent: grade.scorePercent,
    scorePoints: grade.scorePoints,
    maxPoints: grade.maxPoints,
    passed: grade.passed,
    attemptsLeft,
    answersRevealed: revealed,
    questions: grade.questions.map((question) => ({
      id: question.id,
      correct: question.correct,
      explanation: question.explanation,
      correctOptionIds: revealed ? question.correctOptionIds : null,
    })),
    progress: await progressOf(enrollmentId, courseId),
  };
}

/** FR-QUIZ-7: the student's attempts, newest first; the author in preview has none. */
export async function listAttempts(user: AuthUser, quizId: string): Promise<AttemptSummary[]> {
  const quiz = await loadQuiz(quizId);
  const context = await learnerContext(user, quiz.lesson.module.courseId);
  if (!context.enrollment) return [];
  const attempts = await db.quizAttempt.findMany({
    where: { enrollmentId: context.enrollment.id, quizId },
    orderBy: { submittedAt: 'desc' },
    select: { id: true, scorePercent: true, passed: true, submittedAt: true },
  });
  return attempts.map((attempt) => ({ ...attempt, submittedAt: attempt.submittedAt.toISOString() }));
}
