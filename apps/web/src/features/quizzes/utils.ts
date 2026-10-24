import type { QuestionType } from '@learnly/contracts/enums';
import type { Answers, StudentQuestion } from '@learnly/contracts/quizzes';

/** A radio question keeps one option; a checkbox question toggles the option in or out. */
export function toggleAnswer(selected: readonly string[], optionId: string, type: QuestionType): string[] {
  if (type === 'single') return [optionId];
  return selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId];
}

/**
 * The server shuffles on every request; a restored attempt keeps the order the student saw. A stored
 * order that no longer matches the questions (the quiz was edited) is ignored.
 */
export function applyOrder(questions: readonly StudentQuestion[], order: readonly string[]): StudentQuestion[] {
  const ids = new Set(questions.map((question) => question.id));
  const sameSet = order.length === questions.length && order.every((id) => ids.has(id));
  if (!sameSet) return [...questions];
  return [...questions].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export function isAnswered(answers: Answers, questionId: string): boolean {
  return (answers[questionId]?.length ?? 0) > 0;
}

/** Positions (0-based) of the questions without an answer, in the displayed order. */
export function unansweredIndexes(questionIds: readonly string[], answers: Answers): number[] {
  return questionIds.flatMap((id, index) => (isAnswered(answers, id) ? [] : [index]));
}

/** Answers that still belong to the quiz, e.g. after the author removed a question. */
export function answersFor(questionIds: readonly string[], answers: Answers): Answers {
  return Object.fromEntries(Object.entries(answers).filter(([id]) => questionIds.includes(id)));
}
