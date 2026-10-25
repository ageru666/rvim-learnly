import type { CertificateDto } from '@learnly/contracts/certificates';
import { Award, Copy, ExternalLink, Printer } from 'lucide-react';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { buttonClass } from '../../../shared/components/buttonClass';
import { Card } from '../../../shared/components/Card';
import { describeError } from '../../../shared/utils/describeError';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { useCopyLinkMutation } from '../certificatesApi';

interface CertificateCardProps {
  certificate: CertificateDto;
}

/** FR-CERT-2: view the public page, copy its link, print it (browser printing on the public page). */
export function CertificateCard({ certificate }: CertificateCardProps) {
  const i18n = useT();
  const { t } = i18n;
  const format = useFormat();
  const [copyLink, { isSuccess: copied, error }] = useCopyLinkMutation();

  return (
    <Card className="card-body flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Award aria-hidden size={28} className="shrink-0 text-accent-yellow" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="font-semibold">{certificate.courseTitle}</p>
          <p className="text-sm text-text-muted">
            {t('app.certificates.issuedAt', { date: format.date(certificate.issuedAt, 'long') })}
          </p>
          <p className="font-mono text-sm">{certificate.code}</p>
        </div>
        {certificate.revoked && <Badge tone="danger">{t('app.certificates.revoked')}</Badge>}
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={certificate.url} target="_blank" rel="noopener" className={buttonClass('primary', 'sm')}>
          <ExternalLink aria-hidden size={14} />
          {t('app.certificates.view')}
        </a>
        <Button size="sm" variant="outline" onClick={() => void copyLink(certificate.url)}>
          <Copy aria-hidden size={14} />
          {copied ? t('app.certificates.copied') : t('app.certificates.copy')}
        </Button>
        <a href={`${certificate.url}?print=1`} target="_blank" rel="noopener" className={buttonClass('outline', 'sm')}>
          <Printer aria-hidden size={14} />
          {t('app.certificates.print')}
        </a>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {describeError(error, i18n)}
        </p>
      )}
      <span className="sr-only" role="status">
        {copied ? t('app.certificates.copied') : ''}
      </span>
    </Card>
  );
}
