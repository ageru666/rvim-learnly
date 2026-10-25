import type { QuestionType } from '@learnly/contracts/enums';
import { LIMITS } from '@learnly/contracts/limits';
import type { QuizEditor } from '@learnly/contracts/quizzes';
import type { MessageKey } from '@learnly/i18n/keys';

export type QuizQuestionDraft = QuizEditor['questions'][number];

export interface QuizProblem {
  key: MessageKey;
  /** 1-based question number for the message. */
  number?: number;
}

/** The same rules as the server schema, as i18n keys to show before saving. */
export function validateQuizDraft(quiz: QuizEditor): QuizProblem[] {
  if (quiz.questions.length === 0) return [{ key: 'app.quizEditor.problem.noQuestions' }];
  return quiz.questions.flatMap((question, index): QuizProblem[] => {
    const number = index + 1;
    const problems: QuizProblem[] = [];
    const correct = question.options.filter((option) => option.isCorrect).length;
    if (!question.text.trim()) problems.push({ key: 'app.quizEditor.problem.emptyText', number });
    if (question.options.length < LIMITS.optionsPerQuestion.min) problems.push({ key: 'app.quizEditor.problem.fewOptions', number });
    if (question.options.length > LIMITS.optionsPerQuestion.max) problems.push({ key: 'app.quizEditor.problem.manyOptions', number });
    if (question.options.some((option) => !option.text.trim())) problems.push({ key: 'app.quizEditor.problem.emptyOption', number });
    if (question.type === 'single' && correct !== 1) problems.push({ key: 'app.quizEditor.problem.singleCorrect', number });
    if (question.type === 'multiple' && correct === 0) problems.push({ key: 'app.quizEditor.problem.multipleCorrect', number });
    return problems;
  });
}

export function emptyQuestion(type: QuestionType): QuizQuestionDraft {
  return {
    type,
    text: '',
    explanation: null,
    points: LIMITS.questionPoints.default,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
  };
}

/** A copy without ids, so the server creates new rows for it. */
export function duplicateQuestion(question: QuizQuestionDraft): QuizQuestionDraft {
  return {
    type: question.type,
    text: question.text,
    explanation: question.explanation,
    points: question.points,
    options: question.options.map((option) => ({ text: option.text, isCorrect: option.isCorrect })),
  };
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return [...items];
  const result = [...items];
  const [moved] = result.splice(from, 1) as [T];
  result.splice(to, 0, moved);
  return result;
}

/** A single-answer question keeps exactly one correct option. */
export function markCorrect(question: QuizQuestionDraft, optionIndex: number, checked: boolean): QuizQuestionDraft {
  return {
    ...question,
    options: question.options.map((option, index) => {
      if (question.type === 'single') return { ...option, isCorrect: index === optionIndex };
      return index === optionIndex ? { ...option, isCorrect: checked } : option;
    }),
  };
}

/** Switching to single keeps only the first correct option. */
export function changeQuestionType(question: QuizQuestionDraft, type: QuestionType): QuizQuestionDraft {
  if (type === 'multiple') return { ...question, type };
  const first = question.options.findIndex((option) => option.isCorrect);
  return { ...question, type, options: question.options.map((option, index) => ({ ...option, isCorrect: index === Math.max(first, 0) })) };
}
