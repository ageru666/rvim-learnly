import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { sessionExpired } from '../../shared/api/session';

type SessionStatus = 'active' | 'expired';

interface AuthState {
  session: SessionStatus;
  /** Epoch ms when the verification email may be sent again (FR-AUTH-3), or null. */
  resendAvailableAt: number | null;
}

const initialState: AuthState = { session: 'active', resendAvailableAt: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resendCooldownStarted: (state, action: PayloadAction<number>) => {
      state.resendAvailableAt = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sessionExpired, (state) => {
      state.session = 'expired';
    });
  },
});

export const authReducer = authSlice.reducer;
export const { resendCooldownStarted } = authSlice.actions;

export const selectSessionExpired = (state: { auth: AuthState }): boolean =>
  state.auth.session === 'expired';

export const selectResendAvailableAt = (state: { auth: AuthState }): number | null =>
  state.auth.resendAvailableAt;
