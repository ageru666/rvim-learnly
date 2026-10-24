import { idSchema } from '@learnly/contracts/common';
import {
  enrollResultSchema,
  learnCourseSchema,
  lessonContentSchema,
  progressResultSchema,
} from '@learnly/contracts/learning';
import { Router } from 'express';
import { z } from 'zod';
import { API_PREFIX } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { currentUser, requireAuth } from '../../middlewares/requireRole.js';
import { registerRoute } from '../../openapi/registry.js';
import { enroll, leave } from './enrollment.service.js';
import { completeLesson, getLearnCourse, openLesson, uncompleteLesson } from './progress.service.js';

const TAG = 'Learning';
const idParams = z.object({ id: idSchema });
const courseParams = z.object({ courseId: idSchema });
const lessonParams = z.object({ lessonId: idSchema });

export const learningApiRouter = Router();

registerRoute({
  method: 'post',
  path: `${API_PREFIX}/courses/:id/enrollment`,
  tag: TAG,
  summary: 'Enroll in a published course (BR-E1, BR-E2)',
  access: 'user',
  params: idParams,
  responses: {
    201: { description: 'Enrolled', schema: enrollResultSchema },
    409: { description: 'Already enrolled' },
  },
});
learningApiRouter.post(`${API_PREFIX}/courses/:id/enrollment`, requireAuth, async (req, res) => {
  const { id } = parseInput(idParams, req.params, req.i18n);
  res.status(201).json(await enroll(currentUser(req).id, id));
});

registerRoute({
  method: 'delete',
  path: `${API_PREFIX}/courses/:id/enrollment`,
  tag: TAG,
  summary: 'Leave a course; the progress is deleted (not possible with a certificate)',
  access: 'user',
  params: idParams,
  responses: { 204: { description: 'Left' } },
});
learningApiRouter.delete(`${API_PREFIX}/courses/:id/enrollment`, requireAuth, async (req, res) => {
  const { id } = parseInput(idParams, req.params, req.i18n);
  await leave(currentUser(req).id, id);
  res.status(204).end();
});

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/learn/courses/:courseId`,
  tag: TAG,
  summary: 'Curriculum with completion marks; `mode: preview` for the author and administrators',
  access: 'user',
  params: courseParams,
  responses: { 200: { description: 'Course in the player', schema: learnCourseSchema } },
});
learningApiRouter.get(`${API_PREFIX}/learn/courses/:courseId`, requireAuth, async (req, res) => {
  const { courseId } = parseInput(courseParams, req.params, req.i18n);
  res.json(await getLearnCourse(currentUser(req), courseId));
});

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/learn/lessons/:lessonId`,
  tag: TAG,
  summary: 'Lesson content; remembered as the last opened lesson (BR-E3)',
  access: 'user',
  params: lessonParams,
  responses: { 200: { description: 'Lesson', schema: lessonContentSchema } },
});
learningApiRouter.get(`${API_PREFIX}/learn/lessons/:lessonId`, requireAuth, async (req, res) => {
  const { lessonId } = parseInput(lessonParams, req.params, req.i18n);
  res.json(await openLesson(currentUser(req), lessonId));
});

registerRoute({
  method: 'put',
  path: `${API_PREFIX}/learn/lessons/:lessonId/completion`,
  tag: TAG,
  summary: 'Mark a text or video lesson as completed (BR-L1)',
  access: 'user',
  params: lessonParams,
  responses: { 200: { description: 'Progress', schema: progressResultSchema } },
});
learningApiRouter.put(`${API_PREFIX}/learn/lessons/:lessonId/completion`, requireAuth, async (req, res) => {
  const { lessonId } = parseInput(lessonParams, req.params, req.i18n);
  res.json(await completeLesson(currentUser(req), lessonId));
});

registerRoute({
  method: 'delete',
  path: `${API_PREFIX}/learn/lessons/:lessonId/completion`,
  tag: TAG,
  summary: 'Remove the completion mark; not for quiz lessons (BR-L2)',
  access: 'user',
  params: lessonParams,
  responses: { 200: { description: 'Progress', schema: progressResultSchema } },
});
learningApiRouter.delete(`${API_PREFIX}/learn/lessons/:lessonId/completion`, requireAuth, async (req, res) => {
  const { lessonId } = parseInput(lessonParams, req.params, req.i18n);
  res.json(await uncompleteLesson(currentUser(req), lessonId));
});
