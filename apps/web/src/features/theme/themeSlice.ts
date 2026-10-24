import type { Theme } from '@learnly/contracts/enums';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ThemeState {
  theme: Theme;
}

export function initialThemeState(theme: Theme): ThemeState {
  return { theme };
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: initialThemeState('system'),
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
  },
});

export const { setTheme } = themeSlice.actions;
export const themeReducer = themeSlice.reducer;

export const selectTheme = (state: { theme: ThemeState }): Theme => state.theme.theme;
