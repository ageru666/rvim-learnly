import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface Point {
  x: number;
  y: number;
}

interface WikiState {
  /** The current selection that can be looked up, with where to show the button. */
  selection: { term: string; at: Point } | null;
  /** The term being looked up (the popover is open). */
  lookup: { term: string; at: Point } | null;
}

const initialState: WikiState = { selection: null, lookup: null };

const wikiSlice = createSlice({
  name: 'wiki',
  initialState,
  reducers: {
    selectionChanged: (state, action: PayloadAction<WikiState['selection']>) => {
      state.selection = action.payload;
    },
    lookupStarted: (state) => {
      state.lookup = state.selection;
      state.selection = null;
    },
    lookupClosed: (state) => {
      state.lookup = null;
    },
  },
});

export const wikiReducer = wikiSlice.reducer;
export const { selectionChanged, lookupStarted, lookupClosed } = wikiSlice.actions;

type State = { wiki: WikiState };
export const selectWikiSelection = (state: State) => state.wiki.selection;
export const selectWikiLookup = (state: State) => state.wiki.lookup;
