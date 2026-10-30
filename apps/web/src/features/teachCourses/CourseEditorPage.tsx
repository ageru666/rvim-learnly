import { ArrowLeft, BarChart3, ExternalLink, Users } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import { Alert } from '../../shared/components/Alert';
import { buttonClass } from '../../shared/components/buttonClass';
import { PageLoader } from '../../shared/components/PageLoader';
import { Tabs } from '../../shared/components/Tabs';
import { config } from '../../shared/config';
import { useT } from '../locale/useT';
import { QueryErrorState } from '../navigation/QueryErrorState';
import { CurriculumEditor } from '../teachCurriculum/CurriculumEditor';
import { BasicTab } from './components/BasicTab';
import { PublishTab } from './components/PublishTab';
import { useGetCourseEditorQuery } from './teachCoursesApi';
import { editorTabChanged, selectEditorTab, type EditorTab } from './teachCoursesSlice';

const TABS: EditorTab[] = ['basics', 'curriculum', 'publish'];

function isEditorTab(value: string): value is EditorTab {
  return (TABS as string[]).includes(value);
}

/** FR-TEACH-3: `/app/teach/courses/:id` with the Basics, Curriculum and Publishing tabs. */
export function CourseEditorPage() {
  const i18n = useT();
  const { t } = i18n;
  const dispatch = useDispatch();
  const tab = useSelector(selectEditorTab);
  const { id = '' } = useParams();
  const { data: course, error, refetch } = useGetCourseEditorQuery(id);

  if (error) {
    return (
      <QueryErrorState error={error} onRetry={() => void refetch()} back={{ to: '/teach', label: t('app.teach.editor.backToCourses') }} />
    );
  }
  if (!course) return <PageLoader />;

  const readOnlyReason =
    course.status === 'pending_review' ? t('app.teach.publish.inReviewHint') : course.status === 'archived' ? t('errors.courses.archived') : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/teach" className={buttonClass('ghost', 'sm')}>
          <ArrowLeft aria-hidden size={16} />
          {t('app.teach.editor.backToCourses')}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link to={`/teach/courses/${course.id}/students`} className={buttonClass('outline', 'sm')}>
            <Users aria-hidden size={14} />
            {t('app.teach.editor.students')}
          </Link>
          <Link to={`/teach/courses/${course.id}/stats`} className={buttonClass('outline', 'sm')}>
            <BarChart3 aria-hidden size={14} />
            {t('app.teach.editor.stats')}
          </Link>
          {course.status === 'published' && (
            <a href={`${config.siteUrl}courses/${course.slug}`} className={buttonClass('outline', 'sm')}>
              <ExternalLink aria-hidden size={14} />
              {t('app.teach.editor.viewOnSite')}
            </a>
          )}
        </div>
      </div>
      <h1 className="heading-xl" lang={course.language}>
        {course.title}
      </h1>
      {readOnlyReason && <Alert kind="info">{t('app.teach.editor.readOnly', { reason: readOnlyReason })}</Alert>}
      <Tabs
        label={t('app.teach.editor.tabsLabel')}
        value={tab}
        onValueChange={(value) => {
          if (isEditorTab(value)) dispatch(editorTabChanged(value));
        }}
        tabs={[
          { value: 'basics', label: t('app.teach.editor.basics'), content: <BasicTab course={course} /> },
          { value: 'curriculum', label: t('app.teach.editor.curriculum'), content: <CurriculumEditor course={course} /> },
          { value: 'publish', label: t('app.teach.editor.publish'), content: <PublishTab course={course} /> },
        ]}
      />
    </div>
  );
}
