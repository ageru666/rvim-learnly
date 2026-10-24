import { localeSchema, themeSchema, type Locale, type Theme } from '@learnly/contracts/enums';
import { resolveLocale } from '@learnly/i18n/locales';
import { zodErrorMap } from '@learnly/i18n/zod';
import { combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { z } from 'zod';
import { authReducer } from './features/auth/authSlice';
import { startLocaleListeners } from './features/locale/localeListeners';
import { initialLocaleState, localeReducer } from './features/locale/localeSlice';
import { navigationReducer } from './features/navigation/navigationSlice';
import { startThemeListeners } from './features/theme/themeListeners';
import { initialThemeState, themeReducer } from './features/theme/themeSlice';
import { baseApi } from './shared/api/baseApi';
import { readCookie, readStored } from './shared/api/browserStorage';
import { storageApi } from './shared/api/storageApi';

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  [storageApi.reducerPath]: storageApi.reducer,
  auth: authReducer,
  locale: localeReducer,
  navigation: navigationReducer,
  theme: themeReducer,
});

function storedPreference<T>(key: string, schema: z.ZodType<T>): T | null {
  try {
    return readStored(key, schema);
  } catch {
    return null;
  }
}

/** Bootstrap-only reads: the language and theme the server and the inline script already used. */
function initialPreferences(): { locale: Locale; theme: Theme } {
  const locale = resolveLocale({
    cookie: readCookie('locale') ?? storedPreference('locale', localeSchema),
    acceptLanguage: navigator.languages,
  });
  const theme = themeSchema.safeParse(document.documentElement.dataset.theme);
  return { locale, theme: theme.success ? theme.data : 'system' };
}

export function createStore() {
  const listeners = createListenerMiddleware();
  startLocaleListeners(listeners);
  startThemeListeners(listeners);

  const preferences = initialPreferences();
  document.documentElement.lang = preferences.locale;
  z.config({ localeError: zodErrorMap(preferences.locale) });

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      locale: initialLocaleState(preferences.locale),
      theme: initialThemeState(preferences.theme),
    },
    middleware: (getDefault) =>
      getDefault().prepend(listeners.middleware).concat(baseApi.middleware, storageApi.middleware),
  });
  setupListeners(store.dispatch);
  return store;
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<typeof rootReducer>;
