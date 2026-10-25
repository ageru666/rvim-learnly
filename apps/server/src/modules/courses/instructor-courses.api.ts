import { idSchema } from '@learnly/contracts/common';
import {
  courseEditorSchema,
  createCourseSchema,
  instructorCourseRowSchema,
  instructorCoursesQuerySchema,
  instructorOverviewSchema,
  readinessSchema,
  updateCourseSchema,
} from '@learnly/contracts/instructor';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import { API_PREFIX } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { currentUser, requireRole } from '../../middlewares/requireRole.js';
import { coverUpload } from '../../middlewares/upload.js';
import { registerRoute } from '../../openapi/registry.js';
import type { AuthUser } from '../auth/auth.types.js';
import {
  archiveCourse,
  createCourse,
  deleteCourse,
  getEditor,
  getOverview,
  getReadiness,
  listMyCourses,
  restoreCourse,
  submitCourse,
  updateCourse,
  uploadCover,
  withdrawCourse,
} from './courses.service.js';

const TAG = 'Teaching';
const COURSES = `${API_PREFIX}/instructor/courses`;
const idParams = z.object({ id: idSchema });

export const instructorCoursesApiRouter = Router();
instructorCoursesApiRouter.use(`${API_PREFIX}/instructor`, requireRole('instructor', 'admin'));

function courseId(req: Request): string {
  return parseInput(idParams, req.params, req.i18n).id;
}

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/instructor/overview`,
  tag: TAG,
  summary: 'Instructor dashboard summary (FR-TEACH-1)',
  access: 'user',
  responses: { 200: { description: 'Summary', schema: instructorOverviewSchema } },
});
instructorCoursesApiRouter.get(`${API_PREFIX}/instructor/overview`, async (req, res) => {
  res.json(await getOverview(currentUser(req)));
});

registerRoute({
  method: 'get',
  path: COURSES,
  tag: TAG,
  summary: 'My courses, recently changed first',
  access: 'user',
  query: instructorCoursesQuerySchema,
  responses: { 200: { description: 'Courses', schema: z.array(instructorCourseRowSchema) } },
});
instructorCoursesApiRouter.get(COURSES, async (req, res) => {
  const { status } = parseInput(instructorCoursesQuerySchema, req.query, req.i18n);
  res.json(await listMyCourses(currentUser(req), status));
});

registerRoute({
  method: 'post',
  path: COURSES,
  tag: TAG,
  summary: 'Create a draft course (FR-TEACH-2)',
  access: 'user',
  body: createCourseSchema,
  responses: { 201: { description: 'Course', schema: courseEditorSchema } },
});
instructorCoursesApiRouter.post(COURSES, async (req, res) => {
  res.status(201).json(await createCourse(currentUser(req), parseInput(createCourseSchema, req.body, req.i18n)));
});

registerRoute({
  method: 'get',
  path: `${COURSES}/:id`,
  tag: TAG,
  summary: 'Course for the editor',
  access: 'user',
  params: idParams,
  responses: { 200: { description: 'Course', schema: courseEditorSchema } },
});
instructorCoursesApiRouter.get(`${COURSES}/:id`, async (req, res) => {
  res.json(await getEditor(currentUser(req), courseId(req)));
});

registerRoute({
  method: 'patch',
  path: `${COURSES}/:id`,
  tag: TAG,
  summary: 'Edit the course basics; 409 for a taken slug, 422 when the status forbids editing',
  access: 'user',
  params: idParams,
  body: updateCourseSchema,
  responses: { 200: { description: 'Course', schema: courseEditorSchema }, 409: { description: 'Slug taken' } },
});
instructorCoursesApiRouter.patch(`${COURSES}/:id`, async (req, res) => {
  res.json(await updateCourse(currentUser(req), courseId(req), parseInput(updateCourseSchema, req.body, req.i18n)));
});

registerRoute({
  method: 'delete',
  path: `${COURSES}/:id`,
  tag: TAG,
  summary: 'Delete a never-enrolled draft (BR-P5)',
  access: 'user',
  params: idParams,
  responses: { 204: { description: 'Deleted' } },
});
instructorCoursesApiRouter.delete(`${COURSES}/:id`, async (req, res) => {
  await deleteCourse(currentUser(req), courseId(req));
  res.status(204).end();
});

registerRoute({
  method: 'post',
  path: `${COURSES}/:id/cover`,
  tag: TAG,
  summary: 'Upload the cover (JPG/PNG/WebP, up to 2 MB; stored as 1280×720 WebP)',
  access: 'user',
  params: idParams,
  body: z.object({ file: z.string().meta({ format: 'binary' }) }),
  bodyContentType: 'multipart/form-data',
  responses: { 200: { description: 'Course', schema: courseEditorSchema } },
});
instructorCoursesApiRouter.post(`${COURSES}/:id/cover`, coverUpload, async (req, res) => {
  if (!req.file) throw new AppError('VALIDATION_ERROR', 'errors.upload.invalidType');
  res.json(await uploadCover(currentUser(req), courseId(req), req.file.buffer));
});

registerRoute({
  method: 'get',
  path: `${COURSES}/:id/readiness`,
  tag: TAG,
  summary: 'BR-P1 checklist',
  access: 'user',
  params: idParams,
  responses: { 200: { description: 'Readiness', schema: readinessSchema } },
});
instructorCoursesApiRouter.get(`${COURSES}/:id/readiness`, async (req, res) => {
  res.json(await getReadiness(currentUser(req), courseId(req)));
});

const LIFECYCLE: Record<string, { summary: string; run: (user: AuthUser, id: string) => Promise<unknown> }> = {
  submit: { summary: 'Submit for moderation (BR-P1, BR-U4)', run: submitCourse },
  withdraw: { summary: 'Withdraw from review back to the draft (BR-P2)', run: withdrawCourse },
  archive: { summary: 'Archive a published course (BR-P4)', run: archiveCourse },
  restore: { summary: 'Restore an archived course (BR-P4)', run: restoreCourse },
};

for (const [action, { summary, run }] of Object.entries(LIFECYCLE)) {
  registerRoute({
    method: 'post',
    path: `${COURSES}/:id/${action}`,
    tag: TAG,
    summary,
    access: 'user',
    params: idParams,
    responses: { 200: { description: 'Course', schema: courseEditorSchema } },
  });
  instructorCoursesApiRouter.post(`${COURSES}/:id/${action}`, async (req, res) => {
    res.json(await run(currentUser(req), courseId(req)));
  });
}
