import { lessonEditorSchema, type LessonEditor, type UpdateLessonInput } from '@learnly/contracts/instructor';
import { quizEditorSchema, type QuizEditor } from '@learnly/contracts/quizzes';
import { baseApi } from '../../shared/api/baseApi';

const lessonTags = (lessonId: string, courseId: string) => [
  { type: 'LessonEditor' as const, id: lessonId },
  { type: 'CourseEditor' as const, id: courseId },
  { type: 'Readiness' as const, id: courseId },
];

export const teachLessonsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLessonEditor: build.query<LessonEditor, string>({
      query: (lessonId) => `/instructor/lessons/${lessonId}`,
      transformResponse: (response: unknown) => lessonEditorSchema.parse(response),
      providesTags: (_result, _error, lessonId) => [{ type: 'LessonEditor', id: lessonId }],
    }),
    updateLesson: build.mutation<LessonEditor, { lessonId: string; courseId: string; input: UpdateLessonInput }>({
      query: ({ lessonId, input }) => ({ url: `/instructor/lessons/${lessonId}`, method: 'PATCH', body: input }),
      transformResponse: (response: unknown) => lessonEditorSchema.parse(response),
      invalidatesTags: (_result, _error, { lessonId, courseId }) => lessonTags(lessonId, courseId),
    }),
    saveQuiz: build.mutation<QuizEditor, { lessonId: string; courseId: string; quiz: QuizEditor }>({
      query: ({ lessonId, quiz }) => ({ url: `/instructor/lessons/${lessonId}/quiz`, method: 'PUT', body: quiz }),
      transformResponse: (response: unknown) => quizEditorSchema.parse(response),
      invalidatesTags: (_result, _error, { lessonId, courseId }) => lessonTags(lessonId, courseId),
    }),
  }),
});

export const { useGetLessonEditorQuery, useUpdateLessonMutation, useSaveQuizMutation } = teachLessonsApi;
