import type { ContinueLearning } from '@learnly/contracts/learning';
import { PlayCircle } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClass } from '../../../shared/components/buttonClass';
import { Card } from '../../../shared/components/Card';
import { ProgressBar } from '../../../shared/components/ProgressBar';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';

interface ContinueLearningCardProps {
  item: ContinueLearning;
}

export function ContinueLearningCard({ item }: ContinueLearningCardProps) {
  const { t } = useT();
  const format = useFormat();
  return (
    <Card className="card-body flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-muted">{t('app.dashboard.continueHeading')}</h2>
        <p className="heading-md">{item.courseTitle}</p>
        <p className="text-sm text-text-muted">{t('app.dashboard.continueLesson', { title: item.lessonTitle })}</p>
        <ProgressBar
          value={item.progress}
          label={t('app.player.progress', { value: format.percent(item.progress) })}
          showLabel
        />
      </div>
      <Link to={`/learn/${item.courseId}/${item.lessonId}`} className={buttonClass('primary')}>
        <PlayCircle aria-hidden size={18} />
        {t('app.dashboard.continueAction')}
      </Link>
    </Card>
  );
}
