import { COURSE_STATUSES, courseStatusSchema } from '@learnly/contracts/enums';
import { GraduationCap, Plus } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { isApiError } from '../../shared/api/apiError';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { FormField } from '../../shared/components/FormField';
import { Select } from '../../shared/components/Select';
import { Skeleton } from '../../shared/components/Skeleton';
import { describeError } from '../../shared/utils/describeError';
import { useT } from '../locale/useT';
import { CreateCourseDialog } from './components/CreateCourseDialog';
import { OverviewCards } from './components/OverviewCards';
import { TeachCourseList } from './components/TeachCourseList';
import { useGetTeachCoursesQuery, useGetTeachOverviewQuery } from './teachCoursesApi';
import { createDialogToggled, selectStatusFilter, statusFilterChanged } from './teachCoursesSlice';

const ALL = 'all';

/** FR-TEACH-1: `/app/teach`. */
export function TeachDashboardPage() {
  const i18n = useT();
  const { t, translate } = i18n;
  const dispatch = useDispatch();
  const status = useSelector(selectStatusFilter);
  const { data: overview } = useGetTeachOverviewQuery();
  const { data: courses, isLoading, error, refetch } = useGetTeachCoursesQuery(status);
  const hasAny = overview ? Object.values(overview.byStatus).some((count) => count > 0) : true;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="heading-xl">{t('app.teach.title')}</h1>
        <Button variant="primary" onClick={() => dispatch(createDialogToggled(true))}>
          <Plus aria-hidden size={16} />
          {t('app.teach.create')}
        </Button>
      </div>
      {overview && <OverviewCards overview={overview} />}
      <div className="w-full sm:w-64">
        <FormField label={t('app.teach.statusFilter')}>
          {(field) => (
            <Select
              {...field}
              value={status ?? ALL}
              onValueChange={(value) => {
                const parsed = courseStatusSchema.safeParse(value);
                dispatch(statusFilterChanged(parsed.success ? parsed.data : null));
              }}
              options={[
                { value: ALL, label: t('app.teach.allStatuses') },
                ...COURSE_STATUSES.map((item) => ({ value: item, label: translate(`enums.courseStatus.${item}`) })),
              ]}
            />
          )}
        </FormField>
      </div>
      {isLoading && <Skeleton className="h-40" />}
      {error && (
        <ErrorState
          message={describeError(error, i18n)}
          retryable={isApiError(error) && error.retryable}
          onRetry={() => void refetch()}
          retryLabel={t('common.actions.retry')}
        />
      )}
      {courses && courses.length === 0 && (
        <EmptyState icon={<GraduationCap aria-hidden size={40} />} title={hasAny ? t('app.teach.noMatches') : t('app.teach.empty')} />
      )}
      {courses && courses.length > 0 && <TeachCourseList courses={courses} />}
      <CreateCourseDialog />
    </div>
  );
}
