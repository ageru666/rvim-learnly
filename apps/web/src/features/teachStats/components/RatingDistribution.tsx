import type { CourseStats } from '@learnly/contracts/instructor';
import { Card } from '../../../shared/components/Card';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { ratingSeries } from '../utils';

/** Bars per star count with the numbers written out, so the chart is readable without colour. */
export function RatingDistribution({ distribution }: { distribution: CourseStats['ratingDistribution'] }) {
  const { t } = useT();
  const format = useFormat();
  return (
    <Card className="card-body flex flex-col gap-3">
      <h2 className="heading-md">{t('app.stats.ratings')}</h2>
      <ul className="flex flex-col gap-2">
        {ratingSeries(distribution).map((row) => (
          <li key={row.stars} className="flex items-center gap-3 text-sm">
            <span className="w-10">{t('app.stats.starsCount', { stars: row.stars })}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-sunken" aria-hidden>
              <span className="block h-full bg-accent-yellow" style={{ width: `${row.percent}%` }} />
            </span>
            <span className="w-16 text-right text-text-muted">
              {format.number(row.count)} · {format.percent(row.percent)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
