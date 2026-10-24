import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface PlayerState {
  /** The curriculum drawer on small screens. */
  curriculumOpen: boolean;
}

const initialState: PlayerState = { curriculumOpen: false };

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    curriculumToggled: (state, action: PayloadAction<boolean>) => {
      state.curriculumOpen = action.payload;
    },
  },
});

export const playerReducer = playerSlice.reducer;
export const { curriculumToggled } = playerSlice.actions;

export const selectCurriculumOpen = (state: { player: PlayerState }): boolean => state.player.curriculumOpen;
