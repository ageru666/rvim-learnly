import { categorySchema, type CategoryDto } from '@learnly/contracts/catalog';
import type { CourseStatus } from '@learnly/contracts/enums';
import {
  courseEditorSchema,
  instructorCourseRowSchema,
  instructorOverviewSchema,
  readinessSchema,
  type CourseEditor,
  type CreateCourseInput,
  type InstructorCourseRow,
  type InstructorOverview,
  type Readiness,
  type UpdateCourseInput,
} from '@learnly/contracts/instructor';
import { z } from 'zod';
import { baseApi } from '../../shared/api/baseApi';

export type CourseAction = 'submit' | 'withdraw' | 'archive' | 'restore';

const rowsSchema = z.array(instructorCourseRowSchema);
const categoriesSchema = z.array(categorySchema);
const parseEditor = (response: unknown) => courseEditorSchema.parse(response);
const editorTags = (id: string) => [{ type: 'CourseEditor' as const, id }, { type: 'Readiness' as const, id }, 'TeachCourses' as const];

export const teachCoursesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTeachOverview: build.query<InstructorOverview, void>({
      query: () => '/instructor/overview',
      transformResponse: (response: unknown) => instructorOverviewSchema.parse(response),
      providesTags: ['TeachCourses'],
    }),
    getTeachCourses: build.query<InstructorCourseRow[], CourseStatus | null>({
      query: (status) => ({ url: '/instructor/courses', params: status ? { status } : {} }),
      transformResponse: (response: unknown) => rowsSchema.parse(response),
      providesTags: ['TeachCourses'],
    }),
    getCategories: build.query<CategoryDto[], void>({
      query: () => '/categories',
      transformResponse: (response: unknown) => categoriesSchema.parse(response),
      providesTags: ['Locale'],
    }),
    createCourse: build.mutation<CourseEditor, CreateCourseInput>({
      query: (body) => ({ url: '/instructor/courses', method: 'POST', body }),
      transformResponse: parseEditor,
      invalidatesTags: ['TeachCourses'],
    }),
    getCourseEditor: build.query<CourseEditor, string>({
      query: (id) => `/instructor/courses/${id}`,
      transformResponse: parseEditor,
      providesTags: (_result, _error, id) => [{ type: 'CourseEditor', id }],
    }),
    updateCourse: build.mutation<CourseEditor, { id: string; input: UpdateCourseInput }>({
      query: ({ id, input }) => ({ url: `/instructor/courses/${id}`, method: 'PATCH', body: input }),
      transformResponse: parseEditor,
      invalidatesTags: (_result, _error, { id }) => editorTags(id),
    }),
    uploadCover: build.mutation<CourseEditor, { id: string; file: File }>({
      query: ({ id, file }) => {
        const body = new FormData();
        body.append('file', file);
        return { url: `/instructor/courses/${id}/cover`, method: 'POST', body };
      },
      transformResponse: parseEditor,
      invalidatesTags: (_result, _error, { id }) => editorTags(id),
    }),
    getReadiness: build.query<Readiness, string>({
      query: (id) => `/instructor/courses/${id}/readiness`,
      transformResponse: (response: unknown) => readinessSchema.parse(response),
      providesTags: (_result, _error, id) => [{ type: 'Readiness', id }],
    }),
    courseAction: build.mutation<CourseEditor, { id: string; action: CourseAction }>({
      query: ({ id, action }) => ({ url: `/instructor/courses/${id}/${action}`, method: 'POST' }),
      transformResponse: parseEditor,
      invalidatesTags: (_result, _error, { id }) => editorTags(id),
    }),
    deleteCourse: build.mutation<null, string>({
      query: (id) => ({ url: `/instructor/courses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['TeachCourses'],
    }),
  }),
});

export const {
  useGetTeachOverviewQuery,
  useGetTeachCoursesQuery,
  useGetCategoriesQuery,
  useCreateCourseMutation,
  useGetCourseEditorQuery,
  useUpdateCourseMutation,
  useUploadCoverMutation,
  useGetReadinessQuery,
  useCourseActionMutation,
  useDeleteCourseMutation,
} = teachCoursesApi;
