import type { EnrollmentStatus } from '@learnly/contracts/enums';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { enrollmentsApi } from './enrollmentsApi';

interface LeavingCourse {
  courseId: string;
  title: string;
}

interface EnrollmentsState {
  tab: EnrollmentStatus;
  search: string;
  /** The course whose "Leave" confirmation is open. */
  leaving: LeavingCourse | null;
}

const initialState: EnrollmentsState = { tab: 'active', search: '', leaving: null };

const enrollmentsSlice = createSlice({
  name: 'enrollments',
  initialState,
  reducers: {
    tabChanged: (state, action: PayloadAction<EnrollmentStatus>) => {
      state.tab = action.payload;
    },
    searchChanged: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    leaveRequested: (state, action: PayloadAction<LeavingCourse | null>) => {
      state.leaving = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(enrollmentsApi.endpoints.leaveCourse.matchFulfilled, (state) => {
      state.leaving = null;
    });
  },
});

export const enrollmentsReducer = enrollmentsSlice.reducer;
export const { tabChanged, searchChanged, leaveRequested } = enrollmentsSlice.actions;

export const selectMyCoursesTab = (state: { enrollments: EnrollmentsState }): EnrollmentStatus => state.enrollments.tab;
export const selectMyCoursesSearch = (state: { enrollments: EnrollmentsState }): string => state.enrollments.search;
export const selectLeavingCourse = (state: { enrollments: EnrollmentsState }): LeavingCourse | null =>
  state.enrollments.leaving;
