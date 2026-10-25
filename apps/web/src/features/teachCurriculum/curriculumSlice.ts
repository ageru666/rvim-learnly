import type { ModuleDto } from '@learnly/contracts/instructor';
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';
import { teachCoursesApi } from '../teachCourses/teachCoursesApi';
import { teachCurriculumApi } from './teachCurriculumApi';

/** Which curriculum dialog is open. */
export type CurriculumDialog =
  | { kind: 'addModule' }
  | { kind: 'renameModule'; moduleId: string; title: string }
  | { kind: 'deleteModule'; moduleId: string; title: string }
  | { kind: 'addLesson'; moduleId: string }
  | { kind: 'deleteLesson'; lessonId: string; title: string };

interface CurriculumState {
  dialog: CurriculumDialog | null;
  /** The new order shown right away while the structure request is in flight. */
  pendingOrder: ModuleDto[] | null;
}

const initialState: CurriculumState = { dialog: null, pendingOrder: null };

const { setStructure, createModule, renameModule, deleteModule, createLesson, deleteLesson } = teachCurriculumApi.endpoints;

const curriculumSlice = createSlice({
  name: 'curriculum',
  initialState,
  reducers: {
    dialogOpened: (state, action: PayloadAction<CurriculumDialog | null>) => {
      state.dialog = action.payload;
    },
    orderChanged: (state, action: PayloadAction<ModuleDto[]>) => {
      state.pendingOrder = action.payload;
    },
  },
  extraReducers: (builder) => {
    // The pending order stays until the refreshed course arrives, so the old order never flashes.
    builder.addMatcher(isAnyOf(teachCoursesApi.endpoints.getCourseEditor.matchFulfilled, setStructure.matchRejected), (state) => {
      state.pendingOrder = null;
    });
    builder.addMatcher(
      isAnyOf(createModule.matchFulfilled, renameModule.matchFulfilled, deleteModule.matchFulfilled, createLesson.matchFulfilled, deleteLesson.matchFulfilled),
      (state) => {
        state.dialog = null;
      },
    );
  },
});

export const curriculumReducer = curriculumSlice.reducer;
export const { dialogOpened, orderChanged } = curriculumSlice.actions;

type State = { curriculum: CurriculumState };
export const selectCurriculumDialog = (state: State): CurriculumDialog | null => state.curriculum.dialog;
export const selectPendingOrder = (state: State): ModuleDto[] | null => state.curriculum.pendingOrder;
