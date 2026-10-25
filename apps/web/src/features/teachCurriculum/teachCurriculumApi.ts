import {
  lessonEditorSchema,
  moduleDtoSchema,
  type CreateLessonInput,
  type LessonEditor,
  type ModuleDto,
  type StructureInput,
} from '@learnly/contracts/instructor';
import { z } from 'zod';
import { baseApi } from '../../shared/api/baseApi';

const modulesSchema = z.array(moduleDtoSchema);

/** Every change refreshes the course editor and its readiness checklist. */
const courseTags = (courseId: string) => [
  { type: 'CourseEditor' as const, id: courseId },
  { type: 'Readiness' as const, id: courseId },
  'TeachCourses' as const,
];

export const teachCurriculumApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createModule: build.mutation<ModuleDto, { courseId: string; title: string }>({
      query: ({ courseId, title }) => ({ url: `/instructor/courses/${courseId}/modules`, method: 'POST', body: { title } }),
      transformResponse: (response: unknown) => moduleDtoSchema.parse(response),
      invalidatesTags: (_result, _error, { courseId }) => courseTags(courseId),
    }),
    renameModule: build.mutation<ModuleDto, { courseId: string; moduleId: string; title: string }>({
      query: ({ moduleId, title }) => ({ url: `/instructor/modules/${moduleId}`, method: 'PATCH', body: { title } }),
      transformResponse: (response: unknown) => moduleDtoSchema.parse(response),
      invalidatesTags: (_result, _error, { courseId }) => courseTags(courseId),
    }),
    deleteModule: build.mutation<null, { courseId: string; moduleId: string }>({
      query: ({ moduleId }) => ({ url: `/instructor/modules/${moduleId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { courseId }) => courseTags(courseId),
    }),
    setStructure: build.mutation<ModuleDto[], { courseId: string; structure: StructureInput }>({
      query: ({ courseId, structure }) => ({ url: `/instructor/courses/${courseId}/structure`, method: 'PUT', body: structure }),
      transformResponse: (response: unknown) => modulesSchema.parse(response),
      invalidatesTags: (_result, _error, { courseId }) => courseTags(courseId),
    }),
    createLesson: build.mutation<LessonEditor, { courseId: string; moduleId: string; lesson: CreateLessonInput }>({
      query: ({ moduleId, lesson }) => ({ url: `/instructor/modules/${moduleId}/lessons`, method: 'POST', body: lesson }),
      transformResponse: (response: unknown) => lessonEditorSchema.parse(response),
      invalidatesTags: (_result, _error, { courseId }) => courseTags(courseId),
    }),
    setLessonPreview: build.mutation<LessonEditor, { courseId: string; lessonId: string; isPreview: boolean }>({
      query: ({ lessonId, isPreview }) => ({ url: `/instructor/lessons/${lessonId}`, method: 'PATCH', body: { isPreview } }),
      transformResponse: (response: unknown) => lessonEditorSchema.parse(response),
      invalidatesTags: (_result, _error, { courseId, lessonId }) => [...courseTags(courseId), { type: 'LessonEditor', id: lessonId }],
    }),
    deleteLesson: build.mutation<null, { courseId: string; lessonId: string }>({
      query: ({ lessonId }) => ({ url: `/instructor/lessons/${lessonId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { courseId }) => courseTags(courseId),
    }),
  }),
});

export const {
  useCreateModuleMutation,
  useRenameModuleMutation,
  useDeleteModuleMutation,
  useSetStructureMutation,
  useCreateLessonMutation,
  useSetLessonPreviewMutation,
  useDeleteLessonMutation,
} = teachCurriculumApi;
