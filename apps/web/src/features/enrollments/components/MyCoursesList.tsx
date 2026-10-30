import type { EnrollmentStatus } from '@learnly/contracts/enums';
import { BookOpen } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { buttonClass } from '../../../shared/components/buttonClass';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Skeleton } from '../../../shared/components/Skeleton';
import { config } from '../../../shared/config';
import { useT } from '../../locale/useT';
import { QueryErrorState } from '../../navigation/QueryErrorState';
import { useGetMyCoursesQuery } from '../enrollmentsApi';
import { leaveRequested, selectMyCoursesSearch } from '../enrollmentsSlice';
import { filterByTitle, sortByLastActivity } from '../utils';
import { MyCourseCard } from './MyCourseCard';

interface MyCoursesListProps {
  status: EnrollmentStatus;
}

const SKELETON_ROWS = 3;

export function MyCoursesList({ status }: MyCoursesListProps) {
  const i18n = useT();
  const dispatch = useDispatch();
  const search = useSelector(selectMyCoursesSearch);
  const { data, isLoading, error, refetch } = useGetMyCoursesQuery(status);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} className="h-36" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <QueryErrorState error={error} onRetry={() => void refetch()} />
    );
  }

  const all = data?.items ?? [];
  const courses = sortByLastActivity(filterByTitle(all, search));
  if (all.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen aria-hidden size={40} />}
        title={status === 'active' ? i18n.t('app.myCourses.emptyActive') : i18n.t('app.myCourses.emptyCompleted')}
        action={
          <a href={`${config.siteUrl}courses`} className={buttonClass('primary')}>
            {i18n.t('app.dashboard.browseCatalog')}
          </a>
        }
      />
    );
  }
  if (courses.length === 0) {
    return <p className="text-text-muted">{i18n.t('app.myCourses.noMatches', { search })}</p>;
  }
  return (
    <ul className="flex flex-col gap-4">
      {courses.map((item) => (
        <li key={item.enrollmentId}>
          <MyCourseCard
            item={item}
            onLeave={
              item.status === 'active'
                ? () => dispatch(leaveRequested({ courseId: item.course.id, title: item.course.title }))
                : undefined
            }
          />
        </li>
      ))}
    </ul>
  );
}
