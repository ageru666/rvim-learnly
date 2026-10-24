import { useCallback } from 'react';
import { storageApi } from '../../shared/api/storageApi';
import { config } from '../../shared/config';
import { useLogoutMutation } from './authApi';

/** Ends the session, removes personal data from this device and returns to the public site. */
export function useLogout(): () => void {
  const [logout] = useLogoutMutation();
  const [clearPersonalData] = storageApi.useClearPersonalDataMutation();
  return useCallback(() => {
    void (async () => {
      await logout()
        .unwrap()
        .catch(() => undefined);
      await clearPersonalData();
      window.location.assign(config.siteUrl);
    })();
  }, [logout, clearPersonalData]);
}
