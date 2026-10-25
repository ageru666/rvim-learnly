import type { ReviewDto } from '@learnly/contracts/catalog';
import type { Prisma } from '../../generated/prisma/client.js';

export const reviewInclude = {
  user: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.ReviewInclude;

export type ReviewWithUser = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

export function toReviewDto(review: ReviewWithUser): ReviewDto {
  return {
    id: review.id,
    user: review.user,
    rating: review.rating,
    text: review.text,
    hidden: review.status === 'hidden',
    authorReply: review.authorReply,
    authorRepliedAt: review.authorRepliedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
