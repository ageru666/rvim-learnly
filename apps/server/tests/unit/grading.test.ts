import { describe, expect, it } from 'vitest';
import { gradeAttempt, shouldRevealAnswers, type GradableQuestion } from '../../src/modules/quizzes/grading.js';

const single: GradableQuestion = {
  id: 'q1',
  type: 'single',
  points: 1,
  explanation: 'Because.',
  options: [
    { id: 'q1a', isCorrect: true },
    { id: 'q1b', isCorrect: false },
  ],
};
const multiple: GradableQuestion = {
  id: 'q2',
  type: 'multiple',
  points: 2,
  explanation: null,
  options: [
    { id: 'q2a', isCorrect: true },
    { id: 'q2b', isCorrect: true },
    { id: 'q2c', isCorrect: false },
  ],
};
const questions = [single, multiple];

function grade(answers: Record<string, string[]>, passScore = 70) {
  const outcome = gradeAttempt(questions, answers, passScore);
  if (!outcome.ok) throw new Error(outcome.invalidPaths.join());
  return outcome.grade;
}

describe('gradeAttempt (BR-Q1, BR-Q2)', () => {
  it('counts a single question with the correct option', () => {
    expect(grade({ q1: ['q1a'] }).questions[0]).toMatchObject({ correct: true, correctOptionIds: ['q1a'] });
    expect(grade({ q1: ['q1b'] }).questions[0]?.correct).toBe(false);
  });

  it('counts a multiple question only for the exact set, without partial points', () => {
    expect(grade({ q2: ['q2b', 'q2a'] }).questions[1]?.correct).toBe(true);
    expect(grade({ q2: ['q2a'] }).questions[1]?.correct).toBe(false);
    expect(grade({ q2: ['q2a', 'q2b', 'q2c'] }).questions[1]?.correct).toBe(false);
    expect(grade({ q2: ['q2a', 'q2a', 'q2b'] }).questions[1]?.correct).toBe(true);
  });

  it('weights points and rounds the percentage', () => {
    expect(grade({ q1: ['q1a'] })).toMatchObject({ scorePoints: 1, maxPoints: 3, scorePercent: 33, passed: false });
    expect(grade({ q2: ['q2a', 'q2b'] })).toMatchObject({ scorePoints: 2, scorePercent: 67 });
    expect(grade({ q1: ['q1a'], q2: ['q2a', 'q2b'] })).toMatchObject({ scorePercent: 100, passed: true });
  });

  it('passes at exactly the passing score', () => {
    expect(grade({ q2: ['q2a', 'q2b'] }, 67).passed).toBe(true);
    expect(grade({ q2: ['q2a', 'q2b'] }, 68).passed).toBe(false);
  });

  it('treats unanswered questions as wrong and an empty quiz as 0 %', () => {
    expect(grade({}).scorePercent).toBe(0);
    const empty = gradeAttempt([], {}, 70);
    expect(empty.ok && empty.grade).toMatchObject({ maxPoints: 0, scorePercent: 0, passed: false });
  });
});

describe('answer validation (BR-Q4)', () => {
  it('rejects foreign questions, foreign options and several options for a single question', () => {
    expect(gradeAttempt(questions, { other: ['q1a'] }, 70)).toEqual({ ok: false, invalidPaths: ['answers.other'] });
    expect(gradeAttempt(questions, { q1: ['q2a'] }, 70)).toEqual({ ok: false, invalidPaths: ['answers.q1'] });
    expect(gradeAttempt(questions, { q1: ['q1a', 'q1b'] }, 70)).toEqual({ ok: false, invalidPaths: ['answers.q1'] });
  });
});

describe('shouldRevealAnswers (FR-QUIZ-2)', () => {
  it('reveals always, or after passing, or when the attempts are used up', () => {
    expect(shouldRevealAnswers('always', false, 2)).toBe(true);
    expect(shouldRevealAnswers('after_pass_or_exhausted', false, 2)).toBe(false);
    expect(shouldRevealAnswers('after_pass_or_exhausted', false, null)).toBe(false);
    expect(shouldRevealAnswers('after_pass_or_exhausted', true, 2)).toBe(true);
    expect(shouldRevealAnswers('after_pass_or_exhausted', false, 0)).toBe(true);
  });
});
