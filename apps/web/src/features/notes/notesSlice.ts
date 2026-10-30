import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { notesApi } from './notesApi';

interface NotesState {
  /** Text being typed per `courseId:lessonId`, until it is written to storage. */
  drafts: Record<string, string>;
}

const initialState: NotesState = { drafts: {} };

const noteKey = (courseId: string, lessonId: string) => `${courseId}:${lessonId}`;

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    noteTyped: (state, action: PayloadAction<{ courseId: string; lessonId: string; text: string }>) => {
      state.drafts[noteKey(action.payload.courseId, action.payload.lessonId)] = action.payload.text;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(notesApi.endpoints.saveNote.matchFulfilled, (state, action) => {
      const { courseId, lessonId, text } = action.meta.arg.originalArgs;
      const key = noteKey(courseId, lessonId);
      if (state.drafts[key] === text) delete state.drafts[key];
    });
  },
});

export const notesReducer = notesSlice.reducer;
export const { noteTyped } = notesSlice.actions;

export const selectNoteDraft =
  (courseId: string, lessonId: string) =>
  (state: { notes: NotesState }): string | undefined =>
    state.notes.drafts[noteKey(courseId, lessonId)];
