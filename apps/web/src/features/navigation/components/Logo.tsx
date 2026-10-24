import { config } from '../../../shared/config';
import { useT } from '../../locale/useT';

/** Same mark and wordmark as the server-rendered site; links to its home page. */
export function Logo() {
  const { t } = useT();
  return (
    <a href={config.siteUrl} className="focus-ring inline-flex items-center gap-2 rounded-sm" aria-label={t('site.header.homeLink')}>
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden focusable="false">
        <rect width="28" height="28" rx="6" fill="currentColor" />
        <path d="M9 7v14h10" fill="none" stroke="var(--color-bg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19" cy="9" r="2.5" fill="var(--color-accent-yellow)" />
      </svg>
      <span aria-hidden className="font-display text-xl font-bold tracking-tight">
        {t('site.meta.brand')}
      </span>
    </a>
  );
}
