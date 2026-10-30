import { Navigate, useParams } from 'react-router';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageLoader } from '../../shared/components/PageLoader';
import { useT } from '../locale/useT';
import { QueryErrorState } from '../navigation/QueryErrorState';
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
        <QueryErrorState error={error} onRetry={() => void refetch()} back={{ to: '/courses', label: i18n.t('site.header.myCourses') }} />
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
