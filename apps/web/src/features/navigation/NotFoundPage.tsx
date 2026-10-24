import { Link } from 'react-router';
import { buttonClass } from '../../shared/components/Button';
import { useT } from '../locale/useT';

export function NotFoundPage() {
  const { t } = useT();
  return (
    <section className="flex flex-col items-center gap-4 py-24 text-center">
      <p aria-hidden className="font-display text-7xl font-bold text-text-subtle">
        {404}
      </p>
      <h1 className="heading-xl">{t('app.layout.notFoundTitle')}</h1>
      <p className="text-lead max-w-xl">{t('app.layout.notFoundText')}</p>
      <Link to="/" className={buttonClass('primary')}>
        {t('app.layout.dashboard')}
      </Link>
    </section>
  );
}
