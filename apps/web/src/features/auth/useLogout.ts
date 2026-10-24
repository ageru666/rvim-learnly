import { useCallback } from 'react';
import { config } from '../../shared/config';
import { storageApi } from '../../shared/api/storageApi';
import { useDispatch } from 'react-redux';
import { useLogoutMutation } from './authApi';

/** Ends the session, removes personal data from this device and returns to the public site. */
export function useLogout(): () => void {
  const [logout] = useLogoutMutation();
  const dispatch = useDispatch();
  return useCallback(() => {
    void (async () => {
      await logout().unwrap().catch(() => undefined);
      await dispatch(storageApi.endpoints.clearPersonalData.initiate());
      window.location.assign(config.siteUrl);
    })();
  }, [logout, dispatch]);
}
