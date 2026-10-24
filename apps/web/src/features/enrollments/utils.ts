import type { MyCourse } from '@learnly/contracts/learning';

/** Case- and accent-insensitive title match, so "англ" finds "Англійська". */
export function filterByTitle(courses: readonly MyCourse[], search: string): MyCourse[] {
  const needle = normalize(search.trim());
  if (!needle) return [...courses];
  return courses.filter((item) => normalize(item.course.title).includes(needle));
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

/** FR-LEARN-3: the most recently studied course first. */
export function sortByLastActivity(courses: readonly MyCourse[]): MyCourse[] {
  return [...courses].sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt));
}

/** Where "Continue" leads: the last opened lesson, or the start of the course. */
export function continuePath(item: Pick<MyCourse, 'course' | 'lastLessonId'>): string {
  const base = `/learn/${item.course.id}`;
  return item.lastLessonId ? `${base}/${item.lastLessonId}` : base;
}
