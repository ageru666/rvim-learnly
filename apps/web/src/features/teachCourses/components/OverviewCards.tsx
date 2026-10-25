import { COURSE_STATUSES } from '@learnly/contracts/enums';
import type { InstructorOverview } from '@learnly/contracts/instructor';
import { Card } from '../../../shared/components/Card';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';

/** FR-TEACH-1 summary: courses by status, students, rating, recent enrollments. */
export function OverviewCards({ overview }: { overview: InstructorOverview }) {
  const { t, translate } = useT();
  const format = useFormat();
  const cards = [
    ...COURSE_STATUSES.map((status) => ({ label: translate(`enums.courseStatus.${status}`), value: format.number(overview.byStatus[status] ?? 0) })),
    { label: t('app.teach.overview.students'), value: format.number(overview.students) },
    {
      label: t('app.teach.overview.rating'),
      value: overview.ratingAvg === null ? t('app.teach.overview.noRating') : format.number(overview.ratingAvg),
    },
    { label: t('app.teach.overview.enrollments30d'), value: format.number(overview.enrollments30d) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => (
        <Card key={card.label} className="card-body flex flex-col gap-1">
          <dt className="text-xs text-text-muted">{card.label}</dt>
          <dd className="heading-md">{card.value}</dd>
        </Card>
      ))}
    </dl>
  );
}
