import {
  adminApplicationsQuerySchema,
  adminCertificatesQuerySchema,
  adminCoursesQuerySchema,
  adminReviewsQuerySchema,
  adminUsersQuerySchema,
  auditQuerySchema,
  categoryInputSchema,
  reasonSchema,
  roleChangeSchema,
} from '@learnly/contracts/admin';
import { idSchema } from '@learnly/contracts/common';
import {
  ACCENTS,
  APPLICATION_STATUSES,
  AUDIT_ACTIONS,
  COURSE_STATUSES,
  REVIEW_STATUSES,
  ROLES,
  USER_STATUSES,
} from '@learnly/contracts/enums';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import { AppError } from '../../lib/errors.js';
import { setFlash } from '../../lib/flash.js';
import { safeReturnTo } from '../../lib/http.js';
import { renderMarkdown } from '../../lib/markdown.js';
import { renderPage } from '../../lib/render.js';
import { parseInput } from '../../lib/validation.js';
import { currentUser, requireRole } from '../../middlewares/requireRole.js';
import { getAdminStats } from '../stats/admin-stats.service.js';
import { decideApplication, getApplication, listApplications } from './admin-applications.service.js';
import { createCategory, deleteCategory, listAdminCategories, updateCategory } from './admin-categories.service.js';
import { listAdminCertificates, listAdminReviews, revokeCertificate, setReviewHidden } from './admin-content.service.js';
import { getModerationCourse, listAdminCourses, moderateCourse, moderationQueue, type ModerationAction } from './admin-courses.service.js';
import { blockUser, changeRole, getUserDetail, listUsers, unblockUser } from './admin-users.service.js';
import { listAdmins, listAudit } from './audit-log.service.js';

const idParams = z.object({ id: idSchema });
const codeParams = z.object({ code: z.string() });

export const adminWebRouter = Router();
adminWebRouter.use('/admin', requireRole('admin'), loadCounters);

/** Sidebar counters: work that waits for an administrator. */
async function loadCounters(_req: Request, res: Response, next: NextFunction): Promise<void> {
  const [pending, applications] = await Promise.all([
    db.course.count({ where: { status: 'pending_review' } }),
    db.instructorApplication.count({ where: { status: 'pending' } }),
  ]);
  res.locals.adminCounters = { pending, applications };
  next();
}

type Section = 'dashboard' | 'users' | 'moderation' | 'courses' | 'applications' | 'categories' | 'reviews' | 'certificates' | 'audit';

function page(req: Request, res: Response, view: string, section: Section, data: Record<string, unknown> = {}, title?: string) {
  return renderPage(
    res,
    `admin/${view}`,
    { ...data, adminSection: section, pageHref: pageHref(req) },
    { title: title ?? req.i18n.t(`admin.panel.${section}`), layout: 'admin' },
  );
}

/** Pagination links keep the current filters. */
function pageHref(req: Request) {
  return (pageNumber: number) => {
    const params = new URLSearchParams(req.query as Record<string, string>);
    params.set('page', String(pageNumber));
    return `${req.path}?${params.toString()}`;
  };
}

function totalPages(result: { total: number; limit: number }): number {
  return Math.max(1, Math.ceil(result.total / result.limit));
}

/**
 * Every admin action is a POST form (PRG): the outcome is a flash message on the page the form came
 * from. Expected failures (a rule, a short reason) are shown, unexpected ones go to the error handler.
 */
async function act(req: Request, res: Response, fallback: string, work: () => Promise<unknown>) {
  const body = req.body as Record<string, unknown>;
  try {
    await work();
    setFlash(res, { kind: 'success', key: 'admin.common.done' });
  } catch (error) {
    if (!(error instanceof AppError) || error.code === 'INTERNAL') throw error;
    setFlash(res, { kind: 'error', key: error.messageKey, params: error.options.params });
  }
  res.redirect(303, safeReturnTo(body.returnTo, fallback));
}

const id = (req: Request) => parseInput(idParams, req.params, req.i18n).id;
const reason = (req: Request) => parseInput(reasonSchema, req.body, req.i18n).reason;

adminWebRouter.get('/admin', async (req, res) => {
  const stats = await getAdminStats(req.locale);
  await page(req, res, 'dashboard', 'dashboard', { stats });
});

adminWebRouter.get('/admin/users', async (req, res) => {
  const query = parseInput(adminUsersQuerySchema, req.query, req.i18n);
  const result = await listUsers(query);
  await page(req, res, 'users', 'users', { query, result, totalPages: totalPages(result), roles: ROLES, statuses: USER_STATUSES });
});

adminWebRouter.get('/admin/users/:id', async (req, res) => {
  const detail = await getUserDetail(id(req));
  await page(req, res, 'user', 'users', { detail, roles: ROLES, isSelf: detail.id === currentUser(req).id }, detail.name);
});

adminWebRouter.post('/admin/users/:id/role', async (req, res) => {
  const userId = id(req);
  await act(req, res, `/admin/users/${userId}`, () => changeRole(currentUser(req), userId, parseInput(roleChangeSchema, req.body, req.i18n).role));
});

adminWebRouter.post('/admin/users/:id/block', async (req, res) => {
  const userId = id(req);
  await act(req, res, `/admin/users/${userId}`, () => blockUser(currentUser(req), userId, reason(req)));
});

adminWebRouter.post('/admin/users/:id/unblock', async (req, res) => {
  const userId = id(req);
  await act(req, res, `/admin/users/${userId}`, () => unblockUser(currentUser(req), userId));
});

adminWebRouter.get('/admin/courses', async (req, res) => {
  const query = parseInput(adminCoursesQuerySchema, req.query, req.i18n);
  const result = await listAdminCourses(query, req.locale);
  await page(req, res, 'courses', 'courses', { query, result, totalPages: totalPages(result), statuses: COURSE_STATUSES });
});

adminWebRouter.get('/admin/courses/moderation', async (req, res) => {
  await page(req, res, 'moderation', 'moderation', { queue: await moderationQueue(req.locale) });
});

adminWebRouter.get('/admin/courses/:id', async (req, res) => {
  const course = await getModerationCourse(id(req));
  await page(
    req,
    res,
    'course',
    course.status === 'pending_review' ? 'moderation' : 'courses',
    { course, render: renderMarkdown },
    course.title,
  );
});

for (const action of ['approve', 'reject', 'unpublish'] as const satisfies ModerationAction[]) {
  adminWebRouter.post(`/admin/courses/:id/${action}`, async (req, res) => {
    const courseId = id(req);
    const fallback = action === 'unpublish' ? '/admin/courses' : '/admin/courses/moderation';
    await act(req, res, fallback, () => moderateCourse(currentUser(req), courseId, action, action === 'approve' ? null : reason(req)));
  });
}

adminWebRouter.get('/admin/applications', async (req, res) => {
  const query = parseInput(adminApplicationsQuerySchema, req.query, req.i18n);
  const result = await listApplications(query);
  await page(req, res, 'applications', 'applications', { query, result, totalPages: totalPages(result), statuses: APPLICATION_STATUSES });
});

adminWebRouter.get('/admin/applications/:id', async (req, res) => {
  const application = await getApplication(id(req));
  await page(req, res, 'application', 'applications', { application }, application.user.name);
});

adminWebRouter.post('/admin/applications/:id/approve', async (req, res) => {
  const applicationId = id(req);
  await act(req, res, '/admin/applications', () => decideApplication(currentUser(req), applicationId, true, null));
});

adminWebRouter.post('/admin/applications/:id/reject', async (req, res) => {
  const applicationId = id(req);
  await act(req, res, '/admin/applications', () => decideApplication(currentUser(req), applicationId, false, reason(req)));
});

adminWebRouter.get('/admin/categories', async (req, res) => {
  await page(req, res, 'categories', 'categories', { categories: await listAdminCategories(), accents: ACCENTS });
});

adminWebRouter.post('/admin/categories', async (req, res) => {
  await act(req, res, '/admin/categories', () => createCategory(currentUser(req), parseInput(categoryInputSchema, req.body, req.i18n)));
});

adminWebRouter.post('/admin/categories/:id', async (req, res) => {
  const categoryId = id(req);
  await act(req, res, '/admin/categories', () => updateCategory(currentUser(req), categoryId, parseInput(categoryInputSchema, req.body, req.i18n)));
});

adminWebRouter.post('/admin/categories/:id/delete', async (req, res) => {
  const categoryId = id(req);
  await act(req, res, '/admin/categories', () => deleteCategory(currentUser(req), categoryId));
});

adminWebRouter.get('/admin/reviews', async (req, res) => {
  const query = parseInput(adminReviewsQuerySchema, req.query, req.i18n);
  const result = await listAdminReviews(query);
  await page(req, res, 'reviews', 'reviews', { query, result, totalPages: totalPages(result), statuses: REVIEW_STATUSES });
});

adminWebRouter.post('/admin/reviews/:id/hide', async (req, res) => {
  const reviewId = id(req);
  await act(req, res, '/admin/reviews', () => setReviewHidden(currentUser(req), reviewId, true, reason(req)));
});

adminWebRouter.post('/admin/reviews/:id/unhide', async (req, res) => {
  const reviewId = id(req);
  await act(req, res, '/admin/reviews', () => setReviewHidden(currentUser(req), reviewId, false, null));
});

adminWebRouter.get('/admin/certificates', async (req, res) => {
  const query = parseInput(adminCertificatesQuerySchema, req.query, req.i18n);
  const result = await listAdminCertificates(query);
  await page(req, res, 'certificates', 'certificates', { query, result, totalPages: totalPages(result) });
});

adminWebRouter.post('/admin/certificates/:code/revoke', async (req, res) => {
  const { code } = parseInput(codeParams, req.params, req.i18n);
  await act(req, res, '/admin/certificates', () => revokeCertificate(currentUser(req), code.toUpperCase(), reason(req)));
});

adminWebRouter.get('/admin/audit-log', async (req, res) => {
  const query = parseInput(auditQuerySchema, req.query, req.i18n);
  const [result, admins] = await Promise.all([listAudit(query), listAdmins()]);
  await page(req, res, 'audit', 'audit', { query, result, totalPages: totalPages(result), actions: AUDIT_ACTIONS, admins });
});
