import { PageLoader } from '../../shared/components/PageLoader';
import { useGetMeQuery } from '../auth/authApi';
import { useT } from '../locale/useT';
import { AvatarSettings } from './components/AvatarSettings';
import { ProfileForm } from './components/ProfileForm';

export function ProfilePage() {
  const { t } = useT();
  const { data: me } = useGetMeQuery();
  if (!me) return <PageLoader />;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="heading-xl">{t('app.profile.title')}</h1>
      <AvatarSettings me={me} />
      <ProfileForm me={me} />
    </div>
  );
}
