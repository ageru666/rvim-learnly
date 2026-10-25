import { z } from 'zod';
import { readStored, writeStored } from '../../shared/api/browserStorage';
import { storageApi, storageResult } from '../../shared/api/storageApi';
import { clampNote, type CourseNotes } from './utils';

const notesSchema = z.record(z.string(), z.object({ text: z.string(), updatedAt: z.string() }));
const key = (courseId: string) => `notes:${courseId}`;

/** `notes:<courseId>` in localStorage (FR-LEARN-6), and the `.md` download. */
export const notesApi = storageApi.injectEndpoints({
  endpoints: (build) => ({
    getCourseNotes: build.query<CourseNotes, string>({
      queryFn: (courseId) => storageResult(() => readStored(key(courseId), notesSchema) ?? {}),
      providesTags: (_result, _error, courseId) => [{ type: 'Stored', id: key(courseId) }],
    }),
    saveNote: build.mutation<CourseNotes, { courseId: string; lessonId: string; text: string }>({
      queryFn: ({ courseId, lessonId, text }) =>
        storageResult(() => {
          const notes = readStored(key(courseId), notesSchema) ?? {};
          const next: CourseNotes = { ...notes };
          if (text.trim()) next[lessonId] = { text: clampNote(text), updatedAt: new Date().toISOString() };
          else delete next[lessonId];
          writeStored(key(courseId), next);
          return next;
        }),
      async onQueryStarted({ courseId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        void dispatch(notesApi.util.upsertQueryData('getCourseNotes', courseId, data));
      },
    }),
    downloadMarkdown: build.mutation<null, { fileName: string; markdown: string }>({
      queryFn: ({ fileName, markdown }) =>
        storageResult(() => {
          const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
          return null;
        }),
    }),
  }),
});

export const { useGetCourseNotesQuery, useSaveNoteMutation, useDownloadMarkdownMutation } = notesApi;
