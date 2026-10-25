import type { CertificateDto } from '@learnly/contracts/certificates';
import { Link } from 'react-router';
import { useT } from '../locale/useT';
import { CertificateCard } from './components/CertificateCard';

interface CertificatesBlockProps {
  certificates: CertificateDto[];
}

const SHOWN = 2;

/** The dashboard block (FR-LEARN-2); hidden until the first certificate. */
export function CertificatesBlock({ certificates }: CertificatesBlockProps) {
  const { t } = useT();
  if (certificates.length === 0) return null;
  return (
    <section className="flex flex-col gap-4" aria-labelledby="certificates-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="certificates-heading" className="heading-lg">
          {t('app.certificates.title')}
        </h2>
        {certificates.length > SHOWN && (
          <Link to="/certificates" className="link text-sm">
            {t('app.certificates.allCertificates')}
          </Link>
        )}
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {certificates.slice(0, SHOWN).map((certificate) => (
          <li key={certificate.code}>
            <CertificateCard certificate={certificate} />
          </li>
        ))}
      </ul>
    </section>
  );
}
