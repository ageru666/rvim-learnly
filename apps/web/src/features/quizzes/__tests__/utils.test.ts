import type { StudentQuestion } from '@learnly/contracts/quizzes';
import { describe, expect, it } from 'vitest';
import { answersFor, applyOrder, isAnswered, toggleAnswer, unansweredIndexes } from '../utils';

function question(id: string): StudentQuestion {
  return { id, type: 'single', text: id, points: 1, options: [] };
}

describe('toggleAnswer', () => {
  it('keeps one option for a single question', () => {
    expect(toggleAnswer(['a'], 'b', 'single')).toEqual(['b']);
  });

  it('adds and removes options for a multiple question', () => {
    expect(toggleAnswer(['a'], 'b', 'multiple')).toEqual(['a', 'b']);
    expect(toggleAnswer(['a', 'b'], 'a', 'multiple')).toEqual(['b']);
  });
});

describe('applyOrder', () => {
  const questions = [question('q1'), question('q2'), question('q3')];

  it('restores the order the student saw', () => {
    expect(applyOrder(questions, ['q3', 'q1', 'q2']).map((item) => item.id)).toEqual(['q3', 'q1', 'q2']);
  });

  it('ignores an order that no longer matches the quiz', () => {
    expect(applyOrder(questions, ['q1', 'q2']).map((item) => item.id)).toEqual(['q1', 'q2', 'q3']);
    expect(applyOrder(questions, ['q1', 'q2', 'gone']).map((item) => item.id)).toEqual(['q1', 'q2', 'q3']);
  });
});

describe('answer bookkeeping', () => {
  const answers = { q1: ['a'], q2: [], removed: ['x'] };

  it('knows which questions are answered', () => {
    expect(isAnswered(answers, 'q1')).toBe(true);
    expect(isAnswered(answers, 'q2')).toBe(false);
    expect(isAnswered(answers, 'q3')).toBe(false);
    expect(unansweredIndexes(['q1', 'q2', 'q3'], answers)).toEqual([1, 2]);
  });

  it('drops answers to questions that are not in the quiz', () => {
    expect(answersFor(['q1', 'q2'], answers)).toEqual({ q1: ['a'], q2: [] });
  });
});
