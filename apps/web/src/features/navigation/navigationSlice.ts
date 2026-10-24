import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface NavigationState {
  mobileMenuOpen: boolean;
}

const initialState: NavigationState = { mobileMenuOpen: false };

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setMobileMenuOpen(state, action: PayloadAction<boolean>) {
      state.mobileMenuOpen = action.payload;
    },
  },
});

export const { setMobileMenuOpen } = navigationSlice.actions;
export const navigationReducer = navigationSlice.reducer;

export const selectMobileMenuOpen = (state: { navigation: NavigationState }): boolean =>
  state.navigation.mobileMenuOpen;
