import { reviewSchema } from '@learnly/contracts/catalog';
import { idSchema, pageSchema } from '@learnly/contracts/common';
import {
  createReviewSchema,
  instructorReviewSchema,
  instructorReviewsQuerySchema,
  reviewReplySchema,
  updateReviewSchema,
} from '@learnly/contracts/reviews';
import { Router } from 'express';
import { z } from 'zod';
import { API_PREFIX } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { currentUser, requireAuth, requireRole } from '../../middlewares/requireRole.js';
import { registerRoute } from '../../openapi/registry.js';
import {
  createReview,
  deleteReview,
  listInstructorReviews,
  replyToReview,
  updateReview,
} from './reviews.service.js';

const TAG = 'Reviews';
const idParams = z.object({ id: idSchema });

export const reviewsApiRouter = Router();

registerRoute({
  method: 'post',
  path: `${API_PREFIX}/courses/:id/reviews`,
  tag: TAG,
  summary: 'Review a course (BR-R1, BR-R2, BR-U4)',
  access: 'user',
  params: idParams,
  body: createReviewSchema,
  responses: { 201: { description: 'Review', schema: reviewSchema }, 409: { description: 'Already reviewed' } },
});
reviewsApiRouter.post(`${API_PREFIX}/courses/:id/reviews`, requireAuth, async (req, res) => {
  const { id } = parseInput(idParams, req.params, req.i18n);
  const input = parseInput(createReviewSchema, req.body, req.i18n);
  res.status(201).json(await createReview(currentUser(req), id, input));
});

registerRoute({
  method: 'patch',
  path: `${API_PREFIX}/reviews/:id`,
  tag: TAG,
  summary: 'Edit my review',
  access: 'user',
  params: idParams,
  body: updateReviewSchema,
  responses: { 200: { description: 'Review', schema: reviewSchema } },
});
reviewsApiRouter.patch(`${API_PREFIX}/reviews/:id`, requireAuth, async (req, res) => {
  const { id } = parseInput(idParams, req.params, req.i18n);
  res.json(await updateReview(currentUser(req), id, parseInput(updateReviewSchema, req.body, req.i18n)));
});

registerRoute({
  method: 'delete',
  path: `${API_PREFIX}/reviews/:id`,
  tag: TAG,
  summary: 'Delete my review',
  access: 'user',
  params: idParams,
  responses: { 204: { description: 'Deleted' } },
});
reviewsApiRouter.delete(`${API_PREFIX}/reviews/:id`, requireAuth, async (req, res) => {
  const { id } = parseInput(idParams, req.params, req.i18n);
  await deleteReview(currentUser(req), id);
  res.status(204).end();
});

registerRoute({
  method: 'put',
  path: `${API_PREFIX}/reviews/:id/reply`,
  tag: TAG,
  summary: 'Reply to a review of my course (or edit the reply)',
  access: 'user',
  params: idParams,
  body: reviewReplySchema,
  responses: { 200: { description: 'Review', schema: reviewSchema } },
});
reviewsApiRouter.put(`${API_PREFIX}/reviews/:id/reply`, requireAuth, async (req, res) => {
  const { id } = parseInput(idParams, req.params, req.i18n);
  const { text } = parseInput(reviewReplySchema, req.body, req.i18n);
  res.json(await replyToReview(currentUser(req), id, text));
});

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/instructor/reviews`,
  tag: TAG,
  summary: 'Reviews of my courses',
  access: 'user',
  query: instructorReviewsQuerySchema,
  responses: { 200: { description: 'A page of reviews', schema: pageSchema(instructorReviewSchema) } },
});
reviewsApiRouter.get(`${API_PREFIX}/instructor/reviews`, requireRole('instructor', 'admin'), async (req, res) => {
  const query = parseInput(instructorReviewsQuerySchema, req.query, req.i18n);
  res.json(await listInstructorReviews(currentUser(req), query));
});
