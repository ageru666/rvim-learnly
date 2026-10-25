import { isApiError } from '../../shared/api/apiError';
import { ErrorState } from '../../shared/components/ErrorState';
import { Skeleton } from '../../shared/components/Skeleton';
import { describeError } from '../../shared/utils/describeError';
import { useGetMeQuery } from '../auth/authApi';
import { CertificatesBlock } from '../certificates/CertificatesBlock';
import { useGetDashboardQuery } from '../enrollments/enrollmentsApi';
import { useT } from '../locale/useT';
import { ActiveCoursesList } from './components/ActiveCoursesList';
import { ContinueLearningCard } from './components/ContinueLearningCard';
import { RecommendationsList } from './components/RecommendationsList';

/** FR-LEARN-2. Notifications (US11) join this page with their story. */
export function DashboardPage() {
  const i18n = useT();
  const { data: me } = useGetMeQuery();
  const { data, isLoading, error, refetch } = useGetDashboardQuery();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="heading-xl">{me ? i18n.t('app.dashboard.greeting', { name: me.name }) : i18n.t('app.dashboard.title')}</h1>
      {isLoading && (
        <div className="flex flex-col gap-4" aria-busy>
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
      )}
      {error && (
        <ErrorState
          message={describeError(error, i18n)}
          retryable={isApiError(error) && error.retryable}
          onRetry={() => void refetch()}
          retryLabel={i18n.t('common.actions.retry')}
        />
      )}
      {data && (
        <>
          {data.continue && <ContinueLearningCard item={data.continue} />}
          <ActiveCoursesList courses={data.active} />
          <CertificatesBlock certificates={data.certificates} />
          <RecommendationsList courses={data.recommendations} />
        </>
      )}
    </div>
  );
}
