import type { MessageKey } from '@learnly/i18n/keys';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FieldErrors } from '../../shared/utils/checkForm';

interface ProfileState {
  /** Errors found before submitting; server errors come from the mutation result. */
  clientErrors: FieldErrors;
  /** Why the chosen avatar file was not sent. */
  avatarProblem: MessageKey | null;
}

const initialState: ProfileState = { clientErrors: {}, avatarProblem: null };

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    profileChecked: (state, action: PayloadAction<FieldErrors>) => {
      state.clientErrors = action.payload;
    },
    avatarChecked: (state, action: PayloadAction<MessageKey | null>) => {
      state.avatarProblem = action.payload;
    },
  },
});

export const profileReducer = profileSlice.reducer;
export const { profileChecked, avatarChecked } = profileSlice.actions;

export const selectProfileErrors = (state: { profile: ProfileState }): FieldErrors => state.profile.clientErrors;
export const selectAvatarProblem = (state: { profile: ProfileState }): MessageKey | null => state.profile.avatarProblem;
