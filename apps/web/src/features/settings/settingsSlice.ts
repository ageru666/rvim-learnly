import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FieldErrors } from './utils';

export type SecurityForm = 'password' | 'email';

interface SettingsState {
  /** Errors found before submitting, per form; server errors come from the mutation result. */
  clientErrors: Record<SecurityForm, FieldErrors>;
  logoutAllConfirmOpen: boolean;
}

const initialState: SettingsState = {
  clientErrors: { password: {}, email: {} },
  logoutAllConfirmOpen: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    formChecked: (state, action: PayloadAction<{ form: SecurityForm; errors: FieldErrors }>) => {
      state.clientErrors[action.payload.form] = action.payload.errors;
    },
    logoutAllConfirmToggled: (state, action: PayloadAction<boolean>) => {
      state.logoutAllConfirmOpen = action.payload;
    },
  },
});

export const settingsReducer = settingsSlice.reducer;
export const { formChecked, logoutAllConfirmToggled } = settingsSlice.actions;

export const selectClientErrors =
  (form: SecurityForm) =>
  (state: { settings: SettingsState }): FieldErrors =>
    state.settings.clientErrors[form];

export const selectLogoutAllConfirmOpen = (state: { settings: SettingsState }): boolean =>
  state.settings.logoutAllConfirmOpen;
