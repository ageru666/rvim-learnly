import { MessageSquare } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { isApiError } from '../../shared/api/apiError';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { FormField } from '../../shared/components/FormField';
import { Select } from '../../shared/components/Select';
import { Skeleton } from '../../shared/components/Skeleton';
import { VirtualList } from '../../shared/components/VirtualList';
import { describeError } from '../../shared/utils/describeError';
import { useT } from '../locale/useT';
import { ReplyDialog } from './components/ReplyDialog';
import { ReviewItem } from './components/ReviewItem';
import { useGetInstructorReviewsInfiniteQuery } from './reviewsApi';
import { courseFilterChanged, replyDialogToggled, selectCourseFilter, selectReplyingTo } from './reviewsSlice';
import { coursesOf } from './utils';

const ALL = 'all';
const ESTIMATED_ROW_HEIGHT = 200;

/** `/app/teach/reviews`: reviews of the author's courses with replies. */
export function TeachReviewsPage() {
  const i18n = useT();
  const { t } = i18n;
  const dispatch = useDispatch();
  const courseId = useSelector(selectCourseFilter);
  const replyingTo = useSelector(selectReplyingTo);
  const all = useGetInstructorReviewsInfiniteQuery({ courseId: null });
  const filtered = useGetInstructorReviewsInfiniteQuery({ courseId }, { skip: courseId === null });
  const query = courseId === null ? all : filtered;
  const reviews = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const courses = coursesOf(all.data?.pages.flatMap((page) => page.items) ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="heading-xl">{t('app.teachReviews.title')}</h1>
        {courses.length > 1 && (
          <div className="w-full sm:w-72">
            <FormField label={t('app.teachReviews.filter')}>
              {(control) => (
                <Select
                  {...control}
                  value={courseId ?? ALL}
                  onValueChange={(value) => dispatch(courseFilterChanged(value === ALL ? null : value))}
                  options={[
                    { value: ALL, label: t('app.teachReviews.allCourses') },
                    ...courses.map((course) => ({ value: course.id, label: course.title })),
                  ]}
                />
              )}
            </FormField>
          </div>
        )}
      </div>
      {query.isLoading && <Skeleton className="h-48" />}
      {query.error && (
        <ErrorState
          message={describeError(query.error, i18n)}
          retryable={isApiError(query.error) && query.error.retryable}
          onRetry={() => void query.refetch()}
          retryLabel={t('common.actions.retry')}
        />
      )}
      {query.data && reviews.length === 0 && (
        <EmptyState icon={<MessageSquare aria-hidden size={40} />} title={t('app.teachReviews.empty')} />
      )}
      {reviews.length > 0 && (
        <VirtualList
          items={reviews}
          itemKey={(review) => review.id}
          renderItem={(review) => <ReviewItem review={review} onReply={() => dispatch(replyDialogToggled(review.id))} />}
          estimateSize={ESTIMATED_ROW_HEIGHT}
          label={t('app.teachReviews.listLabel')}
          total={total}
          hasMore={query.hasNextPage}
          isFetchingMore={query.isFetchingNextPage}
          onEndReached={() => void query.fetchNextPage()}
        />
      )}
      <ReplyDialog review={reviews.find((review) => review.id === replyingTo) ?? null} />
    </div>
  );
}
