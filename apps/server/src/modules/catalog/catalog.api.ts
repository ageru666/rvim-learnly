import {
  catalogQuerySchema,
  categorySchema,
  courseCardSchema,
  courseDetailSchema,
  instructorProfileSchema,
  lessonPreviewSchema,
  publicStatsSchema,
  reviewSchema,
  reviewsQuerySchema,
} from '@learnly/contracts/catalog';
import { idSchema, pageSchema } from '@learnly/contracts/common';
import { Router } from 'express';
import { z } from 'zod';
import { notFound } from '../../lib/errors.js';
import { API_PREFIX } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { registerRoute } from '../../openapi/registry.js';
import {
  findCourseBySlug,
  getInstructorProfile,
  getPreviewLesson,
  getPublicStats,
  listCategories,
  listCourses,
  listReviews,
} from './catalog.service.js';

const TAG = 'Catalog';
const slugParams = z.object({ slug: z.string() });
const previewParams = slugParams.extend({ lessonId: idSchema });
const idParams = z.object({ id: idSchema });

export const catalogApiRouter = Router();

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/categories`,
  tag: TAG,
  summary: 'Categories with published course counts',
  access: 'public',
  responses: { 200: { description: 'Categories', schema: z.array(categorySchema) } },
});
catalogApiRouter.get(`${API_PREFIX}/categories`, async (req, res) => {
  res.json(await listCategories(req.locale));
});

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/courses`,
  tag: TAG,
  summary: 'Catalog of published courses with search, filters and sorting',
  access: 'public',
  query: catalogQuerySchema,
  responses: { 200: { description: 'A page of course cards', schema: pageSchema(courseCardSchema) } },
});
catalogApiRouter.get(`${API_PREFIX}/courses`, async (req, res) => {
  const query = parseInput(catalogQuerySchema, req.query, req.i18n);
  res.json(await listCourses(query, req.locale));
});

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/courses/:slug`,
  tag: TAG,
  summary: 'Course details and curriculum; old slugs answer 301',
  access: 'public',
  params: slugParams,
  responses: {
    200: { description: 'Course', schema: courseDetailSchema },
    301: { description: 'The course moved to a new slug' },
    404: { description: 'Not published or unknown' },
  },
});
catalogApiRouter.get(`${API_PREFIX}/courses/:slug`, async (req, res) => {
  const { slug } = parseInput(slugParams, req.params, req.i18n);
  const lookup = await findCourseBySlug(slug, req.locale, req.user);
  switch (lookup.kind) {
    case 'found':
      res.json(lookup.course);
      return;
    case 'moved':
      res.redirect(301, `${API_PREFIX}/courses/${lookup.slug}`);
      return;
    case 'missing':
      throw notFound();
    default:
      throw new Error(`Unexpected lookup: ${JSON.stringify(lookup satisfies never)}`);
  }
});

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/courses/:slug/reviews`,
  tag: TAG,
  summary: 'Visible reviews of a published course',
  access: 'public',
  params: slugParams,
  query: reviewsQuerySchema,
  responses: { 200: { description: 'A page of reviews', schema: pageSchema(reviewSchema) } },
});
catalogApiRouter.get(`${API_PREFIX}/courses/:slug/reviews`, async (req, res) => {
  const { slug } = parseInput(slugParams, req.params, req.i18n);
  res.json(await listReviews(slug, parseInput(reviewsQuerySchema, req.query, req.i18n)));
});

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/courses/:slug/preview/:lessonId`,
  tag: TAG,
  summary: 'Content of a preview lesson (403 for other lessons)',
  access: 'public',
  params: previewParams,
  responses: { 200: { description: 'Lesson', schema: lessonPreviewSchema } },
});
catalogApiRouter.get(`${API_PREFIX}/courses/:slug/preview/:lessonId`, async (req, res) => {
  const { slug, lessonId } = parseInput(previewParams, req.params, req.i18n);
  res.json(await getPreviewLesson(slug, lessonId));
});

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/instructors/:id`,
  tag: TAG,
  summary: 'Public author profile and published courses',
  access: 'public',
  params: idParams,
  responses: { 200: { description: 'Author', schema: instructorProfileSchema } },
});
catalogApiRouter.get(`${API_PREFIX}/instructors/:id`, async (req, res) => {
  const { id } = parseInput(idParams, req.params, req.i18n);
  res.json(await getInstructorProfile(id, req.locale));
});

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/stats/public`,
  tag: TAG,
  summary: 'Counters for the home page',
  access: 'public',
  responses: { 200: { description: 'Counters', schema: publicStatsSchema } },
});
catalogApiRouter.get(`${API_PREFIX}/stats/public`, async (_req, res) => {
  res.json(await getPublicStats());
});
