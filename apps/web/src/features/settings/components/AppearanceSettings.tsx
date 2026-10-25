import { THEMES, themeSchema } from '@learnly/contracts/enums';
import { useDispatch, useSelector } from 'react-redux';
import { Card } from '../../../shared/components/Card';
import { RadioGroup } from '../../../shared/components/RadioGroup';
import { useT } from '../../locale/useT';
import { selectTheme, setTheme } from '../../theme/themeSlice';

/** FR-UI-3: the same state as the header switcher; the `theme` cookie keeps SSR pages in sync. */
export function AppearanceSettings() {
  const { t } = useT();
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);

  return (
    <Card className="card-body">
      <h2 className="heading-md mb-1">{t('app.settings.appearance.heading')}</h2>
      <p className="mb-4 text-sm text-text-muted">{t('app.settings.appearance.text')}</p>
      <RadioGroup
        label={t('app.settings.appearance.heading')}
        value={theme}
        onValueChange={(value) => {
          const next = themeSchema.safeParse(value);
          if (next.success) dispatch(setTheme(next.data));
        }}
        options={THEMES.map((option) => ({ value: option, label: t(`site.theme.${option}`) }))}
      />
    </Card>
  );
}
