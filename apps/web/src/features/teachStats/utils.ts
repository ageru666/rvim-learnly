import type { CourseStats } from '@learnly/contracts/instructor';

const PERCENT = 100;
const STARS = ['5', '4', '3', '2', '1'] as const;

export function toPercent(share: number): number {
  return Math.round(share * PERCENT);
}

export function weeklySeries(weeks: CourseStats['enrollmentsByWeek'], formatDay: (isoDate: string) => string) {
  return weeks.map((week) => ({ weekStart: week.weekStart, label: formatDay(week.weekStart), count: week.count }));
}

export function funnelSeries(funnel: CourseStats['funnel']) {
  return funnel.map((step) => ({ lessonId: step.lessonId, title: step.title, percent: toPercent(step.completedShare) }));
}

/**
 * The lesson students stop before most often: the largest fall in the completed share compared with
 * the previous lesson (all enrolled students count as 100 % before the first lesson).
 */
export function biggestDrop(funnel: CourseStats['funnel']): { lessonId: string; title: string; drop: number } | null {
  let best: { lessonId: string; title: string; drop: number } | null = null;
  let previous = 1;
  for (const step of funnel) {
    const drop = previous - step.completedShare;
    if (drop > 0 && (!best || drop > best.drop)) best = { lessonId: step.lessonId, title: step.title, drop };
    previous = step.completedShare;
  }
  return best;
}

/** 5 → 1 stars with the share of all ratings, for the distribution bars. */
export function ratingSeries(distribution: CourseStats['ratingDistribution']) {
  const total = STARS.reduce((sum, stars) => sum + distribution[stars], 0);
  return STARS.map((stars) => ({
    stars: Number(stars),
    count: distribution[stars],
    percent: total === 0 ? 0 : toPercent(distribution[stars] / total),
  }));
}
