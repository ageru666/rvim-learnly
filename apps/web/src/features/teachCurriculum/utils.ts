import type { ModuleDto, StructureInput } from '@learnly/contracts/instructor';

type Lesson = ModuleDto['lessons'][number];

/** Id prefix of a module's lesson list as a drop zone (the module card itself uses the module id). */
export const DROP_PREFIX = 'drop:';

export function locateLesson(modules: readonly ModuleDto[], lessonId: string): { moduleIndex: number; index: number } | null {
  for (const [moduleIndex, module] of modules.entries()) {
    const index = module.lessons.findIndex((lesson) => lesson.id === lessonId);
    if (index !== -1) return { moduleIndex, index };
  }
  return null;
}

/** Moves a lesson to `targetIndex` of the target module (the index counts without the moved lesson). */
export function moveLesson(modules: readonly ModuleDto[], lessonId: string, targetModuleId: string, targetIndex: number): ModuleDto[] {
  const from = locateLesson(modules, lessonId);
  if (!from || !modules.some((module) => module.id === targetModuleId)) return [...modules];
  const lesson = modules[from.moduleIndex]?.lessons[from.index] as Lesson;
  const without = modules.map((module, moduleIndex) =>
    moduleIndex === from.moduleIndex ? { ...module, lessons: module.lessons.filter((item) => item.id !== lessonId) } : module,
  );
  return without.map((module) => {
    if (module.id !== targetModuleId) return module;
    const lessons = [...module.lessons];
    lessons.splice(Math.max(0, Math.min(targetIndex, lessons.length)), 0, lesson);
    return { ...module, lessons };
  });
}

export function moveModule(modules: readonly ModuleDto[], fromIndex: number, toIndex: number): ModuleDto[] {
  const result = [...modules];
  const [moved] = result.splice(fromIndex, 1);
  if (!moved) return [...modules];
  result.splice(Math.max(0, Math.min(toIndex, result.length)), 0, moved);
  return result;
}

/**
 * One step up or down for the keyboard-free "Move" buttons: within the module, or across the
 * boundary into the end of the previous / the start of the next module.
 */
export function shiftLesson(modules: readonly ModuleDto[], lessonId: string, delta: -1 | 1): ModuleDto[] {
  const from = locateLesson(modules, lessonId);
  if (!from) return [...modules];
  const module = modules[from.moduleIndex] as ModuleDto;
  const target = from.index + delta;
  if (target >= 0 && target < module.lessons.length) return moveLesson(modules, lessonId, module.id, target);
  const neighbour = modules[from.moduleIndex + delta];
  if (!neighbour) return [...modules];
  return moveLesson(modules, lessonId, neighbour.id, delta === -1 ? neighbour.lessons.length : 0);
}

/** Where a dragged lesson lands: over another lesson takes its place, over a module goes to its end. */
export function dropTarget(modules: readonly ModuleDto[], overId: string): { moduleId: string; index: number } | null {
  const overLesson = locateLesson(modules, overId);
  if (overLesson) return { moduleId: (modules[overLesson.moduleIndex] as ModuleDto).id, index: overLesson.index };
  const module = modules.find((item) => item.id === overId);
  return module ? { moduleId: module.id, index: module.lessons.length } : null;
}

export function toStructurePayload(modules: readonly ModuleDto[]): StructureInput {
  return { modules: modules.map((module) => ({ moduleId: module.id, lessonIds: module.lessons.map((lesson) => lesson.id) })) };
}

/** 1-based position of a lesson across the whole course, for screen-reader announcements. */
export function coursePosition(modules: readonly ModuleDto[], lessonId: string): number {
  return modules.flatMap((module) => module.lessons).findIndex((lesson) => lesson.id === lessonId) + 1;
}

/**
 * Whether a drag may land on a droppable. A module's card and its drop zone both wrap its lessons, and their
 * centers sit next to the middle lesson's, so the closest center often picked the module and sent the lesson to
 * its end. A lesson therefore lands on lessons, or on the drop zone of an empty module; a module on modules.
 */
export function isDropCandidate(modules: readonly ModuleDto[], dragged: 'lesson' | 'module', droppable: { id: string; type: unknown }): boolean {
  const isZone = droppable.id.startsWith(DROP_PREFIX);
  if (dragged === 'module') return droppable.type === 'module' && !isZone;
  if (droppable.type === 'lesson') return true;
  const moduleId = droppable.id.slice(DROP_PREFIX.length);
  return isZone && modules.some((module) => module.id === moduleId && module.lessons.length === 0);
}
