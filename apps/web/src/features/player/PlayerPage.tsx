import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { isApiError } from '../../shared/api/apiError';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { PageLoader } from '../../shared/components/PageLoader';
import { describeError } from '../../shared/utils/describeError';
import { useT } from '../locale/useT';
import { notesPanelResized, selectUiLayout } from '../navigation/navigationSlice';
import { NotesPanel } from '../notes/NotesPanel';
import { CurriculumDrawer } from './components/CurriculumDrawer';
import { CurriculumSidebar } from './components/CurriculumSidebar';
import { LessonFooter } from './components/LessonFooter';
import { LessonView } from './components/LessonView';
import { PlayerHeader } from './components/PlayerHeader';
import { PreviewBanner } from './components/PreviewBanner';
import { useGetLearnCourseQuery, useGetLessonQuery } from './playerApi';
import { selectNotesOpen } from './playerSlice';

const MIN_NOTES_WIDTH = 260;
const MAX_NOTES_WIDTH = 560;

/** FR-LEARN-4: `/app/learn/:courseId/:lessonId`. */
export function PlayerPage() {
  const i18n = useT();
  const { courseId = '', lessonId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const notesOpen = useSelector(selectNotesOpen);
  const { notesPanelWidth } = useSelector(selectUiLayout);
  const courseQuery = useGetLearnCourseQuery(courseId);
  const lessonQuery = useGetLessonQuery(lessonId);
  const course = courseQuery.data;
  const lesson = lessonQuery.data;
  const error = courseQuery.error ?? lessonQuery.error;

  if (error) {
    return (
      <main id="main" className="page-container py-8">
        <ErrorState
          message={describeError(error, i18n)}
          retryable={isApiError(error) && error.retryable}
          onRetry={() => void (courseQuery.error ? courseQuery.refetch() : lessonQuery.refetch())}
          retryLabel={i18n.t('common.actions.retry')}
        />
      </main>
    );
  }
  if (!course || !lesson) return <PageLoader />;

  return (
    <div className="flex h-screen flex-col">
      <PlayerHeader course={course} />
      <div className="flex min-h-0 flex-1">
        <CurriculumSidebar course={course} currentLessonId={lesson.id} />
        <CurriculumDrawer course={course} currentLessonId={lesson.id} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
            {course.mode === 'preview' && <PreviewBanner />}
            {lesson.courseId === course.course.id ? (
              <>
                <LessonView
                  lesson={lesson}
                  language={course.course.language}
                  onCourseCompleted={
                    course.status === 'completed' ? undefined : () => void navigate(`/learn/${courseId}/completed`)
                  }
                />
                <LessonFooter course={course} lesson={lesson} />
              </>
            ) : (
              <EmptyState icon={null} title={i18n.t('app.player.lessonMissing')} />
            )}
          </div>
        </main>
        {notesOpen && (
          <aside className="hidden shrink-0 flex-col gap-3 overflow-y-auto border-l border-border p-4 md:flex" style={{ width: notesPanelWidth }}>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {i18n.t('app.notes.width')}
              <input
                type="range"
                min={MIN_NOTES_WIDTH}
                max={MAX_NOTES_WIDTH}
                step={20}
                value={notesPanelWidth}
                onChange={(event) => dispatch(notesPanelResized(Number(event.target.value)))}
              />
            </label>
            <NotesPanel course={course} lessonId={lesson.id} />
          </aside>
        )}
      </div>
    </div>
  );
}
