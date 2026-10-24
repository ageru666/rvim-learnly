import { changeEmailSchema, changePasswordSchema } from '@learnly/contracts/auth';
import { pageSchema } from '@learnly/contracts/common';
import { dashboardSchema, myCourseSchema, myCoursesQuerySchema } from '@learnly/contracts/learning';
import { meSchema, updateMeSchema } from '@learnly/contracts/me';
import { Router } from 'express';
import { COOKIES, readCookie, setPreferenceCookie } from '../../lib/cookies.js';
import { API_PREFIX } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { currentUser, requireAuth } from '../../middlewares/requireRole.js';
import { registerRoute } from '../../openapi/registry.js';
import { getDashboard, listMyCourses } from '../learning/enrollment.service.js';
import { changePassword, getMe, requestEmailChange, updateLocale } from './users.service.js';

const TAG = 'Me';
const ME = `${API_PREFIX}/me`;

export const meApiRouter = Router();
meApiRouter.use(ME, requireAuth);

registerRoute({
  method: 'get',
  path: ME,
  tag: TAG,
  summary: 'The signed-in user',
  access: 'user',
  responses: { 200: { description: 'Me', schema: meSchema } },
});
meApiRouter.get(ME, async (req, res) => {
  res.json(await getMe(currentUser(req).id));
});

registerRoute({
  method: 'patch',
  path: ME,
  tag: TAG,
  summary: 'Update the account; `locale` also becomes the language of this device',
  access: 'user',
  body: updateMeSchema,
  responses: { 200: { description: 'Me', schema: meSchema } },
});
meApiRouter.patch(ME, async (req, res) => {
  const input = parseInput(updateMeSchema, req.body, req.i18n);
  const userId = currentUser(req).id;
  if (input.locale) {
    await updateLocale(userId, input.locale);
    setPreferenceCookie(res, COOKIES.locale, input.locale);
  }
  res.json(await getMe(userId));
});

registerRoute({
  method: 'put',
  path: `${ME}/password`,
  tag: TAG,
  summary: 'Change the password; every other session ends',
  access: 'user',
  body: changePasswordSchema,
  responses: { 204: { description: 'Changed' } },
});
meApiRouter.put(`${ME}/password`, async (req, res) => {
  const input = parseInput(changePasswordSchema, req.body, req.i18n);
  const keep = input.refreshToken ?? readCookie(req, COOKIES.refresh);
  await changePassword(currentUser(req).id, input, keep);
  res.status(204).end();
});

registerRoute({
  method: 'post',
  path: `${ME}/email`,
  tag: TAG,
  summary: 'Request an email change; it applies after the new address is confirmed',
  access: 'user',
  body: changeEmailSchema,
  responses: { 204: { description: 'Confirmation sent to the new address' }, 409: { description: 'The email is taken' } },
});
meApiRouter.post(`${ME}/email`, async (req, res) => {
  await requestEmailChange(currentUser(req).id, parseInput(changeEmailSchema, req.body, req.i18n));
  res.status(204).end();
});

registerRoute({
  method: 'get',
  path: `${ME}/dashboard`,
  tag: TAG,
  summary: 'Continue learning, active courses and recommendations',
  access: 'user',
  responses: { 200: { description: 'Dashboard', schema: dashboardSchema } },
});
meApiRouter.get(`${ME}/dashboard`, async (req, res) => {
  res.json(await getDashboard(currentUser(req).id, req.locale));
});

registerRoute({
  method: 'get',
  path: `${ME}/enrollments`,
  tag: TAG,
  summary: 'My courses, newest activity first',
  access: 'user',
  query: myCoursesQuerySchema,
  responses: { 200: { description: 'A page of my courses', schema: pageSchema(myCourseSchema) } },
});
meApiRouter.get(`${ME}/enrollments`, async (req, res) => {
  const query = parseInput(myCoursesQuerySchema, req.query, req.i18n);
  res.json(await listMyCourses(currentUser(req).id, query, req.locale));
});
