import {
  adminApplicationSchema,
  adminApplicationsQuerySchema,
  adminCategorySchema,
  adminCertificateSchema,
  adminCertificatesQuerySchema,
  adminCourseRowSchema,
  adminCoursesQuerySchema,
  adminReviewSchema,
  adminReviewsQuerySchema,
  adminStatsSchema,
  adminUserDetailSchema,
  adminUserRowSchema,
  adminUsersQuerySchema,
  auditEntrySchema,
  auditQuerySchema,
  categoryInputSchema,
  reasonSchema,
  roleChangeSchema,
} from '@learnly/contracts/admin';
import { idSchema, pageSchema } from '@learnly/contracts/common';
import { courseStatusSchema } from '@learnly/contracts/enums';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { API_PREFIX } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { currentUser, requireRole } from '../../middlewares/requireRole.js';
import { registerRoute, type RouteSpec } from '../../openapi/registry.js';
import { getAdminStats } from '../stats/admin-stats.service.js';
import { decideApplication, getApplication, listApplications } from './admin-applications.service.js';
import { createCategory, deleteCategory, listAdminCategories, updateCategory } from './admin-categories.service.js';
import { listAdminCertificates, listAdminReviews, revokeCertificate, setReviewHidden } from './admin-content.service.js';
import { getModerationCourse, listAdminCourses, moderateCourse } from './admin-courses.service.js';
import { blockUser, changeRole, getUserDetail, listUsers, unblockUser } from './admin-users.service.js';
import { listAudit } from './audit-log.service.js';

const TAG = 'Admin';
const ADMIN = `${API_PREFIX}/admin`;
const idParams = z.object({ id: idSchema });
const codeParams = z.object({ code: z.string() });

export const adminApiRouter = Router();
adminApiRouter.use(ADMIN, requireRole('admin'));

function describe(spec: Omit<RouteSpec, 'tag' | 'access'>): void {
  registerRoute({ ...spec, tag: TAG, access: 'user' });
}

const id = (req: Request) => parseInput(idParams, req.params, req.i18n).id;
const reason = (req: Request) => parseInput(reasonSchema, req.body, req.i18n).reason;

describe({ method: 'get', path: `${ADMIN}/stats`, summary: 'Dashboard cards, 30-day series, top courses, recent audit', responses: { 200: { description: 'Stats', schema: adminStatsSchema } } });
adminApiRouter.get(`${ADMIN}/stats`, async (req, res) => {
  res.json(await getAdminStats(req.locale));
});

describe({ method: 'get', path: `${ADMIN}/users`, summary: 'Users with search and filters', query: adminUsersQuerySchema, responses: { 200: { description: 'Users', schema: pageSchema(adminUserRowSchema) } } });
adminApiRouter.get(`${ADMIN}/users`, async (req, res) => {
  res.json(await listUsers(parseInput(adminUsersQuerySchema, req.query, req.i18n)));
});

describe({ method: 'get', path: `${ADMIN}/users/:id`, summary: 'User card', params: idParams, responses: { 200: { description: 'User', schema: adminUserDetailSchema } } });
adminApiRouter.get(`${ADMIN}/users/:id`, async (req, res) => {
  res.json(await getUserDetail(id(req)));
});

describe({ method: 'patch', path: `${ADMIN}/users/:id/role`, summary: 'Change the role (BR-U3, not oneself)', params: idParams, body: roleChangeSchema, responses: { 200: { description: 'User', schema: adminUserRowSchema } } });
adminApiRouter.patch(`${ADMIN}/users/:id/role`, async (req, res) => {
  const { role } = parseInput(roleChangeSchema, req.body, req.i18n);
  res.json(await changeRole(currentUser(req), id(req), role));
});

describe({ method: 'post', path: `${ADMIN}/users/:id/block`, summary: 'Block a user with a reason; their sessions end', params: idParams, body: reasonSchema, responses: { 200: { description: 'User', schema: adminUserRowSchema } } });
adminApiRouter.post(`${ADMIN}/users/:id/block`, async (req, res) => {
  res.json(await blockUser(currentUser(req), id(req), reason(req)));
});

describe({ method: 'post', path: `${ADMIN}/users/:id/unblock`, summary: 'Unblock a user', params: idParams, responses: { 200: { description: 'User', schema: adminUserRowSchema } } });
adminApiRouter.post(`${ADMIN}/users/:id/unblock`, async (req, res) => {
  res.json(await unblockUser(currentUser(req), id(req)));
});

describe({ method: 'get', path: `${ADMIN}/courses`, summary: 'All courses with a status filter', query: adminCoursesQuerySchema, responses: { 200: { description: 'Courses', schema: pageSchema(adminCourseRowSchema) } } });
adminApiRouter.get(`${ADMIN}/courses`, async (req, res) => {
  res.json(await listAdminCourses(parseInput(adminCoursesQuerySchema, req.query, req.i18n), req.locale));
});

describe({ method: 'get', path: `${ADMIN}/courses/:id`, summary: 'Full course for moderation, with lesson content and correct answers', params: idParams, responses: { 200: { description: 'Course' } } });
adminApiRouter.get(`${ADMIN}/courses/:id`, async (req, res) => {
  res.json(await getModerationCourse(id(req)));
});

const statusResult = z.object({ status: courseStatusSchema });

describe({ method: 'post', path: `${ADMIN}/courses/:id/approve`, summary: 'Approve and publish', params: idParams, responses: { 200: { description: 'New status', schema: statusResult } } });
adminApiRouter.post(`${ADMIN}/courses/:id/approve`, async (req, res) => {
  res.json({ status: await moderateCourse(currentUser(req), id(req), 'approve', null) });
});

for (const action of ['reject', 'unpublish'] as const) {
  describe({ method: 'post', path: `${ADMIN}/courses/:id/${action}`, summary: `${action === 'reject' ? 'Reject' : 'Unpublish'} with a reason`, params: idParams, body: reasonSchema, responses: { 200: { description: 'New status', schema: statusResult } } });
  adminApiRouter.post(`${ADMIN}/courses/:id/${action}`, async (req, res) => {
    res.json({ status: await moderateCourse(currentUser(req), id(req), action, reason(req)) });
  });
}

describe({ method: 'get', path: `${ADMIN}/instructor-applications`, summary: 'Applications with a status filter', query: adminApplicationsQuerySchema, responses: { 200: { description: 'Applications', schema: pageSchema(adminApplicationSchema) } } });
adminApiRouter.get(`${ADMIN}/instructor-applications`, async (req, res) => {
  res.json(await listApplications(parseInput(adminApplicationsQuerySchema, req.query, req.i18n)));
});

describe({ method: 'get', path: `${ADMIN}/instructor-applications/:id`, summary: 'Application', params: idParams, responses: { 200: { description: 'Application', schema: adminApplicationSchema } } });
adminApiRouter.get(`${ADMIN}/instructor-applications/:id`, async (req, res) => {
  res.json(await getApplication(id(req)));
});

describe({ method: 'post', path: `${ADMIN}/instructor-applications/:id/approve`, summary: 'Approve: the user becomes an instructor', params: idParams, responses: { 200: { description: 'Application', schema: adminApplicationSchema } } });
adminApiRouter.post(`${ADMIN}/instructor-applications/:id/approve`, async (req, res) => {
  res.json(await decideApplication(currentUser(req), id(req), true, null));
});

describe({ method: 'post', path: `${ADMIN}/instructor-applications/:id/reject`, summary: 'Reject with a comment', params: idParams, body: reasonSchema, responses: { 200: { description: 'Application', schema: adminApplicationSchema } } });
adminApiRouter.post(`${ADMIN}/instructor-applications/:id/reject`, async (req, res) => {
  res.json(await decideApplication(currentUser(req), id(req), false, reason(req)));
});

describe({ method: 'get', path: `${ADMIN}/categories`, summary: 'Categories with course counts', responses: { 200: { description: 'Categories', schema: z.array(adminCategorySchema) } } });
adminApiRouter.get(`${ADMIN}/categories`, async (_req, res) => {
  res.json(await listAdminCategories());
});

describe({ method: 'post', path: `${ADMIN}/categories`, summary: 'Create a category (names in both languages)', body: categoryInputSchema, responses: { 201: { description: 'Created' } } });
adminApiRouter.post(`${ADMIN}/categories`, async (req, res) => {
  await createCategory(currentUser(req), parseInput(categoryInputSchema, req.body, req.i18n));
  res.status(201).end();
});

describe({ method: 'patch', path: `${ADMIN}/categories/:id`, summary: 'Update a category', params: idParams, body: categoryInputSchema, responses: { 204: { description: 'Updated' } } });
adminApiRouter.patch(`${ADMIN}/categories/:id`, async (req, res) => {
  await updateCategory(currentUser(req), id(req), parseInput(categoryInputSchema, req.body, req.i18n));
  res.status(204).end();
});

describe({ method: 'delete', path: `${ADMIN}/categories/:id`, summary: 'Delete a category without courses', params: idParams, responses: { 204: { description: 'Deleted' } } });
adminApiRouter.delete(`${ADMIN}/categories/:id`, async (req, res) => {
  await deleteCategory(currentUser(req), id(req));
  res.status(204).end();
});

describe({ method: 'get', path: `${ADMIN}/reviews`, summary: 'Reviews with rating and status filters', query: adminReviewsQuerySchema, responses: { 200: { description: 'Reviews', schema: pageSchema(adminReviewSchema) } } });
adminApiRouter.get(`${ADMIN}/reviews`, async (req, res) => {
  res.json(await listAdminReviews(parseInput(adminReviewsQuerySchema, req.query, req.i18n)));
});

describe({ method: 'post', path: `${ADMIN}/reviews/:id/hide`, summary: 'Hide a review with a reason', params: idParams, body: reasonSchema, responses: { 204: { description: 'Hidden' } } });
adminApiRouter.post(`${ADMIN}/reviews/:id/hide`, async (req, res) => {
  await setReviewHidden(currentUser(req), id(req), true, reason(req));
  res.status(204).end();
});

describe({ method: 'post', path: `${ADMIN}/reviews/:id/unhide`, summary: 'Show a hidden review again', params: idParams, responses: { 204: { description: 'Shown' } } });
adminApiRouter.post(`${ADMIN}/reviews/:id/unhide`, async (req, res) => {
  await setReviewHidden(currentUser(req), id(req), false, null);
  res.status(204).end();
});

describe({ method: 'get', path: `${ADMIN}/certificates`, summary: 'Certificates by code or student name', query: adminCertificatesQuerySchema, responses: { 200: { description: 'Certificates', schema: pageSchema(adminCertificateSchema) } } });
adminApiRouter.get(`${ADMIN}/certificates`, async (req, res) => {
  res.json(await listAdminCertificates(parseInput(adminCertificatesQuerySchema, req.query, req.i18n)));
});

describe({ method: 'post', path: `${ADMIN}/certificates/:code/revoke`, summary: 'Revoke a certificate with a reason', params: codeParams, body: reasonSchema, responses: { 200: { description: 'Certificate', schema: adminCertificateSchema } } });
adminApiRouter.post(`${ADMIN}/certificates/:code/revoke`, async (req, res) => {
  const { code } = parseInput(codeParams, req.params, req.i18n);
  res.json(await revokeCertificate(currentUser(req), code.toUpperCase(), reason(req)));
});

describe({ method: 'get', path: `${ADMIN}/audit-log`, summary: 'Audit log with filters', query: auditQuerySchema, responses: { 200: { description: 'Entries', schema: pageSchema(auditEntrySchema) } } });
adminApiRouter.get(`${ADMIN}/audit-log`, async (req, res) => {
  res.json(await listAudit(parseInput(auditQuerySchema, req.query, req.i18n)));
});
