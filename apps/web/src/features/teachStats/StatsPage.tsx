import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { isApiError } from '../../shared/api/apiError';
import { buttonClass } from '../../shared/components/buttonClass';
import { ErrorState } from '../../shared/components/ErrorState';
import { Skeleton } from '../../shared/components/Skeleton';
import { describeError } from '../../shared/utils/describeError';
import { useT } from '../locale/useT';
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
        <ErrorState
          message={describeError(error, i18n)}
          retryable={isApiError(error) && error.retryable}
          onRetry={() => void refetch()}
          retryLabel={t('common.actions.retry')}
        />
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
