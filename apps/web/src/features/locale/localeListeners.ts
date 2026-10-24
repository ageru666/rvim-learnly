import type { ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import { zodErrorMap } from '@learnly/i18n/zod';
import { z } from 'zod';
import { baseApi } from '../../shared/api/baseApi';
import { writePreferenceCookie, writeStored } from '../../shared/api/browserStorage';
import { logFailure } from '../../shared/utils/logger';
import { setLocale } from './localeSlice';

/**
 * Side effects of a language switch: remember it on the device, update <html lang> (also read by the
 * base query for Accept-Language), switch Zod messages and refetch locale-dependent server data.
 */
export function startLocaleListeners(listeners: ListenerMiddlewareInstance): void {
  listeners.startListening({
    actionCreator: setLocale,
    effect: (action, api) => {
      const locale = action.payload;
      document.documentElement.lang = locale;
      z.config({ localeError: zodErrorMap(locale) });
      writePreferenceCookie('locale', locale);
      try {
        writeStored('locale', locale);
      } catch (error) {
        logFailure('remember locale', { error: String(error) });
      }
      api.dispatch(baseApi.util.invalidateTags(['Locale']));
    },
  });
}
