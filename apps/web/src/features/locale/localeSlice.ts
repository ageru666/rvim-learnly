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
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
    },
  },
});

export const { setLocale } = localeSlice.actions;
export const localeReducer = localeSlice.reducer;

export const selectLocale = (state: { locale: LocaleState }): Locale => state.locale.locale;
