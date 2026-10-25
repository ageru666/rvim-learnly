import {
  attemptResultSchema,
  attemptSummarySchema,
  quizForStudentSchema,
  type Answers,
  type AttemptResult,
  type AttemptSummary,
  type QuizForStudent,
} from '@learnly/contracts/quizzes';
import { z } from 'zod';
import { baseApi } from '../../shared/api/baseApi';

const attemptsSchema = z.array(attemptSummarySchema);

interface SubmitArgs {
  quizId: string;
  courseId: string;
  answers: Answers;
}

export const quizzesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getQuiz: build.query<QuizForStudent, string>({
      query: (quizId) => `/learn/quizzes/${quizId}`,
      transformResponse: (response: unknown) => quizForStudentSchema.parse(response),
      providesTags: (_result, _error, quizId) => [{ type: 'Quiz', id: quizId }],
    }),
    getAttempts: build.query<AttemptSummary[], string>({
      query: (quizId) => `/learn/quizzes/${quizId}/attempts`,
      transformResponse: (response: unknown) => attemptsSchema.parse(response),
      providesTags: (_result, _error, quizId) => [{ type: 'QuizAttempts', id: quizId }],
    }),
    /** Grading happens on the server only (FR-QUIZ-5); passing completes the lesson in the curriculum. */
    submitAttempt: build.mutation<AttemptResult, SubmitArgs>({
      query: ({ quizId, answers }) => ({ url: `/learn/quizzes/${quizId}/attempts`, method: 'POST', body: { answers } }),
      transformResponse: (response: unknown) => attemptResultSchema.parse(response),
      invalidatesTags: (_result, _error, { quizId, courseId }) => [
        { type: 'Quiz', id: quizId },
        { type: 'QuizAttempts', id: quizId },
        { type: 'LearnCourse', id: courseId },
        'Dashboard',
        'Enrollments',
        'Certificates',
      ],
    }),
  }),
});

export const { useGetQuizQuery, useGetAttemptsQuery, useSubmitAttemptMutation } = quizzesApi;
