import { catalogQuerySchema, type CatalogQuery } from '@learnly/contracts/catalog';
import { idSchema } from '@learnly/contracts/common';
import { CATALOG_SORTS } from '@learnly/contracts/catalog';
import { COURSE_LEVELS, LOCALES } from '@learnly/contracts/enums';
import { buildEmbedUrl, parseVideoUrl } from '@learnly/contracts/video';
import type { CourseDetail } from '@learnly/contracts/catalog';
import { REVIEW_MIN_PROGRESS } from '@learnly/contracts/limits';
import { createReviewSchema } from '@learnly/contracts/reviews';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { AppError, notFound } from '../../lib/errors.js';
import { setFlash } from '../../lib/flash.js';
import { renderMarkdown } from '../../lib/markdown.js';
import { renderPage } from '../../lib/render.js';
import { parseInput, validateForm } from '../../lib/validation.js';
import { currentUser, requireAuth } from '../../middlewares/requireRole.js';
import { createReview, deleteReview, updateReview } from '../reviews/reviews.service.js';
import { enrollFromSite } from '../learning/site-enrollment.js';
import {
  findCourseBySlug,
  getHomeBlocks,
  getInstructorProfile,
  getPreviewLesson,
  getPublicStats,
  listCategories,
  listCourses,
  listReviews,
} from './catalog.service.js';

const slugParams = z.object({ slug: z.string() });
const previewParams = slugParams.extend({ lessonId: idSchema });
const idParams = z.object({ id: idSchema });
const RATING_OPTIONS = [4, 3, 2] as const;

/** Rebuilds the catalog URL with one parameter changed, keeping the other filters (shareable links). */
function catalogHref(query: CatalogQuery, changes: Partial<Record<keyof CatalogQuery, string | number | undefined>>) {
  const params = new URLSearchParams();
  const merged = { ...query, ...changes };
  for (const key of ['search', 'category', 'level', 'language', 'tag', 'minRating', 'sort', 'page'] as const) {
    const value = merged[key];
    const isDefault = (key === 'sort' && value === 'popular') || (key === 'page' && value === 1);
    if (value !== undefined && value !== '' && !isDefault) params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `/courses?${search}` : '/courses';
}

function embedUrlFor(videoUrl: string | null, locale: 'uk' | 'en'): string | null {
  const video = videoUrl ? parseVideoUrl(videoUrl) : null;
  return video ? buildEmbedUrl(video, locale) : null;
}

export const catalogWebRouter = Router();

catalogWebRouter.get('/', async (req, res) => {
  const [stats, blocks, categories] = await Promise.all([
    getPublicStats(),
    getHomeBlocks(req.locale),
    listCategories(req.locale),
  ]);
  await renderPage(res, 'pages/home', { stats, ...blocks, categories }, { title: req.i18n.t('site.home.title') });
});

catalogWebRouter.get('/courses', async (req, res) => {
  const parsed = catalogQuerySchema.safeParse(req.query);
  const query = parsed.success ? parsed.data : catalogQuerySchema.parse({});
  const [page, categories] = await Promise.all([listCourses(query, req.locale), listCategories(req.locale)]);
  await renderPage(
    res,
    'pages/catalog',
    {
      query,
      page,
      categories,
      levels: COURSE_LEVELS,
      languages: LOCALES,
      sorts: CATALOG_SORTS,
      ratingOptions: RATING_OPTIONS,
      totalPages: Math.max(1, Math.ceil(page.total / query.limit)),
      hrefFor: (changes: Partial<Record<keyof CatalogQuery, string | number | undefined>>) => catalogHref(query, changes),
    },
    { title: req.i18n.t('site.catalog.title'), description: req.i18n.t('site.catalog.description') },
  );
});

/** Values and field errors of the review form when it is shown again after a failed submit. */
interface ReviewFormState {
  values: { rating?: unknown; text?: unknown };
  errors: Record<string, string>;
}

async function renderCourse(req: Request, res: Response, course: CourseDetail, reviewForm: ReviewFormState | null) {
  const reviews = await listReviews(course.slug, { page: 1, limit: 10 });
  const myReview = course.viewer?.myReview ?? null;
  await renderPage(
    res,
    'pages/course',
    {
      course,
      reviews,
      descriptionHtml: renderMarkdown(course.description),
      og: { title: course.title, description: course.shortDescription, image: course.coverUrl },
      reviewMinProgress: REVIEW_MIN_PROGRESS,
      reviewForm: reviewForm ?? { values: myReview ? { rating: myReview.rating, text: myReview.text } : {}, errors: {} },
    },
    { title: course.title, description: course.shortDescription, status: reviewForm ? 422 : 200 },
  );
}

async function publishedCourse(req: Request, slug: string): Promise<CourseDetail> {
  const lookup = await findCourseBySlug(slug, req.locale, req.user);
  if (lookup.kind !== 'found') throw notFound();
  return lookup.course;
}

catalogWebRouter.get('/courses/:slug', async (req, res) => {
  const { slug } = parseInput(slugParams, req.params, req.i18n);
  const lookup = await findCourseBySlug(slug, req.locale, req.user);
  if (lookup.kind === 'moved') {
    res.redirect(301, `/courses/${lookup.slug}`);
    return;
  }
  if (lookup.kind === 'missing') throw notFound();
  await renderCourse(req, res, lookup.course, null);
});

/** One form creates or edits the user's review (FR-SITE-3); errors are shown next to the fields. */
catalogWebRouter.post('/courses/:slug/reviews', requireAuth, async (req, res) => {
  const { slug } = parseInput(slugParams, req.params, req.i18n);
  const course = await publishedCourse(req, slug);
  const form = validateForm(createReviewSchema, req.body, req.i18n);
  if (!form.ok) {
    const body = req.body as Record<string, unknown>;
    await renderCourse(req, res, course, { values: { rating: body.rating, text: body.text }, errors: form.errors });
    return;
  }
  const user = currentUser(req);
  const myReview = course.viewer?.myReview;
  try {
    if (myReview) await updateReview(user, myReview.id, form.data);
    else await createReview(user, course.id, form.data);
    setFlash(res, { kind: 'success', key: 'site.course.reviewForm.saved' });
  } catch (error) {
    if (!(error instanceof AppError) || error.code === 'INTERNAL') throw error;
    setFlash(res, { kind: 'error', key: error.messageKey, params: error.options.params });
  }
  res.redirect(303, `/courses/${slug}#reviews`);
});

catalogWebRouter.post('/courses/:slug/reviews/delete', requireAuth, async (req, res) => {
  const { slug } = parseInput(slugParams, req.params, req.i18n);
  const myReview = (await publishedCourse(req, slug)).viewer?.myReview;
  if (myReview) {
    await deleteReview(currentUser(req), myReview.id);
    setFlash(res, { kind: 'info', key: 'site.course.reviewForm.deleted' });
  }
  res.redirect(303, `/courses/${slug}#reviews`);
});

/** Guests log in first; the enrollment intent travels with them (contracts/ssr-routes.md). */
catalogWebRouter.post('/courses/:slug/enroll', async (req, res) => {
  const { slug } = parseInput(slugParams, req.params, req.i18n);
  if (!req.user) {
    const params = new URLSearchParams({ returnTo: `/courses/${slug}`, intent: 'enroll', course: slug });
    res.redirect(303, `/login?${params.toString()}`);
    return;
  }
  res.redirect(303, await enrollFromSite(res, req.user.id, slug));
});

catalogWebRouter.get('/courses/:slug/preview/:lessonId', async (req, res) => {
  const { slug, lessonId } = parseInput(previewParams, req.params, req.i18n);
  try {
    const lesson = await getPreviewLesson(slug, lessonId);
    await renderPage(
      res,
      'pages/preview',
      {
        slug,
        lesson,
        contentHtml: lesson.content ? renderMarkdown(lesson.content) : '',
        embedUrl: embedUrlFor(lesson.videoUrl, req.locale),
      },
      { title: lesson.title },
    );
  } catch (error) {
    if (!(error instanceof AppError) || error.code !== 'FORBIDDEN') throw error;
    setFlash(res, { kind: 'info', key: 'site.preview.enrollToOpen' });
    res.redirect(302, `/courses/${slug}`);
  }
});

catalogWebRouter.get('/instructors/:id', async (req, res) => {
  const { id } = parseInput(idParams, req.params, req.i18n);
  const profile = await getInstructorProfile(id, req.locale);
  await renderPage(
    res,
    'pages/instructor',
    { profile, bioHtml: profile.author.bio ? renderMarkdown(profile.author.bio) : '' },
    { title: profile.author.name },
  );
});
