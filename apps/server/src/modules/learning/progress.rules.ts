const PERCENT = 100;

/** BR-L3: completed lessons / all lessons × 100 %, rounded down; 0 for a course without lessons. */
export function computeProgress(completedLessons: number, totalLessons: number): number {
  if (totalLessons === 0) return 0;
  return Math.floor((completedLessons * PERCENT) / totalLessons);
}
