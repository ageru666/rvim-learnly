import { pageSchema, type Page } from '@learnly/contracts/common';
import { studentRowSchema, type StudentRow, type StudentSort } from '@learnly/contracts/instructor';
import { baseApi } from '../../shared/api/baseApi';

const PAGE_SIZE = 30;
const studentsPageSchema = pageSchema(studentRowSchema);

export interface StudentsFilter {
  courseId: string;
  search: string;
  sort: StudentSort;
}

export const teachStudentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Read page by page as the virtual table scrolls (guideline §4.2). */
    getCourseStudents: build.infiniteQuery<Page<StudentRow>, StudentsFilter, number>({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage) => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined),
      },
      query: ({ queryArg, pageParam }) => ({
        url: `/instructor/courses/${queryArg.courseId}/students`,
        params: { page: pageParam, limit: PAGE_SIZE, sort: queryArg.sort, ...(queryArg.search ? { search: queryArg.search } : {}) },
      }),
      transformResponse: (response: unknown) => studentsPageSchema.parse(response),
      providesTags: (_result, _error, { courseId }) => [{ type: 'CourseStudents', id: courseId }],
    }),
    /** BR-Q3: the author gives a student new attempts. */
    resetAttempts: build.mutation<null, { courseId: string; userId: string; quizId: string }>({
      query: ({ courseId, userId, quizId }) => ({
        url: `/instructor/courses/${courseId}/students/${userId}/attempts/${quizId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { courseId }) => [
        { type: 'CourseStudents', id: courseId },
        { type: 'CourseStats', id: courseId },
      ],
    }),
  }),
});

export const { useGetCourseStudentsInfiniteQuery, useResetAttemptsMutation } = teachStudentsApi;
