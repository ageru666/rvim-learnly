import { createSlice } from '@reduxjs/toolkit';
import { sessionExpired } from '../../shared/api/session';

type SessionStatus = 'active' | 'expired';

interface AuthState {
  session: SessionStatus;
}

const initialState: AuthState = { session: 'active' };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(sessionExpired, (state) => {
      state.session = 'expired';
    });
  },
});

export const authReducer = authSlice.reducer;

export const selectSessionExpired = (state: { auth: AuthState }): boolean =>
  state.auth.session === 'expired';
