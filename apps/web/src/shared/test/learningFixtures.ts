import type { CourseCard } from '@learnly/contracts/catalog';
import type { MyCourse } from '@learnly/contracts/learning';

let sequence = 0;

function id(prefix: string): string {
  sequence += 1;
  return `01970000-0000-7000-8000-${prefix}${String(sequence).padStart(12 - prefix.length, '0')}`;
}

export function courseCard(overrides: Partial<CourseCard> = {}): CourseCard {
  return {
    id: id('c'),
    slug: `course-${sequence}`,
    title: 'Основи JavaScript',
    shortDescription: 'Коротко',
    coverUrl: null,
    level: 'beginner',
    language: 'uk',
    category: { name: 'Програмування', slug: 'programming', accent: 'blue' },
    author: { id: id('a'), name: 'Олена', avatarUrl: null },
    tags: [],
    lessonCount: 3,
    totalMinutes: 30,
    rating: { avg: 4.5, count: 2 },
    studentCount: 10,
    ...overrides,
  };
}

export function myCourse(overrides: Partial<MyCourse> & { title?: string } = {}): MyCourse {
  const { title, ...rest } = overrides;
  return {
    enrollmentId: id('e'),
    course: courseCard(title ? { title } : {}),
    status: 'active',
    progress: 40,
    lastLessonId: id('b'),
    lastActivityAt: '2026-10-20T10:00:00.000Z',
    completedAt: null,
    ...rest,
  };
}
