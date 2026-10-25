import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface PlayerState {
  /** The curriculum drawer on small screens. */
  curriculumOpen: boolean;
  notesOpen: boolean;
}

const initialState: PlayerState = { curriculumOpen: false, notesOpen: false };

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    curriculumToggled: (state, action: PayloadAction<boolean>) => {
      state.curriculumOpen = action.payload;
    },
    notesToggled: (state) => {
      state.notesOpen = !state.notesOpen;
    },
  },
});

export const playerReducer = playerSlice.reducer;
export const { curriculumToggled, notesToggled } = playerSlice.actions;

export const selectCurriculumOpen = (state: { player: PlayerState }): boolean => state.player.curriculumOpen;
export const selectNotesOpen = (state: { player: PlayerState }): boolean => state.player.notesOpen;
