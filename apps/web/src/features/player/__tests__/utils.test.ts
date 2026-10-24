import { describe, expect, it } from 'vitest';
import {
  findAdjacentLessons,
  flattenCurriculum,
  resumeLessonId,
  sumCourseMinutes,
  withCompletion,
  withServerProgress,
} from '../utils';
import { LESSON_1, LESSON_2, LESSON_3, learnCourse } from './fixtures';

const { modules } = learnCourse();

describe('curriculum helpers', () => {
  it('flattens modules in order and sums minutes', () => {
    expect(flattenCurriculum(modules).map((lesson) => lesson.id)).toEqual([LESSON_1, LESSON_2, LESSON_3]);
    expect(sumCourseMinutes(modules)).toBe(27);
    expect(sumCourseMinutes([])).toBe(0);
  });

  it('finds neighbours across modules', () => {
    expect(findAdjacentLessons(modules, LESSON_2)).toMatchObject({ previous: { id: LESSON_1 }, next: { id: LESSON_3 } });
    expect(findAdjacentLessons(modules, LESSON_1).previous).toBeNull();
    expect(findAdjacentLessons(modules, LESSON_3).next).toBeNull();
    expect(findAdjacentLessons(modules, 'missing')).toEqual({ previous: null, next: null });
  });

  it('resumes from the last lesson, falling back to the first one', () => {
    expect(resumeLessonId(learnCourse())).toBe(LESSON_2);
    expect(resumeLessonId(learnCourse({ lastLessonId: 'deleted' }))).toBe(LESSON_1);
    expect(resumeLessonId(learnCourse({ lastLessonId: null, modules: [] }))).toBeNull();
  });
});

describe('progress updates', () => {
  it('changes one mark and recomputes progress with BR-L3', () => {
    const course = withCompletion(learnCourse(), LESSON_2, true);
    expect(course.progress).toBe(66);
    expect(flattenCurriculum(course.modules).map((lesson) => lesson.completed)).toEqual([true, true, false]);
    expect(withCompletion(course, LESSON_1, false).progress).toBe(33);
  });

  it('takes the server answer as the truth', () => {
    const course = withServerProgress(learnCourse(), { progress: 33, completedLessonIds: [LESSON_3] });
    expect(course.progress).toBe(33);
    expect(flattenCurriculum(course.modules).map((lesson) => lesson.completed)).toEqual([false, false, true]);
  });
});
