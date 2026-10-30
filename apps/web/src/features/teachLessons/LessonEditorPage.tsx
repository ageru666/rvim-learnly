import { PageLoader } from '../../shared/components/PageLoader';
import { useParams } from 'react-router';
import { useT } from '../locale/useT';
import { QueryErrorState } from '../navigation/QueryErrorState';
import { LessonEditorForm } from './components/LessonEditorForm';
import { useGetLessonEditorQuery } from './teachLessonsApi';

/** FR-TEACH-4: `/app/teach/lessons/:id`. */
export function LessonEditorPage() {
  const i18n = useT();
  const { id = '' } = useParams();
  const { data: lesson, error, refetch } = useGetLessonEditorQuery(id);

  if (error) {
    return (
      <QueryErrorState
        error={error}
        onRetry={() => void refetch()}
        back={{ to: '/teach', label: i18n.t('app.teach.editor.backToCourses') }}
      />
    );
  }
  if (!lesson) return <PageLoader />;
  return <LessonEditorForm key={lesson.id} lesson={lesson} />;
}
