import { reviewSchema, type ReviewDto } from '@learnly/contracts/catalog';
import { pageSchema, type Page } from '@learnly/contracts/common';
import { instructorReviewSchema, type InstructorReview } from '@learnly/contracts/reviews';
import { baseApi } from '../../shared/api/baseApi';

const PAGE_SIZE = 20;
const reviewsPageSchema = pageSchema(instructorReviewSchema);

export interface InstructorReviewsFilter {
  courseId: string | null;
}

export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Read page by page as the virtual list scrolls (guideline §4.2). */
    getInstructorReviews: build.infiniteQuery<Page<InstructorReview>, InstructorReviewsFilter, number>({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
          lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: '/instructor/reviews',
        params: { page: pageParam, limit: PAGE_SIZE, ...(queryArg.courseId ? { courseId: queryArg.courseId } : {}) },
      }),
      transformResponse: (response: unknown) => reviewsPageSchema.parse(response),
      providesTags: ['InstructorReviews'],
    }),
    replyToReview: build.mutation<ReviewDto, { reviewId: string; text: string }>({
      query: ({ reviewId, text }) => ({ url: `/reviews/${reviewId}/reply`, method: 'PUT', body: { text } }),
      transformResponse: (response: unknown) => reviewSchema.parse(response),
      invalidatesTags: ['InstructorReviews'],
    }),
  }),
});

export const { useGetInstructorReviewsInfiniteQuery, useReplyToReviewMutation } = reviewsApi;
