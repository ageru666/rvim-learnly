import { pageSchema, type Page } from '@learnly/contracts/common';
import type { EnrollmentStatus } from '@learnly/contracts/enums';
import {
  dashboardSchema,
  enrollResultSchema,
  myCourseSchema,
  type Dashboard,
  type EnrollResult,
  type MyCourse,
} from '@learnly/contracts/learning';
import { baseApi } from '../../shared/api/baseApi';

/** One page holds every enrollment of a status; search runs on the client (instant, no request per key). */
const MY_COURSES_LIMIT = 100;
const myCoursesPageSchema = pageSchema(myCourseSchema);

export const enrollmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboard: build.query<Dashboard, void>({
      query: () => '/me/dashboard',
      transformResponse: (response: unknown) => dashboardSchema.parse(response),
      providesTags: ['Dashboard', 'Locale'],
    }),
    getMyCourses: build.query<Page<MyCourse>, EnrollmentStatus>({
      query: (status) => ({ url: '/me/enrollments', params: { status, limit: MY_COURSES_LIMIT } }),
      transformResponse: (response: unknown) => myCoursesPageSchema.parse(response),
      providesTags: ['Enrollments', 'Locale'],
    }),
    enroll: build.mutation<EnrollResult, string>({
      query: (courseId) => ({ url: `/courses/${courseId}/enrollment`, method: 'POST' }),
      transformResponse: (response: unknown) => enrollResultSchema.parse(response),
      invalidatesTags: ['Dashboard', 'Enrollments'],
    }),
    leaveCourse: build.mutation<null, string>({
      query: (courseId) => ({ url: `/courses/${courseId}/enrollment`, method: 'DELETE' }),
      invalidatesTags: ['Dashboard', 'Enrollments', 'LearnCourse'],
    }),
  }),
});

export const { useGetDashboardQuery, useGetMyCoursesQuery, useEnrollMutation, useLeaveCourseMutation } = enrollmentsApi;
