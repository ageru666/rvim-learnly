import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface TeachLessonsState {
  /** Quiz problems are shown after the first save attempt, not while the author is still typing. */
  quizProblemsShown: boolean;
}

const initialState: TeachLessonsState = { quizProblemsShown: false };

const teachLessonsSlice = createSlice({
  name: 'teachLessons',
  initialState,
  reducers: {
    quizProblemsShown: (state, action: PayloadAction<boolean>) => {
      state.quizProblemsShown = action.payload;
    },
  },
});

export const teachLessonsReducer = teachLessonsSlice.reducer;
export const { quizProblemsShown } = teachLessonsSlice.actions;

export const selectQuizProblemsShown = (state: { teachLessons: TeachLessonsState }): boolean =>
  state.teachLessons.quizProblemsShown;
