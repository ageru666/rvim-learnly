import { z } from 'zod';
import { MAX_RATING, MIN_RATING, reviewSchema } from './catalog.js';
import { idSchema, pageQuerySchema } from './common.js';
import { LIMITS } from './limits.js';

/** Coerced, so the same schema validates the JSON API and the SSR form. */
export const ratingInputSchema = z.coerce.number().int().min(MIN_RATING).max(MAX_RATING);
export const reviewTextSchema = z.string().trim().min(LIMITS.reviewText.min).max(LIMITS.reviewText.max);

export const createReviewSchema = z.object({ rating: ratingInputSchema, text: reviewTextSchema });
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = createReviewSchema.partial();
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const reviewReplySchema = z.object({ text: z.string().trim().min(1).max(LIMITS.reviewReply.max) });

export const instructorReviewsQuerySchema = pageQuerySchema.extend({ courseId: idSchema.optional() });
export type InstructorReviewsQuery = z.infer<typeof instructorReviewsQuerySchema>;

export const instructorReviewSchema = reviewSchema.extend({
  course: z.object({ id: idSchema, title: z.string() }),
});
export type InstructorReview = z.infer<typeof instructorReviewSchema>;
