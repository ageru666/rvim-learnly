import type { CourseCard } from '@learnly/contracts/catalog';
import type { Locale } from '@learnly/contracts/enums';
import { db } from '../../lib/db.js';
import { Prisma } from '../../generated/prisma/client.js';

export interface CourseStats {
  students: number;
  lessons: number;
  minutes: number;
  ratingAvg: number | null;
  ratingCount: number;
}

interface CourseStatsRow {
  course_id: string;
  students: number;
  lessons: number;
  minutes: number;
  rating_avg: number | null;
  rating_count: number;
}

const EMPTY_STATS: CourseStats = { students: 0, lessons: 0, minutes: 0, ratingAvg: null, ratingCount: 0 };

/** Aggregates from the `course_stats` view (data-model.md, "Derived values"). */
export async function loadCourseStats(courseIds: string[]): Promise<Map<string, CourseStats>> {
  if (courseIds.length === 0) return new Map();
  const rows = await db.$queryRaw<CourseStatsRow[]>`
    SELECT * FROM course_stats WHERE course_id IN (${Prisma.join(courseIds.map((id) => Prisma.sql`${id}::uuid`))})`;
  return new Map(
    rows.map((row) => [
      row.course_id,
      {
        students: row.students,
        lessons: row.lessons,
        minutes: row.minutes,
        ratingAvg: row.rating_avg,
        ratingCount: row.rating_count,
      },
    ]),
  );
}

export function categoryName(category: { nameUk: string; nameEn: string }, locale: Locale): string {
  return locale === 'en' ? category.nameEn : category.nameUk;
}

export const courseCardInclude = {
  category: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
  tags: { include: { tag: true }, orderBy: { tag: { name: 'asc' } } },
} satisfies Prisma.CourseInclude;

export type CourseWithCardRelations = Prisma.CourseGetPayload<{ include: typeof courseCardInclude }>;

export function toCourseCard(
  course: CourseWithCardRelations,
  stats: CourseStats | undefined,
  locale: Locale,
): CourseCard {
  const { students, lessons, minutes, ratingAvg, ratingCount } = stats ?? EMPTY_STATS;
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription ?? '',
    coverUrl: course.coverUrl,
    level: course.level,
    language: course.language,
    category: course.category
      ? { name: categoryName(course.category, locale), slug: course.category.slug, accent: course.category.accent }
      : { name: '', slug: '', accent: 'blue' },
    author: course.author,
    tags: course.tags.map(({ tag }) => tag.name),
    lessonCount: lessons,
    totalMinutes: minutes,
    rating: { avg: ratingAvg, count: ratingCount },
    studentCount: students,
  };
}

/** Loads cards for the given ids, keeping their order. */
export async function loadCourseCards(ids: string[], locale: Locale): Promise<CourseCard[]> {
  const [courses, stats] = await Promise.all([
    db.course.findMany({ where: { id: { in: ids } }, include: courseCardInclude }),
    loadCourseStats(ids),
  ]);
  const byId = new Map(courses.map((course) => [course.id, course]));
  return ids.flatMap((id) => {
    const course = byId.get(id);
    return course ? [toCourseCard(course, stats.get(id), locale)] : [];
  });
}
