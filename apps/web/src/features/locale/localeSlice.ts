import type { Locale } from '@learnly/contracts/enums';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface LocaleState {
  locale: Locale;
}

export function initialLocaleState(locale: Locale): LocaleState {
  return { locale };
}

const localeSlice = createSlice({
  name: 'locale',
  initialState: initialLocaleState('uk'),
  reducers: {
    /** An explicit choice: remembered on the device and in the account. */
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
    },
    /** Derived from the sources (cookie, account, browser) without a choice to remember. */
    localeResolved(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
    },
  },
});

export const { setLocale, localeResolved } = localeSlice.actions;
export const localeReducer = localeSlice.reducer;

export const selectLocale = (state: { locale: LocaleState }): Locale => state.locale.locale;
