import type { QuizEditor } from '@learnly/contracts/quizzes';
import { describe, expect, it } from 'vitest';
import { changeQuestionType, duplicateQuestion, emptyQuestion, markCorrect, moveItem, validateQuizDraft, type QuizQuestionDraft } from '../utils';

function quiz(questions: QuizQuestionDraft[]): QuizEditor {
  return { passScore: 70, maxAttempts: null, shuffle: false, revealAnswers: 'always', questions };
}

const VALID: QuizQuestionDraft = {
  id: 'q1',
  type: 'single',
  text: 'Pick one',
  explanation: null,
  points: 1,
  options: [
    { id: 'o1', text: 'Yes', isCorrect: true },
    { id: 'o2', text: 'No', isCorrect: false },
  ],
};

describe('validateQuizDraft', () => {
  it('accepts a valid quiz and requires questions', () => {
    expect(validateQuizDraft(quiz([VALID]))).toEqual([]);
    expect(validateQuizDraft(quiz([]))).toEqual([{ key: 'app.quizEditor.problem.noQuestions' }]);
  });

  it('reports every problem of a question with its number', () => {
    const broken: QuizQuestionDraft = { ...VALID, text: ' ', options: [{ text: '', isCorrect: false }] };
    expect(validateQuizDraft(quiz([VALID, broken])).map((problem) => `${problem.key}:${problem.number ?? ''}`)).toEqual([
      'app.quizEditor.problem.emptyText:2',
      'app.quizEditor.problem.fewOptions:2',
      'app.quizEditor.problem.emptyOption:2',
      'app.quizEditor.problem.singleCorrect:2',
    ]);
    const many: QuizQuestionDraft = { ...VALID, type: 'multiple', options: Array.from({ length: 9 }, () => ({ text: 'x', isCorrect: false })) };
    expect(validateQuizDraft(quiz([many])).map((problem) => problem.key)).toEqual([
      'app.quizEditor.problem.manyOptions',
      'app.quizEditor.problem.multipleCorrect',
    ]);
  });
});

describe('question helpers', () => {
  it('creates an empty question with one correct option', () => {
    expect(emptyQuestion('multiple')).toMatchObject({ type: 'multiple', points: 1, options: [{ isCorrect: true }, { isCorrect: false }] });
  });

  it('duplicates without ids', () => {
    const copy = duplicateQuestion(VALID);
    expect(copy).not.toHaveProperty('id');
    expect(copy.options.every((option) => !('id' in option))).toBe(true);
    expect(copy.text).toBe('Pick one');
  });

  it('moves items and ignores moves out of range', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 2)).toEqual(['a', 'b']);
  });

  it('keeps one correct option for single questions', () => {
    expect(markCorrect(VALID, 1, true).options.map((option) => option.isCorrect)).toEqual([false, true]);
    const multiple = { ...VALID, type: 'multiple' as const };
    expect(markCorrect(multiple, 1, true).options.map((option) => option.isCorrect)).toEqual([true, true]);
    expect(markCorrect(multiple, 0, false).options.map((option) => option.isCorrect)).toEqual([false, false]);
  });

  it('changes the question type', () => {
    const twoCorrect: QuizQuestionDraft = { ...VALID, type: 'multiple', options: [{ text: 'a', isCorrect: false }, { text: 'b', isCorrect: true }, { text: 'c', isCorrect: true }] };
    expect(changeQuestionType(twoCorrect, 'single').options.map((option) => option.isCorrect)).toEqual([false, true, false]);
    const noneCorrect: QuizQuestionDraft = { ...twoCorrect, options: [{ text: 'a', isCorrect: false }, { text: 'b', isCorrect: false }] };
    expect(changeQuestionType(noneCorrect, 'single').options.map((option) => option.isCorrect)).toEqual([true, false]);
    expect(changeQuestionType(VALID, 'multiple').type).toBe('multiple');
  });
});
