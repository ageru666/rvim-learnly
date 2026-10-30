import { courseStatsSchema, type CourseStats } from '@learnly/contracts/instructor';
import { baseApi } from '../../shared/api/baseApi';

const teachStatsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCourseStats: build.query<CourseStats, string>({
      query: (courseId) => `/instructor/courses/${courseId}/stats`,
      transformResponse: (response: unknown) => courseStatsSchema.parse(response),
      providesTags: (_result, _error, courseId) => [{ type: 'CourseStats', id: courseId }],
    }),
  }),
});

export const { useGetCourseStatsQuery } = teachStatsApi;
