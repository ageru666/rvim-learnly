import type { MyCourse } from '@learnly/contracts/learning';
import { Link } from 'react-router';
import { buttonClass } from '../../../shared/components/buttonClass';
import { Card } from '../../../shared/components/Card';
import { ProgressBar } from '../../../shared/components/ProgressBar';
import { Tag } from '../../../shared/components/Tag';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { continuePath } from '../utils';

interface MyCourseCardProps {
  item: MyCourse;
  onLeave?: () => void;
}

export function MyCourseCard({ item, onLeave }: MyCourseCardProps) {
  const { t } = useT();
  const format = useFormat();
  const progressText = t('app.myCourses.progress', { value: format.percent(item.progress) });
  const completed = item.status === 'completed';

  return (
    <Card className="flex flex-col overflow-hidden sm:flex-row">
      {item.course.coverUrl && (
        <img src={item.course.coverUrl} alt="" className="aspect-video w-full object-cover sm:w-48" width="192" height="108" />
      )}
      <div className="card-body flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {item.course.category.name && <Tag accent={item.course.category.accent}>{item.course.category.name}</Tag>}
          <span className="text-xs text-text-muted">
            {completed && item.completedAt
              ? t('app.myCourses.completedAt', { date: format.date(item.completedAt) })
              : t('app.myCourses.lastActivity', { date: format.date(item.lastActivityAt) })}
          </span>
        </div>
        <h2 className="heading-md">{item.course.title}</h2>
        <ProgressBar value={item.progress} label={progressText} showLabel />
        <div className="mt-auto flex flex-wrap gap-2">
          <Link to={continuePath(item)} className={buttonClass('primary', 'sm')}>
            {completed ? t('app.myCourses.review') : t('app.myCourses.continue')}
          </Link>
          {onLeave && (
            <button type="button" className={buttonClass('ghost', 'sm')} onClick={onLeave}>
              {t('app.myCourses.leave')}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
