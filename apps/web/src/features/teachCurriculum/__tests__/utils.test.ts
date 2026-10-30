import type { ModuleDto } from '@learnly/contracts/instructor';
import { describe, expect, it } from 'vitest';
import { coursePosition, DROP_PREFIX, dropTarget, isDropCandidate, locateLesson, moveLesson, moveModule, shiftLesson, toStructurePayload } from '../utils';

function lesson(id: string) {
  return { id, title: id, type: 'text' as const, durationMinutes: 5, isPreview: false, position: 0 };
}

const MODULES: ModuleDto[] = [
  { id: 'm1', title: 'M1', position: 0, lessons: [lesson('a'), lesson('b')] },
  { id: 'm2', title: 'M2', position: 1, lessons: [lesson('c')] },
  { id: 'm3', title: 'M3', position: 2, lessons: [] },
];

const ids = (modules: ModuleDto[]) => modules.map((module) => `${module.id}:${module.lessons.map((item) => item.id).join('')}`);

describe('curriculum utils', () => {
  it('locates lessons', () => {
    expect(locateLesson(MODULES, 'c')).toEqual({ moduleIndex: 1, index: 0 });
    expect(locateLesson(MODULES, 'x')).toBeNull();
  });

  it('moves a lesson within and between modules, clamping the index', () => {
    expect(ids(moveLesson(MODULES, 'a', 'm1', 1))).toEqual(['m1:ba', 'm2:c', 'm3:']);
    expect(ids(moveLesson(MODULES, 'a', 'm3', 9))).toEqual(['m1:b', 'm2:c', 'm3:a']);
    expect(ids(moveLesson(MODULES, 'c', 'm1', -1))).toEqual(['m1:cab', 'm2:', 'm3:']);
    expect(moveLesson(MODULES, 'x', 'm1', 0)).toEqual(MODULES);
    expect(moveLesson(MODULES, 'a', 'missing', 0)).toEqual(MODULES);
  });

  it('moves modules', () => {
    expect(moveModule(MODULES, 0, 2).map((module) => module.id)).toEqual(['m2', 'm3', 'm1']);
    expect(moveModule(MODULES, 5, 0)).toEqual(MODULES);
  });

  it('shifts a lesson one step, across module boundaries', () => {
    expect(ids(shiftLesson(MODULES, 'b', -1))).toEqual(['m1:ba', 'm2:c', 'm3:']);
    expect(ids(shiftLesson(MODULES, 'b', 1))).toEqual(['m1:a', 'm2:bc', 'm3:']);
    expect(ids(shiftLesson(MODULES, 'c', -1))).toEqual(['m1:abc', 'm2:', 'm3:']);
    expect(shiftLesson(MODULES, 'a', -1)).toEqual(MODULES);
    expect(shiftLesson(MODULES, 'x', 1)).toEqual(MODULES);
  });

  it('finds the drop target over a lesson or a module', () => {
    expect(dropTarget(MODULES, 'b')).toEqual({ moduleId: 'm1', index: 1 });
    expect(dropTarget(MODULES, 'm3')).toEqual({ moduleId: 'm3', index: 0 });
    expect(dropTarget(MODULES, 'nothing')).toBeNull();
  });

  it('builds the structure payload and course positions', () => {
    expect(toStructurePayload(MODULES)).toEqual({
      modules: [
        { moduleId: 'm1', lessonIds: ['a', 'b'] },
        { moduleId: 'm2', lessonIds: ['c'] },
        { moduleId: 'm3', lessonIds: [] },
      ],
    });
    expect(coursePosition(MODULES, 'c')).toBe(3);
  });

  it('lets a lesson land on lessons and empty modules only, and a module on modules', () => {
    const zone = (moduleId: string) => ({ id: `${DROP_PREFIX}${moduleId}`, type: 'module' });
    expect(isDropCandidate(MODULES, 'lesson', { id: 'b', type: 'lesson' })).toBe(true);
    expect(isDropCandidate(MODULES, 'lesson', { id: 'm1', type: 'module' })).toBe(false);
    expect(isDropCandidate(MODULES, 'lesson', zone('m1'))).toBe(false);
    expect(isDropCandidate(MODULES, 'lesson', zone('m3'))).toBe(true);
    expect(isDropCandidate(MODULES, 'lesson', zone('missing'))).toBe(false);
    expect(isDropCandidate(MODULES, 'module', { id: 'm2', type: 'module' })).toBe(true);
    expect(isDropCandidate(MODULES, 'module', zone('m3'))).toBe(false);
    expect(isDropCandidate(MODULES, 'module', { id: 'a', type: 'lesson' })).toBe(false);
  });
});
