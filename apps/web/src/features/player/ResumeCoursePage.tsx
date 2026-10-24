import { Navigate, useParams } from 'react-router';
import { isApiError } from '../../shared/api/apiError';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { PageLoader } from '../../shared/components/PageLoader';
import { describeError } from '../../shared/utils/describeError';
import { useT } from '../locale/useT';
import { useGetLearnCourseQuery } from './playerApi';
import { resumeLessonId } from './utils';

/** `/app/learn/:courseId`: opens the last lesson of the course, or the first one. */
export function ResumeCoursePage() {
  const i18n = useT();
  const { courseId = '' } = useParams();
  const { data: course, error, refetch } = useGetLearnCourseQuery(courseId);

  if (error) {
    return (
      <main id="main" className="page-container py-8">
        <ErrorState
          message={describeError(error, i18n)}
          retryable={isApiError(error) && error.retryable}
          onRetry={() => void refetch()}
          retryLabel={i18n.t('common.actions.retry')}
        />
      </main>
    );
  }
  if (!course) return <PageLoader />;
  const lessonId = resumeLessonId(course);
  if (!lessonId) {
    return (
      <main id="main" className="page-container py-8">
        <EmptyState icon={null} title={i18n.t('app.player.noLessons')} />
      </main>
    );
  }
  return <Navigate to={`/learn/${courseId}/${lessonId}`} replace />;
}
