import type { LearnCourse, LearnLesson, LearnModule } from '@learnly/contracts/learning';
import { computeProgress } from '@learnly/contracts/progress';

/** Lessons in curriculum order. */
export function flattenCurriculum(modules: readonly LearnModule[]): LearnLesson[] {
  return modules.flatMap((module) => module.lessons);
}

export function findAdjacentLessons(
  modules: readonly LearnModule[],
  lessonId: string,
): { previous: LearnLesson | null; next: LearnLesson | null } {
  const lessons = flattenCurriculum(modules);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index === -1) return { previous: null, next: null };
  return { previous: lessons[index - 1] ?? null, next: lessons[index + 1] ?? null };
}

export function sumCourseMinutes(modules: readonly LearnModule[]): number {
  return flattenCurriculum(modules).reduce((sum, lesson) => sum + lesson.durationMinutes, 0);
}

/** Where to open a course: the last opened lesson if it still exists, otherwise the first one. */
export function resumeLessonId(course: Pick<LearnCourse, 'lastLessonId' | 'modules'>): string | null {
  const lessons = flattenCurriculum(course.modules);
  const last = lessons.find((lesson) => lesson.id === course.lastLessonId);
  return (last ?? lessons[0])?.id ?? null;
}

/** The course with one lesson's mark changed and the progress recomputed by the same rule as the server (BR-L3). */
export function withCompletion(course: LearnCourse, lessonId: string, completed: boolean): LearnCourse {
  const modules = course.modules.map((module) => ({
    ...module,
    lessons: module.lessons.map((lesson) => (lesson.id === lessonId ? { ...lesson, completed } : lesson)),
  }));
  const lessons = flattenCurriculum(modules);
  const done = lessons.filter((lesson) => lesson.completed).length;
  return { ...course, modules, progress: computeProgress(done, lessons.length) };
}

/** Applies the server's answer: the authoritative set of completed lessons and progress. */
export function withServerProgress(
  course: LearnCourse,
  result: { progress: number; completedLessonIds: readonly string[] },
): LearnCourse {
  const done = new Set(result.completedLessonIds);
  return {
    ...course,
    progress: result.progress,
    modules: course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({ ...lesson, completed: done.has(lesson.id) })),
    })),
  };
}
