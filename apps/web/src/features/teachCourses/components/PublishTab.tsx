import type { CourseEditor } from '@learnly/contracts/instructor';
import { CircleCheck, CircleX } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { isApiError } from '../../../shared/api/apiError';
import { Alert } from '../../../shared/components/Alert';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ErrorState } from '../../../shared/components/ErrorState';
import { Skeleton } from '../../../shared/components/Skeleton';
import { describeError } from '../../../shared/utils/describeError';
import { useT } from '../../locale/useT';
import { useCourseActionMutation, useDeleteCourseMutation, useGetReadinessQuery, type CourseAction } from '../teachCoursesApi';
import { deleteConfirmToggled, selectDeleteConfirmOpen } from '../teachCoursesSlice';
import { statusTone } from '../utils';

/** Which lifecycle buttons a status offers (BR-P2, BR-P4); moderation itself is US9. */
const ACTIONS: Record<CourseEditor['status'], CourseAction[]> = {
  draft: ['submit'],
  pending_review: ['withdraw'],
  published: ['archive'],
  archived: ['restore'],
};

export function PublishTab({ course }: { course: CourseEditor }) {
  const i18n = useT();
  const { t, translate } = i18n;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const deleteOpen = useSelector(selectDeleteConfirmOpen);
  const { data: readiness, error: readinessError, refetch: refetchReadiness } = useGetReadinessQuery(course.id);
  const [runAction, { isLoading, error }] = useCourseActionMutation();
  const [deleteCourse, deleteState] = useDeleteCourseMutation();
  const isDraft = course.status === 'draft';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-muted">{t('app.teach.publish.status')}</span>
        <Badge tone={statusTone(course.status)}>{translate(`enums.courseStatus.${course.status}`)}</Badge>
      </div>
      {course.status === 'pending_review' && <Alert kind="info">{t('app.teach.publish.inReviewHint')}</Alert>}
      {course.moderationComment && (
        <Alert kind="warning" title={t('app.teach.publish.moderationComment')}>
          {course.moderationComment}
        </Alert>
      )}
      {isDraft && !readiness && !readinessError && <Skeleton className="h-32" />}
      {isDraft && readinessError && (
        <ErrorState
          message={describeError(readinessError, i18n)}
          retryable={isApiError(readinessError) && readinessError.retryable}
          onRetry={() => void refetchReadiness()}
          retryLabel={t('common.actions.retry')}
        />
      )}
      {readiness && isDraft && (
        <section aria-labelledby="readiness-heading" className="flex flex-col gap-2">
          <h2 id="readiness-heading" className="heading-md">
            {t('app.teach.publish.checklist')}
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {readiness.items.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                {item.ok ? (
                  <CircleCheck aria-hidden size={16} className="text-success" />
                ) : (
                  <CircleX aria-hidden size={16} className="text-danger" />
                )}
                <span>{translate(`readiness.${item.key}`)}</span>
                <span className="sr-only">{item.ok ? t('app.teach.publish.ready') : t('app.teach.publish.notReady')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {error && <Alert kind="error">{describeError(error, i18n)}</Alert>}
      <div className="flex flex-wrap gap-2">
        {ACTIONS[course.status].map((action) => (
          <Button
            key={action}
            variant={action === 'submit' ? 'primary' : 'outline'}
            loading={isLoading}
            disabled={action === 'submit' && readiness?.ready !== true}
            onClick={() => void runAction({ id: course.id, action })}
          >
            {t(`app.teach.publish.${action}`)}
          </Button>
        ))}
        {isDraft && (
          <Button variant="danger" onClick={() => dispatch(deleteConfirmToggled(true))}>
            {t('app.teach.publish.delete')}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          dispatch(deleteConfirmToggled(open));
          if (!open) deleteState.reset();
        }}
        title={t('app.teach.publish.deleteTitle', { title: course.title })}
        description={t('app.teach.publish.deleteText')}
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
        pending={deleteState.isLoading}
        error={deleteState.error ? describeError(deleteState.error, i18n) : null}
        onConfirm={() =>
          void deleteCourse(course.id).then((result) => {
            if (result.error) return;
            dispatch(deleteConfirmToggled(false));
            void navigate('/teach');
          })
        }
      />
    </div>
  );
}
