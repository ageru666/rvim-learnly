import type {
  CatalogQuery,
  CatalogSort,
  CategoryDto,
  CourseCard,
  CourseDetail,
  CourseViewer,
  CurriculumModule,
  InstructorProfile,
  LessonPreview,
  PublicStats,
  RatingDistribution,
  ReviewDto,
  ReviewsQuery,
} from '@learnly/contracts/catalog';
import type { Page } from '@learnly/contracts/common';
import { userLinksSchema } from '@learnly/contracts/me';
import type { Locale } from '@learnly/contracts/enums';
import { HOME_BLOCK_SIZE } from '@learnly/contracts/limits';
import { db } from '../../lib/db.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { toPage, toSkipTake } from '../../lib/pagination.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../auth/auth.types.js';
import { computeProgress } from '@learnly/contracts/progress';
import { reviewInclude, toReviewDto } from '../reviews/review-dto.js';
import { reviewEligibility } from '../reviews/reviews.service.js';
import { categoryName, loadCourseCards, loadCourseStats, toCourseCard, courseCardInclude } from './course-card.js';

const ORDER_BY: Record<CatalogSort, Prisma.Sql> = {
  popular: Prisma.sql`s.students DESC, c.published_at DESC`,
  newest: Prisma.sql`c.published_at DESC`,
  rating: Prisma.sql`s.rating_avg DESC NULLS LAST, s.rating_count DESC`,
  title: Prisma.sql`c.title ASC`,
};

function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, '\\$&')}%`;
}

function catalogConditions(query: CatalogQuery): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`c.status = 'published'`];
  if (query.search) {
    const pattern = likePattern(query.search);
    conditions.push(Prisma.sql`(c.title ILIKE ${pattern} OR c.short_description ILIKE ${pattern})`);
  }
  if (query.category) {
    conditions.push(Prisma.sql`c.category_id = (SELECT id FROM categories WHERE slug = ${query.category})`);
  }
  if (query.level) conditions.push(Prisma.sql`c.level = ${query.level}::"CourseLevel"`);
  if (query.language) conditions.push(Prisma.sql`c.language = ${query.language}::"Locale"`);
  if (query.tag) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM course_tags ct JOIN tags t ON t.id = ct.tag_id
      WHERE ct.course_id = c.id AND t.name = ${query.tag.toLowerCase()})`);
  }
  if (query.minRating) conditions.push(Prisma.sql`s.rating_avg >= ${query.minRating}`);
  return Prisma.join(conditions, ' AND ');
}

/** FR-SITE-2: published courses only; filters, sorts and pagination run in one SQL query. */
export async function listCourses(query: CatalogQuery, locale: Locale): Promise<Page<CourseCard>> {
  const { skip, take } = toSkipTake(query);
  const rows = await db.$queryRaw<{ id: string; total: number }[]>`
    SELECT c.id, (COUNT(*) OVER())::int AS total
    FROM courses c JOIN course_stats s ON s.course_id = c.id
    WHERE ${catalogConditions(query)}
    ORDER BY ${ORDER_BY[query.sort]}, c.id
    LIMIT ${take} OFFSET ${skip}`;
  const cards = await loadCourseCards(
    rows.map((row) => row.id),
    locale,
  );
  return toPage(cards, rows[0]?.total ?? 0, query);
}

export async function getHomeBlocks(locale: Locale) {
  const block = (sort: CatalogSort) =>
    listCourses({ page: 1, limit: HOME_BLOCK_SIZE, sort }, locale).then((page) => page.items);
  const [popular, newest] = await Promise.all([block('popular'), block('newest')]);
  return { popular, newest };
}

export async function listCategories(locale: Locale): Promise<CategoryDto[]> {
  const [categories, counts] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.course.groupBy({ by: ['categoryId'], where: { status: 'published' }, _count: { _all: true } }),
  ]);
  const countByCategory = new Map(counts.map((count) => [count.categoryId, count._count._all]));
  return categories.map((category) => ({
    id: category.id,
    name: categoryName(category, locale),
    slug: category.slug,
    accent: category.accent,
    courseCount: countByCategory.get(category.id) ?? 0,
  }));
}

export async function getPublicStats(): Promise<PublicStats> {
  const [courses, students, instructors] = await Promise.all([
    db.course.count({ where: { status: 'published' } }),
    db.user.count({ where: { role: 'student', status: 'active' } }),
    db.user.count({ where: { role: 'instructor', status: 'active' } }),
  ]);
  return { courses, students, instructors };
}

const publishedCourseInclude = {
  ...courseCardInclude,
  modules: {
    orderBy: { position: 'asc' },
    include: { lessons: { orderBy: { position: 'asc' } } },
  },
} satisfies Prisma.CourseInclude;

type PublishedCourse = Prisma.CourseGetPayload<{ include: typeof publishedCourseInclude }>;

function toCurriculum(course: PublishedCourse): CurriculumModule[] {
  return course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      durationMinutes: lesson.durationMinutes,
      isPreview: lesson.isPreview,
    })),
  }));
}

async function ratingDistribution(courseId: string): Promise<RatingDistribution> {
  const groups = await db.review.groupBy({
    by: ['rating'],
    where: { courseId, status: 'visible' },
    _count: { _all: true },
  });
  const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const group of groups) {
    const key = String(group.rating) as keyof RatingDistribution;
    distribution[key] = group._count._all;
  }
  return distribution;
}

async function viewerState(course: PublishedCourse, user: AuthUser | undefined): Promise<CourseViewer | null> {
  if (!user) return null;
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    include: { _count: { select: { completions: true } } },
  });
  const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const { block, myReview } = await reviewEligibility(user, course.id);
  return {
    enrolled: enrollment !== null,
    progress: enrollment ? computeProgress(enrollment._count.completions, totalLessons) : null,
    isAuthor: course.authorId === user.id,
    canReview: block === null && myReview === null,
    reviewBlockReason: block?.reason ?? null,
    myReview,
  };
}

export type CourseLookup =
  | { kind: 'found'; course: CourseDetail }
  | { kind: 'moved'; slug: string }
  | { kind: 'missing' };

/** FR-SITE-3; old slugs of published courses redirect to the current one (BR-P6). */
export async function findCourseBySlug(
  slug: string,
  locale: Locale,
  viewer?: AuthUser,
): Promise<CourseLookup> {
  const course = await db.course.findFirst({
    where: { slug, status: 'published' },
    include: publishedCourseInclude,
  });
  if (!course) {
    const moved = await db.courseSlugHistory.findUnique({
      where: { oldSlug: slug },
      include: { course: { select: { slug: true, status: true } } },
    });
    return moved?.course.status === 'published' ? { kind: 'moved', slug: moved.course.slug } : { kind: 'missing' };
  }

  const [stats, distribution, viewerInfo] = await Promise.all([
    loadCourseStats([course.id]),
    ratingDistribution(course.id),
    viewerState(course, viewer),
  ]);
  return {
    kind: 'found',
    course: {
      ...toCourseCard(course, stats.get(course.id), locale),
      description: course.description ?? '',
      outcomes: course.outcomes,
      requirements: course.requirements,
      updatedAt: course.updatedAt.toISOString(),
      ratingDistribution: distribution,
      curriculum: toCurriculum(course),
      viewer: viewerInfo,
    },
  };
}

async function publishedCourseId(slug: string): Promise<string> {
  const course = await db.course.findFirst({ where: { slug, status: 'published' }, select: { id: true } });
  if (!course) throw notFound();
  return course.id;
}

export async function listReviews(slug: string, query: ReviewsQuery): Promise<Page<ReviewDto>> {
  const courseId = await publishedCourseId(slug);
  const where: Prisma.ReviewWhereInput = { courseId, status: 'visible', ...(query.rating ? { rating: query.rating } : {}) };
  const [reviews, total] = await Promise.all([
    db.review.findMany({ where, orderBy: { createdAt: 'desc' }, include: reviewInclude, ...toSkipTake(query) }),
    db.review.count({ where }),
  ]);
  return toPage(
    reviews.map(toReviewDto),
    total,
    query,
  );
}

/** FR-SITE-4: guests may open preview lessons only. */
export async function getPreviewLesson(slug: string, lessonId: string): Promise<LessonPreview> {
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, module: { course: { slug, status: 'published' } } },
  });
  if (!lesson) throw notFound();
  if (!lesson.isPreview) throw forbidden('errors.catalog.enrollToOpen');
  return {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    durationMinutes: lesson.durationMinutes,
  };
}

/** FR-PROFILE-3: an author page exists for anyone with published courses. */
export async function getInstructorProfile(userId: string, locale: Locale): Promise<InstructorProfile> {
  const author = await db.user.findFirst({
    where: { id: userId, status: 'active', courses: { some: { status: 'published' } } },
    select: { id: true, name: true, avatarUrl: true, bio: true, links: true },
  });
  if (!author) throw notFound();

  const courses = await db.course.findMany({
    where: { authorId: userId, status: 'published' },
    orderBy: { publishedAt: 'desc' },
    select: { id: true },
  });
  const cards = await loadCourseCards(
    courses.map((course) => course.id),
    locale,
  );
  const rating = await db.review.aggregate({
    where: { status: 'visible', course: { authorId: userId, status: 'published' } },
    _avg: { rating: true },
  });
  return {
    author: { ...author, links: userLinksSchema.catch({}).parse(author.links) },
    studentCount: cards.reduce((sum, card) => sum + card.studentCount, 0),
    ratingAvg: rating._avg.rating === null ? null : Math.round(rating._avg.rating * 10) / 10,
    courses: cards,
  };
}

export async function listSitemapEntries(): Promise<{ courses: string[]; instructors: string[] }> {
  const courses = await db.course.findMany({
    where: { status: 'published' },
    select: { slug: true, authorId: true },
    orderBy: { publishedAt: 'desc' },
  });
  return {
    courses: courses.map((course) => course.slug),
    instructors: [...new Set(courses.map((course) => course.authorId))],
  };
}
