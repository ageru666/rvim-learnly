import type { QuestionType, RevealAnswers } from '@learnly/contracts/enums';
import type { Answers } from '@learnly/contracts/quizzes';

const PERCENT = 100;

export interface GradableQuestion {
  id: string;
  type: QuestionType;
  points: number;
  explanation: string | null;
  options: { id: string; isCorrect: boolean }[];
}

/** Stored with the attempt (a JSON column), so later edits of the quiz do not change past results (BR-Q5). */
type GradedQuestion = {
  id: string;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  correct: boolean;
  points: number;
  explanation: string | null;
};

interface Grade {
  questions: GradedQuestion[];
  scorePoints: number;
  maxPoints: number;
  scorePercent: number;
  passed: boolean;
}

export type GradeOutcome = { ok: true; grade: Grade } | { ok: false; invalidPaths: string[] };

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

/** BR-Q4: answers only to questions of this quiz, with their own options, one option for `single`. */
function invalidAnswerPaths(questions: readonly GradableQuestion[], answers: Answers): string[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return Object.entries(answers).flatMap(([questionId, selected]) => {
    const question = byId.get(questionId);
    if (!question) return [`answers.${questionId}`];
    const optionIds = new Set(question.options.map((option) => option.id));
    const foreign = selected.some((optionId) => !optionIds.has(optionId));
    const tooMany = question.type === 'single' && new Set(selected).size > 1;
    return foreign || tooMany ? [`answers.${questionId}`] : [];
  });
}

/**
 * BR-Q1: a single-answer question counts when its correct option is chosen, a multiple-answer one
 * only when the chosen set equals the correct set; no partial points. BR-Q2: passed at ≥ passScore.
 */
export function gradeAttempt(questions: readonly GradableQuestion[], answers: Answers, passScore: number): GradeOutcome {
  const invalidPaths = invalidAnswerPaths(questions, answers);
  if (invalidPaths.length > 0) return { ok: false, invalidPaths };

  const graded = questions.map((question) => {
    const selectedOptionIds = [...new Set(answers[question.id] ?? [])];
    const correctOptionIds = question.options.filter((option) => option.isCorrect).map((option) => option.id);
    return {
      id: question.id,
      selectedOptionIds,
      correctOptionIds,
      correct: sameSet(selectedOptionIds, correctOptionIds),
      points: question.points,
      explanation: question.explanation,
    };
  });
  const maxPoints = graded.reduce((sum, question) => sum + question.points, 0);
  const scorePoints = graded.reduce((sum, question) => sum + (question.correct ? question.points : 0), 0);
  const scorePercent = maxPoints === 0 ? 0 : Math.round((scorePoints * PERCENT) / maxPoints);
  return {
    ok: true,
    grade: { questions: graded, scorePoints, maxPoints, scorePercent, passed: scorePercent >= passScore },
  };
}

/** FR-QUIZ-2: correct answers are shown always, or once the quiz is passed or no attempts are left. */
export function shouldRevealAnswers(mode: RevealAnswers, everPassed: boolean, attemptsLeft: number | null): boolean {
  return mode === 'always' || everPassed || attemptsLeft === 0;
}
