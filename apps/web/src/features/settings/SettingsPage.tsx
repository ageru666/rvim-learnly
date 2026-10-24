import { PageLoader } from '../../shared/components/PageLoader';
import { useGetMeQuery } from '../auth/authApi';
import { useT } from '../locale/useT';
import { LanguageSettings } from './components/LanguageSettings';
import { SecuritySettings } from './components/SecuritySettings';

export function SettingsPage() {
  const { t } = useT();
  const { data: me } = useGetMeQuery();
  if (!me) return <PageLoader />;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="heading-xl">{t('app.settings.title')}</h1>
      <LanguageSettings />
      <section aria-label={t('app.settings.securityTab')}>
        <SecuritySettings email={me.email} />
      </section>
    </div>
  );
}
