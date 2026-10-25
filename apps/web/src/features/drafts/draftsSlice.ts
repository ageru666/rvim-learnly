import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface DraftsState {
  /** Draft keys whose restore/discard question was answered in this session. */
  resolved: Record<string, true>;
}

const initialState: DraftsState = { resolved: {} };

const draftsSlice = createSlice({
  name: 'drafts',
  initialState,
  reducers: {
    draftResolved: (state, action: PayloadAction<string>) => {
      state.resolved[action.payload] = true;
    },
  },
});

export const draftsReducer = draftsSlice.reducer;
export const { draftResolved } = draftsSlice.actions;

export const selectDraftResolved =
  (key: string) =>
  (state: { drafts: DraftsState }): boolean =>
    state.drafts.resolved[key] === true;
