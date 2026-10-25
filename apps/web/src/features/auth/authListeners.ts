import type { ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import { z } from 'zod';
import { clearPersonalStorage, readStored, writeStored } from '../../shared/api/browserStorage';
import { sessionExpired } from '../../shared/api/session';
import { logFailure } from '../../shared/utils/logger';
import { authApi } from './authApi';

const LAST_USER_KEY = 'last-user';

function clearPersonal(reason: string): void {
  try {
    clearPersonalStorage();
  } catch (error) {
    logFailure('clear personal data', { reason, error: String(error) });
  }
}

/**
 * Personal data on this device (notes, quiz progress, drafts, the Wikipedia cache) belongs to one
 * account: it is removed when the session ends and when a different user signs in on the device.
 * Device preferences (theme, locale, layout) stay. Logging out clears it in `useLogout`.
 */
export function startAuthListeners(listeners: ListenerMiddlewareInstance): void {
  listeners.startListening({
    actionCreator: sessionExpired,
    effect: () => clearPersonal('session expired'),
  });

  listeners.startListening({
    matcher: authApi.endpoints.getMe.matchFulfilled,
    effect: (action) => {
      const userId = action.payload.id;
      try {
        const previous = readStored(LAST_USER_KEY, z.string());
        if (previous !== null && previous !== userId) clearPersonal('another user');
        writeStored(LAST_USER_KEY, userId);
      } catch (error) {
        logFailure('remember the last user', { error: String(error) });
      }
    },
  });
}
