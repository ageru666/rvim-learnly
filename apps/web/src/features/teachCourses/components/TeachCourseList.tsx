import type { InstructorCourseRow } from '@learnly/contracts/instructor';
import { Link } from 'react-router';
import { Badge } from '../../../shared/components/Badge';
import { buttonClass } from '../../../shared/components/buttonClass';
import { Card } from '../../../shared/components/Card';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { statusTone } from '../utils';

export function TeachCourseList({ courses }: { courses: InstructorCourseRow[] }) {
  const { t, translate } = useT();
  const format = useFormat();
  return (
    <ul className="flex flex-col gap-3">
      {courses.map((course) => (
        <li key={course.id}>
          <Card className="card-body flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{course.title}</p>
                <Badge tone={statusTone(course.status)}>{translate(`enums.courseStatus.${course.status}`)}</Badge>
              </div>
              <p className="text-sm text-text-muted">
                {t('app.teach.lessons', { count: course.lessonCount })} · {t('app.teach.students', { count: course.studentCount })} ·{' '}
                {t('app.teach.updatedAt', { date: format.date(course.updatedAt) })}
              </p>
            </div>
            <Link to={`/teach/courses/${course.id}`} className={buttonClass('outline', 'sm')}>
              {t('app.teach.edit')}
            </Link>
          </Card>
        </li>
      ))}
    </ul>
  );
}
