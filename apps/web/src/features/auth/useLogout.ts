import { useCallback } from 'react';
import { storageApi } from '../../shared/api/storageApi';
import { config } from '../../shared/config';
import { useLogoutAllMutation, useLogoutMutation } from './authApi';

type LogoutScope = 'current' | 'everywhere';

/**
 * Ends the session (or every session of the account), removes personal data from this device and
 * returns to the public site.
 */
export function useLogout(scope: LogoutScope = 'current'): () => void {
  const [logout] = useLogoutMutation();
  const [logoutAll] = useLogoutAllMutation();
  const [clearPersonalData] = storageApi.useClearPersonalDataMutation();
  return useCallback(() => {
    void (async () => {
      await (scope === 'everywhere' ? logoutAll() : logout())
        .unwrap()
        .catch(() => undefined);
      await clearPersonalData();
      window.location.assign(config.siteUrl);
    })();
  }, [scope, logout, logoutAll, clearPersonalData]);
}
