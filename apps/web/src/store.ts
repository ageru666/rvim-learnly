import { localeSchema, themeSchema, type Locale, type Theme } from '@learnly/contracts/enums';
import { resolveLocale } from '@learnly/i18n/locales';
import { zodErrorMap } from '@learnly/i18n/zod';
import { combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { z } from 'zod';
import { startAuthListeners } from './features/auth/authListeners';
import { authReducer } from './features/auth/authSlice';
import { draftsReducer } from './features/drafts/draftsSlice';
import { enrollmentsReducer } from './features/enrollments/enrollmentsSlice';
import { startLocaleListeners } from './features/locale/localeListeners';
import { initialLocaleState, localeReducer } from './features/locale/localeSlice';
import { startNavigationListeners } from './features/navigation/navigationListeners';
import { notesReducer } from './features/notes/notesSlice';
import { initialNavigationState, navigationReducer, uiLayoutSchema } from './features/navigation/navigationSlice';
import { playerReducer } from './features/player/playerSlice';
import { startQuizListeners } from './features/quizzes/quizListeners';
import { quizReducer } from './features/quizzes/quizSlice';
import { reviewsReducer } from './features/reviews/reviewsSlice';
import { profileReducer } from './features/profile/profileSlice';
import { settingsReducer } from './features/settings/settingsSlice';
import { teachCoursesReducer } from './features/teachCourses/teachCoursesSlice';
import { curriculumReducer } from './features/teachCurriculum/curriculumSlice';
import { teachLessonsReducer } from './features/teachLessons/teachLessonsSlice';
import { teachStudentsReducer } from './features/teachStudents/teachStudentsSlice';
import { startThemeListeners } from './features/theme/themeListeners';
import { initialThemeState, themeReducer } from './features/theme/themeSlice';
import { videoEmbedApi } from './features/videoEmbed/videoEmbedApi';
import { wikiApi } from './features/wiki/wikiApi';
import { wikiReducer } from './features/wiki/wikiSlice';
import { baseApi } from './shared/api/baseApi';
import { readCookie, readStored } from './shared/api/browserStorage';
import { storageApi } from './shared/api/storageApi';

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  [storageApi.reducerPath]: storageApi.reducer,
  [wikiApi.reducerPath]: wikiApi.reducer,
  [videoEmbedApi.reducerPath]: videoEmbedApi.reducer,
  auth: authReducer,
  curriculum: curriculumReducer,
  drafts: draftsReducer,
  enrollments: enrollmentsReducer,
  locale: localeReducer,
  navigation: navigationReducer,
  notes: notesReducer,
  player: playerReducer,
  quiz: quizReducer,
  reviews: reviewsReducer,
  profile: profileReducer,
  settings: settingsReducer,
  teachCourses: teachCoursesReducer,
  teachLessons: teachLessonsReducer,
  teachStudents: teachStudentsReducer,
  wiki: wikiReducer,
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
  startNavigationListeners(listeners);
  startQuizListeners(listeners);
  startAuthListeners(listeners);

  const preferences = initialPreferences();
  document.documentElement.lang = preferences.locale;
  z.config({ localeError: zodErrorMap(preferences.locale) });

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      locale: initialLocaleState(preferences.locale),
      theme: initialThemeState(preferences.theme),
      navigation: initialNavigationState(storedPreference('ui', uiLayoutSchema)),
    },
    middleware: (getDefault) =>
      getDefault().prepend(listeners.middleware).concat(baseApi.middleware, storageApi.middleware, wikiApi.middleware, videoEmbedApi.middleware),
  });
  setupListeners(store.dispatch);
  return store;
}

export type AppStore = ReturnType<typeof createStore>;
