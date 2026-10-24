import { describe, expect, it } from 'vitest';
import { computeProgress } from '@learnly/contracts/progress';

describe('computeProgress (BR-L3)', () => {
  it('rounds down to a whole percent', () => {
    expect(computeProgress(1, 3)).toBe(33);
    expect(computeProgress(2, 3)).toBe(66);
    expect(computeProgress(199, 200)).toBe(99);
  });

  it('is 100 only when every lesson is completed', () => {
    expect(computeProgress(3, 3)).toBe(100);
  });

  it('is 0 for a course without lessons', () => {
    expect(computeProgress(0, 0)).toBe(0);
  });
});
