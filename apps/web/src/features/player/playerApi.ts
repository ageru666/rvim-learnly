import {
  learnCourseSchema,
  lessonContentSchema,
  progressResultSchema,
  type LearnCourse,
  type LessonContent,
  type ProgressResult,
} from '@learnly/contracts/learning';
import { baseApi } from '../../shared/api/baseApi';
import { withCompletion, withServerProgress } from './utils';

interface CompletionArgs {
  courseId: string;
  lessonId: string;
}

const playerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLearnCourse: build.query<LearnCourse, string>({
      query: (courseId) => `/learn/courses/${courseId}`,
      transformResponse: (response: unknown) => learnCourseSchema.parse(response),
      providesTags: (_result, _error, courseId) => [{ type: 'LearnCourse', id: courseId }],
    }),
    getLesson: build.query<LessonContent, string>({
      query: (lessonId) => `/learn/lessons/${lessonId}`,
      transformResponse: (response: unknown) => lessonContentSchema.parse(response),
      providesTags: (_result, _error, lessonId) => [{ type: 'Lesson', id: lessonId }],
    }),
    setLessonCompletion: build.mutation<ProgressResult, CompletionArgs & { completed: boolean }>({
      query: ({ lessonId, completed }) => ({
        url: `/learn/lessons/${lessonId}/completion`,
        method: completed ? 'PUT' : 'DELETE',
      }),
      transformResponse: (response: unknown) => progressResultSchema.parse(response),
      invalidatesTags: ['Dashboard', 'Enrollments', 'Certificates'],
      /** The mark and the progress change at once; a failed request puts them back. */
      async onQueryStarted({ courseId, lessonId, completed }, { dispatch, queryFulfilled }) {
        const coursePatch = dispatch(
          playerApi.util.updateQueryData('getLearnCourse', courseId, (draft) => withCompletion(draft, lessonId, completed)),
        );
        const lessonPatch = dispatch(
          playerApi.util.updateQueryData('getLesson', lessonId, (draft) => {
            draft.completed = completed;
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            playerApi.util.updateQueryData('getLearnCourse', courseId, (draft) => withServerProgress(draft, data)),
          );
          if (data.courseCompleted) dispatch(playerApi.util.invalidateTags([{ type: 'LearnCourse', id: courseId }]));
        } catch {
          coursePatch.undo();
          lessonPatch.undo();
        }
      },
    }),
  }),
});

export const { useGetLearnCourseQuery, useGetLessonQuery, useSetLessonCompletionMutation } = playerApi;
