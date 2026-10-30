import { Award } from 'lucide-react';
import { EmptyState } from '../../shared/components/EmptyState';
import { Skeleton } from '../../shared/components/Skeleton';
import { useT } from '../locale/useT';
import { QueryErrorState } from '../navigation/QueryErrorState';
import { useGetMyCertificatesQuery } from './certificatesApi';
import { CertificateCard } from './components/CertificateCard';

/** FR-CERT-2: `/app/certificates`. */
export function CertificatesPage() {
  const i18n = useT();
  const { data, isLoading, error, refetch } = useGetMyCertificatesQuery();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="heading-xl">{i18n.t('app.certificates.title')}</h1>
      {isLoading && <Skeleton className="h-32" />}
      {error && (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      )}
      {data && data.length === 0 && <EmptyState icon={<Award aria-hidden size={40} />} title={i18n.t('app.certificates.empty')} />}
      {data && data.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((certificate) => (
            <li key={certificate.code}>
              <CertificateCard certificate={certificate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
