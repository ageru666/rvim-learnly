import { isApiError } from '../../shared/api/apiError';
import { ErrorState } from '../../shared/components/ErrorState';
import { PageLoader } from '../../shared/components/PageLoader';
import { describeError } from '../../shared/utils/describeError';
import { useParams } from 'react-router';
import { useT } from '../locale/useT';
import { LessonEditorForm } from './components/LessonEditorForm';
import { useGetLessonEditorQuery } from './teachLessonsApi';

/** FR-TEACH-4: `/app/teach/lessons/:id`. */
export function LessonEditorPage() {
  const i18n = useT();
  const { id = '' } = useParams();
  const { data: lesson, error, refetch } = useGetLessonEditorQuery(id);

  if (error) {
    return (
      <ErrorState
        message={describeError(error, i18n)}
        retryable={isApiError(error) && error.retryable}
        onRetry={() => void refetch()}
        retryLabel={i18n.t('common.actions.retry')}
      />
    );
  }
  if (!lesson) return <PageLoader />;
  return <LessonEditorForm key={lesson.id} lesson={lesson} />;
}
