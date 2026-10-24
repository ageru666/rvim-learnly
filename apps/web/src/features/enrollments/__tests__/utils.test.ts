import { describe, expect, it } from 'vitest';
import { continuePath, filterByTitle, sortByLastActivity } from '../utils';
import { myCourse } from '../../../shared/test/learningFixtures';

describe('filterByTitle', () => {
  const courses = [myCourse({ title: 'Англійська для IT' }), myCourse({ title: 'Café français' })];

  it('ignores case and accents', () => {
    expect(filterByTitle(courses, 'англ').map((item) => item.course.title)).toEqual(['Англійська для IT']);
    expect(filterByTitle(courses, 'CAFE').map((item) => item.course.title)).toEqual(['Café français']);
  });

  it('returns everything for an empty search and nothing for no match', () => {
    expect(filterByTitle(courses, '  ')).toHaveLength(2);
    expect(filterByTitle(courses, 'python')).toEqual([]);
  });
});

describe('sortByLastActivity', () => {
  it('puts the most recent course first without changing the input', () => {
    const older = myCourse({ lastActivityAt: '2026-10-01T10:00:00.000Z' });
    const newer = myCourse({ lastActivityAt: '2026-10-22T10:00:00.000Z' });
    const input = [older, newer];
    expect(sortByLastActivity(input)).toEqual([newer, older]);
    expect(input).toEqual([older, newer]);
  });
});

describe('continuePath', () => {
  it('opens the last lesson or the course start', () => {
    const item = myCourse();
    expect(continuePath(item)).toBe(`/learn/${item.course.id}/${item.lastLessonId ?? ''}`);
    expect(continuePath({ ...item, lastLessonId: null })).toBe(`/learn/${item.course.id}`);
  });
});
