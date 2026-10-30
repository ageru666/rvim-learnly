import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { buttonClass } from '../../shared/components/buttonClass';
import { Skeleton } from '../../shared/components/Skeleton';
import { useT } from '../locale/useT';
import { QueryErrorState } from '../navigation/QueryErrorState';
import { EnrollmentsChart } from './components/EnrollmentsChart';
import { FunnelChart } from './components/FunnelChart';
import { QuizStatsTable } from './components/QuizStatsTable';
import { RatingDistribution } from './components/RatingDistribution';
import { StatCards } from './components/StatCards';
import { useGetCourseStatsQuery } from './teachStatsApi';

/** FR-TEACH-6: `/app/teach/courses/:id/stats`. */
export function StatsPage() {
  const i18n = useT();
  const { t } = i18n;
  const { id: courseId = '' } = useParams();
  const { data: stats, isLoading, error, refetch } = useGetCourseStatsQuery(courseId);

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/teach/courses/${courseId}`} className={`${buttonClass('ghost', 'sm')} self-start`}>
        <ArrowLeft aria-hidden size={16} />
        {t('app.stats.back')}
      </Link>
      <h1 className="heading-xl">{t('app.stats.title')}</h1>
      {isLoading && <Skeleton className="h-64" />}
      {error && (
        <QueryErrorState error={error} onRetry={() => void refetch()} back={{ to: '/teach', label: t('app.teach.editor.backToCourses') }} />
      )}
      {stats && (
        <>
          <StatCards totals={stats.totals} />
          <EnrollmentsChart weeks={stats.enrollmentsByWeek} />
          <FunnelChart funnel={stats.funnel} />
          <div className="grid gap-6 xl:grid-cols-2">
            <QuizStatsTable quizzes={stats.quizzes} />
            <RatingDistribution distribution={stats.ratingDistribution} />
          </div>
        </>
      )}
    </div>
  );
}
