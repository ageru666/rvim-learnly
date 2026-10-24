import { LOCALES } from '@learnly/contracts/enums';
import { Globe } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { cx } from '../../shared/utils/cx';
import { selectLocale, setLocale } from './localeSlice';
import { useT } from './useT';

/** UA / EN switch; the whole SPA re-renders in the new language without a reload. */
export function LocaleSwitcher() {
  const { t } = useT();
  const active = useSelector(selectLocale);
  const dispatch = useDispatch();

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t('site.locale.label')}>
      <Globe aria-hidden size={16} className="text-text-muted" />
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === active}
          aria-label={t(`enums.locale.${locale}`)}
          className={cx(
            'btn btn-ghost btn-sm',
            locale === active ? 'font-bold underline underline-offset-4' : 'text-text-muted',
          )}
          onClick={() => dispatch(setLocale(locale))}
        >
          {t(`site.locale.short.${locale}`)}
        </button>
      ))}
    </div>
  );
}
