import { idSchema } from '@learnly/contracts/common';
import {
  createLessonSchema,
  lessonEditorSchema,
  moduleDtoSchema,
  moduleTitleSchema,
  structureSchema,
  updateLessonSchema,
} from '@learnly/contracts/instructor';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { API_PREFIX } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { currentUser, requireRole } from '../../middlewares/requireRole.js';
import { registerRoute } from '../../openapi/registry.js';
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  getLessonForEditor,
  renameModule,
  setStructure,
  updateLesson,
} from './curriculum.service.js';

const TAG = 'Curriculum';
const BASE = `${API_PREFIX}/instructor`;
const idParams = z.object({ id: idSchema });

export const curriculumApiRouter = Router();
curriculumApiRouter.use(BASE, requireRole('instructor', 'admin'));

function id(req: Request): string {
  return parseInput(idParams, req.params, req.i18n).id;
}

registerRoute({
  method: 'post',
  path: `${BASE}/courses/:id/modules`,
  tag: TAG,
  summary: 'Add a module at the end',
  access: 'user',
  params: idParams,
  body: moduleTitleSchema,
  responses: { 201: { description: 'Module', schema: moduleDtoSchema } },
});
curriculumApiRouter.post(`${BASE}/courses/:id/modules`, async (req, res) => {
  const { title } = parseInput(moduleTitleSchema, req.body, req.i18n);
  res.status(201).json(await createModule(currentUser(req), id(req), title));
});

registerRoute({
  method: 'patch',
  path: `${BASE}/modules/:id`,
  tag: TAG,
  summary: 'Rename a module',
  access: 'user',
  params: idParams,
  body: moduleTitleSchema,
  responses: { 200: { description: 'Module', schema: moduleDtoSchema } },
});
curriculumApiRouter.patch(`${BASE}/modules/:id`, async (req, res) => {
  const { title } = parseInput(moduleTitleSchema, req.body, req.i18n);
  res.json(await renameModule(currentUser(req), id(req), title));
});

registerRoute({
  method: 'delete',
  path: `${BASE}/modules/:id`,
  tag: TAG,
  summary: 'Delete a module with its lessons (BR-C3 recalculation)',
  access: 'user',
  params: idParams,
  responses: { 204: { description: 'Deleted' } },
});
curriculumApiRouter.delete(`${BASE}/modules/:id`, async (req, res) => {
  await deleteModule(currentUser(req), id(req));
  res.status(204).end();
});

registerRoute({
  method: 'put',
  path: `${BASE}/courses/:id/structure`,
  tag: TAG,
  summary: 'Reorder modules and lessons, moving lessons between modules',
  access: 'user',
  params: idParams,
  body: structureSchema,
  responses: { 200: { description: 'Modules', schema: z.array(moduleDtoSchema) } },
});
curriculumApiRouter.put(`${BASE}/courses/:id/structure`, async (req, res) => {
  res.json(await setStructure(currentUser(req), id(req), parseInput(structureSchema, req.body, req.i18n)));
});

registerRoute({
  method: 'post',
  path: `${BASE}/modules/:id/lessons`,
  tag: TAG,
  summary: 'Add a lesson at the end of a module; a quiz lesson gets an empty quiz',
  access: 'user',
  params: idParams,
  body: createLessonSchema,
  responses: { 201: { description: 'Lesson', schema: lessonEditorSchema } },
});
curriculumApiRouter.post(`${BASE}/modules/:id/lessons`, async (req, res) => {
  res.status(201).json(await createLesson(currentUser(req), id(req), parseInput(createLessonSchema, req.body, req.i18n)));
});

registerRoute({
  method: 'get',
  path: `${BASE}/lessons/:id`,
  tag: TAG,
  summary: 'Lesson for the editor',
  access: 'user',
  params: idParams,
  responses: { 200: { description: 'Lesson', schema: lessonEditorSchema } },
});
curriculumApiRouter.get(`${BASE}/lessons/:id`, async (req, res) => {
  res.json(await getLessonForEditor(currentUser(req), id(req)));
});

registerRoute({
  method: 'patch',
  path: `${BASE}/lessons/:id`,
  tag: TAG,
  summary: 'Edit a lesson; the type is locked once students completed or attempted it',
  access: 'user',
  params: idParams,
  body: updateLessonSchema,
  responses: { 200: { description: 'Lesson', schema: lessonEditorSchema } },
});
curriculumApiRouter.patch(`${BASE}/lessons/:id`, async (req, res) => {
  res.json(await updateLesson(currentUser(req), id(req), parseInput(updateLessonSchema, req.body, req.i18n)));
});

registerRoute({
  method: 'delete',
  path: `${BASE}/lessons/:id`,
  tag: TAG,
  summary: 'Delete a lesson; completions and attempts go with it (BR-C3)',
  access: 'user',
  params: idParams,
  responses: { 204: { description: 'Deleted' } },
});
curriculumApiRouter.delete(`${BASE}/lessons/:id`, async (req, res) => {
  await deleteLesson(currentUser(req), id(req));
  res.status(204).end();
});
