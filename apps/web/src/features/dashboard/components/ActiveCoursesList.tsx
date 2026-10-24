import type { MyCourse } from '@learnly/contracts/learning';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClass } from '../../../shared/components/buttonClass';
import { Card } from '../../../shared/components/Card';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ProgressBar } from '../../../shared/components/ProgressBar';
import { config } from '../../../shared/config';
import { continuePath } from '../../enrollments/utils';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';

interface ActiveCoursesListProps {
  courses: MyCourse[];
}

export function ActiveCoursesList({ courses }: ActiveCoursesListProps) {
  const { t } = useT();
  const format = useFormat();

  return (
    <section className="flex flex-col gap-4" aria-labelledby="active-courses-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="active-courses-heading" className="heading-lg">
          {t('app.dashboard.activeHeading')}
        </h2>
        {courses.length > 0 && (
          <Link to="/courses" className="link text-sm">
            {t('app.dashboard.allCourses')}
          </Link>
        )}
      </div>
      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen aria-hidden size={40} />}
          title={t('app.dashboard.activeEmpty')}
          action={
            <a href={`${config.siteUrl}courses`} className={buttonClass('primary')}>
              {t('app.dashboard.browseCatalog')}
            </a>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((item) => (
            <li key={item.enrollmentId}>
              <Link to={continuePath(item)} className="focus-ring block h-full rounded-lg">
                <Card className="card-body flex h-full flex-col gap-3 hover:bg-surface-hover">
                  <p className="font-semibold">{item.course.title}</p>
                  <ProgressBar
                    value={item.progress}
                    label={t('app.myCourses.progress', { value: format.percent(item.progress) })}
                    showLabel
                  />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
