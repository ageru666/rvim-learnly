import { Skeleton } from '../../shared/components/Skeleton';
import { useGetMeQuery } from '../auth/authApi';
import { CertificatesBlock } from '../certificates/CertificatesBlock';
import { useGetDashboardQuery } from '../enrollments/enrollmentsApi';
import { useT } from '../locale/useT';
import { QueryErrorState } from '../navigation/QueryErrorState';
import { NotificationsBlock } from '../notifications/NotificationsBlock';
import { ActiveCoursesList } from './components/ActiveCoursesList';
import { ContinueLearningCard } from './components/ContinueLearningCard';
import { RecommendationsList } from './components/RecommendationsList';

/** FR-LEARN-2. */
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
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      )}
      {data && (
        <>
          {data.continue && <ContinueLearningCard item={data.continue} />}
          <ActiveCoursesList courses={data.active} />
          <NotificationsBlock notifications={data.notifications} />
          <CertificatesBlock certificates={data.certificates} />
          <RecommendationsList courses={data.recommendations} />
        </>
      )}
    </div>
  );
}
