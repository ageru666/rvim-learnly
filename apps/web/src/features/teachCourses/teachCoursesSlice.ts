import type { CourseStatus } from '@learnly/contracts/enums';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { teachCoursesApi } from './teachCoursesApi';

export type EditorTab = 'basics' | 'curriculum' | 'publish';

interface TeachCoursesState {
  statusFilter: CourseStatus | null;
  createDialogOpen: boolean;
  editorTab: EditorTab;
  deleteConfirmOpen: boolean;
}

const initialState: TeachCoursesState = {
  statusFilter: null,
  createDialogOpen: false,
  editorTab: 'basics',
  deleteConfirmOpen: false,
};

const teachCoursesSlice = createSlice({
  name: 'teachCourses',
  initialState,
  reducers: {
    statusFilterChanged: (state, action: PayloadAction<CourseStatus | null>) => {
      state.statusFilter = action.payload;
    },
    createDialogToggled: (state, action: PayloadAction<boolean>) => {
      state.createDialogOpen = action.payload;
    },
    editorTabChanged: (state, action: PayloadAction<EditorTab>) => {
      state.editorTab = action.payload;
    },
    deleteConfirmToggled: (state, action: PayloadAction<boolean>) => {
      state.deleteConfirmOpen = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(teachCoursesApi.endpoints.createCourse.matchFulfilled, (state) => {
      state.createDialogOpen = false;
      state.editorTab = 'basics';
    });
    builder.addMatcher(teachCoursesApi.endpoints.deleteCourse.matchFulfilled, (state) => {
      state.deleteConfirmOpen = false;
    });
  },
});

export const teachCoursesReducer = teachCoursesSlice.reducer;
export const { statusFilterChanged, createDialogToggled, editorTabChanged, deleteConfirmToggled } = teachCoursesSlice.actions;

type State = { teachCourses: TeachCoursesState };
export const selectStatusFilter = (state: State) => state.teachCourses.statusFilter;
export const selectCreateDialogOpen = (state: State) => state.teachCourses.createDialogOpen;
export const selectEditorTab = (state: State) => state.teachCourses.editorTab;
export const selectDeleteConfirmOpen = (state: State) => state.teachCourses.deleteConfirmOpen;
