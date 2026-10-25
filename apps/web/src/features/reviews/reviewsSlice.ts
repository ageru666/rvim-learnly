import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { reviewsApi } from './reviewsApi';

interface ReviewsState {
  courseFilter: string | null;
  /** The review whose reply dialog is open. */
  replyingTo: string | null;
}

const initialState: ReviewsState = { courseFilter: null, replyingTo: null };

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    courseFilterChanged: (state, action: PayloadAction<string | null>) => {
      state.courseFilter = action.payload;
    },
    replyDialogToggled: (state, action: PayloadAction<string | null>) => {
      state.replyingTo = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(reviewsApi.endpoints.replyToReview.matchFulfilled, (state) => {
      state.replyingTo = null;
    });
  },
});

export const reviewsReducer = reviewsSlice.reducer;
export const { courseFilterChanged, replyDialogToggled } = reviewsSlice.actions;

export const selectCourseFilter = (state: { reviews: ReviewsState }): string | null => state.reviews.courseFilter;
export const selectReplyingTo = (state: { reviews: ReviewsState }): string | null => state.reviews.replyingTo;
