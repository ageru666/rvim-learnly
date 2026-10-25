import type { StudentSort } from '@learnly/contracts/instructor';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { teachStudentsApi } from './teachStudentsApi';

interface ResetTarget {
  userId: string;
  name: string;
  quizId: string;
  title: string;
}

interface TeachStudentsState {
  search: string;
  sort: StudentSort;
  resetTarget: ResetTarget | null;
}

const initialState: TeachStudentsState = { search: '', sort: 'lastActivity', resetTarget: null };

const teachStudentsSlice = createSlice({
  name: 'teachStudents',
  initialState,
  reducers: {
    studentSearchChanged: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    studentSortChanged: (state, action: PayloadAction<StudentSort>) => {
      state.sort = action.payload;
    },
    resetRequested: (state, action: PayloadAction<ResetTarget | null>) => {
      state.resetTarget = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(teachStudentsApi.endpoints.resetAttempts.matchFulfilled, (state) => {
      state.resetTarget = null;
    });
  },
});

export const teachStudentsReducer = teachStudentsSlice.reducer;
export const { studentSearchChanged, studentSortChanged, resetRequested } = teachStudentsSlice.actions;

type State = { teachStudents: TeachStudentsState };
export const selectStudentSearch = (state: State) => state.teachStudents.search;
export const selectStudentSort = (state: State) => state.teachStudents.sort;
export const selectResetTarget = (state: State) => state.teachStudents.resetTarget;
