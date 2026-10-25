import type { InstructorReview } from '@learnly/contracts/reviews';

/** Courses that appear among the loaded reviews, for the filter; in the order they first appear. */
export function coursesOf(reviews: readonly InstructorReview[]): { id: string; title: string }[] {
  const seen = new Map<string, string>();
  for (const review of reviews) if (!seen.has(review.course.id)) seen.set(review.course.id, review.course.title);
  return [...seen].map(([id, title]) => ({ id, title }));
}
