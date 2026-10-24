import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useLogout } from '../../auth/useLogout';
import { useT } from '../../locale/useT';
import { logoutAllConfirmToggled, selectLogoutAllConfirmOpen } from '../settingsSlice';

export function LogoutEverywhere() {
  const { t } = useT();
  const dispatch = useDispatch();
  const open = useSelector(selectLogoutAllConfirmOpen);
  const logoutEverywhere = useLogout('everywhere');

  return (
    <Card className="card-body">
      <h2 className="heading-md mb-1">{t('app.settings.sessions.heading')}</h2>
      <p className="mb-4 text-sm text-text-muted">{t('app.settings.sessions.text')}</p>
      <Button variant="danger" onClick={() => dispatch(logoutAllConfirmToggled(true))}>
        {t('app.settings.sessions.logoutAll')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => dispatch(logoutAllConfirmToggled(next))}
        title={t('app.settings.sessions.confirmTitle')}
        description={t('app.settings.sessions.confirmText')}
        confirmLabel={t('app.settings.sessions.logoutAll')}
        cancelLabel={t('common.actions.cancel')}
        onConfirm={logoutEverywhere}
      />
    </Card>
  );
}
