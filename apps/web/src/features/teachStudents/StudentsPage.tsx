import { STUDENT_SORTS, studentSortSchema, type StudentRow } from '@learnly/contracts/instructor';
import { ArrowLeft, Download, Users } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import { isApiError } from '../../shared/api/apiError';
import { Avatar } from '../../shared/components/Avatar';
import { buttonClass } from '../../shared/components/buttonClass';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { FormField } from '../../shared/components/FormField';
import { Input } from '../../shared/components/Input';
import { ProgressBar } from '../../shared/components/ProgressBar';
import { Select } from '../../shared/components/Select';
import { Skeleton } from '../../shared/components/Skeleton';
import type { TableColumn } from '../../shared/components/Table';
import { VirtualTable } from '../../shared/components/VirtualTable';
import { config } from '../../shared/config';
import { describeError } from '../../shared/utils/describeError';
import { selectLocale } from '../locale/localeSlice';
import { useFormat } from '../locale/useFormat';
import { useT } from '../locale/useT';
import { QuizResults } from './components/QuizResults';
import { ResetAttemptsDialog } from './components/ResetAttemptsDialog';
import { useGetCourseStudentsInfiniteQuery } from './teachStudentsApi';
import { selectStudentSearch, selectStudentSort, studentSearchChanged, studentSortChanged } from './teachStudentsSlice';
import { csvHref } from './utils';

const ROW_HEIGHT = 88;

/** FR-TEACH-5: `/app/teach/courses/:id/students`. */
export function StudentsPage() {
  const i18n = useT();
  const { t, translate } = i18n;
  const format = useFormat();
  const dispatch = useDispatch();
  const { id: courseId = '' } = useParams();
  const search = useSelector(selectStudentSearch);
  const sort = useSelector(selectStudentSort);
  const locale = useSelector(selectLocale);
  const query = useGetCourseStudentsInfiniteQuery({ courseId, search: search.trim(), sort });
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  const columns: TableColumn<StudentRow>[] = [
    {
      key: 'name',
      header: t('app.students.name'),
      render: (row) => (
        <span className="flex items-center gap-2">
          <Avatar name={row.name} src={row.avatarUrl} />
          {row.name}
        </span>
      ),
    },
    { key: 'enrolledAt', header: t('app.students.enrolledAt'), render: (row) => format.date(row.enrolledAt) },
    {
      key: 'progress',
      header: t('app.students.progress'),
      className: 'min-w-36',
      render: (row) => <ProgressBar value={row.progress} label={format.percent(row.progress)} showLabel />,
    },
    { key: 'lastActivity', header: t('app.students.lastActivity'), render: (row) => format.date(row.lastActivityAt, 'dateTime') },
    { key: 'status', header: t('app.students.status'), render: (row) => translate(`enums.enrollmentStatus.${row.status}`) },
    { key: 'quizzes', header: t('app.students.quizzes'), render: (row) => <QuizResults student={row} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/teach/courses/${courseId}`} className={`${buttonClass('ghost', 'sm')} self-start`}>
        <ArrowLeft aria-hidden size={16} />
        {t('app.students.back')}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="heading-xl">{t('app.students.title')}</h1>
        <a href={csvHref(config.apiBaseUrl, courseId, { search, sort, locale })} className={buttonClass('outline')} download>
          <Download aria-hidden size={16} />
          {t('app.students.exportCsv')}
        </a>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
        <FormField label={t('app.students.search')}>
          {(field) => <Input {...field} type="search" value={search} onChange={(event) => dispatch(studentSearchChanged(event.target.value))} />}
        </FormField>
        <FormField label={t('app.students.sort')}>
          {(field) => (
            <Select
              {...field}
              value={sort}
              onValueChange={(value) => dispatch(studentSortChanged(studentSortSchema.parse(value)))}
              options={STUDENT_SORTS.map((option) => ({ value: option, label: t(`app.students.sorts.${option}`) }))}
            />
          )}
        </FormField>
      </div>
      {query.isLoading && <Skeleton className="h-64" />}
      {query.error && (
        <ErrorState
          message={describeError(query.error, i18n)}
          retryable={isApiError(query.error) && query.error.retryable}
          onRetry={() => void query.refetch()}
          retryLabel={t('common.actions.retry')}
        />
      )}
      {query.data && rows.length === 0 && (
        <EmptyState icon={<Users aria-hidden size={40} />} title={search.trim() ? t('app.students.noMatches') : t('app.students.empty')} />
      )}
      {rows.length > 0 && (
        <VirtualTable
          caption={t('app.students.tableCaption')}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.userId}
          rowHeight={ROW_HEIGHT}
          total={total}
          hasMore={query.hasNextPage}
          isFetchingMore={query.isFetchingNextPage}
          onEndReached={() => void query.fetchNextPage()}
        />
      )}
      <ResetAttemptsDialog courseId={courseId} />
    </div>
  );
}
