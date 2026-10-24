import { localeSchema, type Locale } from '@learnly/contracts/enums';
import { resolveLocale } from '@learnly/i18n/locales';
import { zodErrorMap } from '@learnly/i18n/zod';
import { type ListenerEffectAPI, type ListenerMiddlewareInstance, type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit';
import { z } from 'zod';
import { baseApi } from '../../shared/api/baseApi';
import { readCookie, readStored, writePreferenceCookie, writeStored } from '../../shared/api/browserStorage';
import { logFailure } from '../../shared/utils/logger';
import { authApi } from '../auth/authApi';
import { localeApi } from './localeApi';
import { localeResolved, selectLocale, setLocale } from './localeSlice';

type LocaleListenerApi = ListenerEffectAPI<unknown, ThunkDispatch<unknown, unknown, UnknownAction>>;

const selectMe = authApi.endpoints.getMe.select();
type MeState = Parameters<typeof selectMe>[0];
type LocaleState = Parameters<typeof selectLocale>[0];

/** <html lang> (also read by the base query for Accept-Language), Zod messages, locale-dependent data. */
function applyLocale(locale: Locale, api: LocaleListenerApi): void {
  document.documentElement.lang = locale;
  z.config({ localeError: zodErrorMap(locale) });
  api.dispatch(baseApi.util.invalidateTags(['Locale']));
}

function rememberOnDevice(locale: Locale): void {
  writePreferenceCookie('locale', locale);
  try {
    writeStored('locale', locale);
  } catch (error) {
    logFailure('remember locale', { error: String(error) });
  }
}

function storedLocale(): Locale | null {
  try {
    return readStored('locale', localeSchema);
  } catch {
    return null;
  }
}

/**
 * A choice is applied, remembered on the device and saved to the account when signed in. When `Me`
 * arrives, the language is resolved again so the account locale applies on a device without a choice.
 */
export function startLocaleListeners(listeners: ListenerMiddlewareInstance): void {
  listeners.startListening({
    actionCreator: setLocale,
    effect: ({ payload: locale }, api) => {
      applyLocale(locale, api);
      rememberOnDevice(locale);
      const signedIn = selectMe(api.getState() as MeState).data !== undefined;
      if (signedIn) void api.dispatch(localeApi.endpoints.saveLocale.initiate(locale));
    },
  });

  listeners.startListening({
    actionCreator: localeResolved,
    effect: ({ payload: locale }, api) => applyLocale(locale, api),
  });

  listeners.startListening({
    matcher: authApi.endpoints.getMe.matchFulfilled,
    effect: (action, api) => {
      const locale = resolveLocale({
        cookie: readCookie('locale') ?? storedLocale(),
        user: action.payload.locale,
        acceptLanguage: navigator.languages,
      });
      if (locale !== selectLocale(api.getState() as LocaleState)) {
        api.dispatch(localeResolved(locale));
      }
    },
  });
}
