import type { CourseStats } from '@learnly/contracts/instructor';
import { Card } from '../../../shared/components/Card';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';

export function StatCards({ totals }: { totals: CourseStats['totals'] }) {
  const { t } = useT();
  const format = useFormat();
  const cards = [
    { label: t('app.stats.students'), value: format.number(totals.students) },
    { label: t('app.stats.completed'), value: format.number(totals.completed) },
    { label: t('app.stats.avgProgress'), value: format.percent(totals.avgProgress) },
    { label: t('app.stats.rating'), value: totals.ratingAvg === null ? t('app.stats.noRating') : format.number(totals.ratingAvg) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="card-body flex flex-col gap-1">
          <dt className="text-xs text-text-muted">{card.label}</dt>
          <dd className="heading-lg">{card.value}</dd>
        </Card>
      ))}
    </dl>
  );
}
