import type { QuizEditor } from '@learnly/contracts/quizzes';
import type { Prisma } from '../../generated/prisma/client.js';

export const quizEditorInclude = {
  questions: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } },
} satisfies Prisma.QuizInclude;

export type QuizWithQuestions = Prisma.QuizGetPayload<{ include: typeof quizEditorInclude }>;

/** The author's view of a quiz, with correct answers and explanations. */
export function toQuizEditor(quiz: QuizWithQuestions): QuizEditor {
  return {
    passScore: quiz.passScore,
    maxAttempts: quiz.maxAttempts,
    shuffle: quiz.shuffle,
    revealAnswers: quiz.revealAnswers,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      type: question.type,
      text: question.text,
      explanation: question.explanation,
      points: question.points,
      options: question.options.map((option) => ({ id: option.id, text: option.text, isCorrect: option.isCorrect })),
    })),
  };
}
