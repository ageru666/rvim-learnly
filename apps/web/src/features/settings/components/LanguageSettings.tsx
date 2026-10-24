import { LOCALES, localeSchema } from '@learnly/contracts/enums';
import { useDispatch, useSelector } from 'react-redux';
import { Card } from '../../../shared/components/Card';
import { RadioGroup } from '../../../shared/components/RadioGroup';
import { selectLocale, setLocale } from '../../locale/localeSlice';
import { useT } from '../../locale/useT';

/** FR-I18N-3: the same choice as the header switcher, explained as an account setting. */
export function LanguageSettings() {
  const { t } = useT();
  const dispatch = useDispatch();
  const locale = useSelector(selectLocale);

  return (
    <Card className="card-body">
      <h2 className="heading-md mb-1">{t('app.settings.language.heading')}</h2>
      <p className="mb-4 text-sm text-text-muted">{t('app.settings.language.text')}</p>
      <RadioGroup
        label={t('app.settings.language.heading')}
        value={locale}
        onValueChange={(value) => {
          const next = localeSchema.safeParse(value);
          if (next.success) dispatch(setLocale(next.data));
        }}
        options={LOCALES.map((option) => ({
          value: option,
          label: <span lang={option}>{t(`site.locale.native.${option}`)}</span>,
        }))}
      />
    </Card>
  );
}
