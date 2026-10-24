import type { ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import { writePreferenceCookie, writeStored } from '../../shared/api/browserStorage';
import { logFailure } from '../../shared/utils/logger';
import { setTheme } from './themeSlice';

/** Applies the theme to <html> and remembers it for the server-rendered pages (cookie) and this device. */
export function startThemeListeners(listeners: ListenerMiddlewareInstance): void {
  listeners.startListening({
    actionCreator: setTheme,
    effect: (action) => {
      document.documentElement.dataset.theme = action.payload;
      writePreferenceCookie('theme', action.payload);
      try {
        writeStored('theme', action.payload);
      } catch (error) {
        logFailure('remember theme', { error: String(error) });
      }
    },
  });
}
