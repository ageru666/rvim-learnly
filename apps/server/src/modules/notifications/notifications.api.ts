import { idSchema, pageQuerySchema, pageSchema } from '@learnly/contracts/common';
import { notificationSchema, unreadCountSchema } from '@learnly/contracts/notifications';
import { Router } from 'express';
import { z } from 'zod';
import { API_PREFIX } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { currentUser, requireAuth } from '../../middlewares/requireRole.js';
import { registerRoute } from '../../openapi/registry.js';
import { listNotifications, markAllRead, markRead, unreadCount } from './notifications.service.js';

const TAG = 'Notifications';
const BASE = `${API_PREFIX}/me/notifications`;
const idParams = z.object({ id: idSchema });

export const notificationsApiRouter = Router();
notificationsApiRouter.use(BASE, requireAuth);

registerRoute({
  method: 'get',
  path: BASE,
  tag: TAG,
  summary: 'My notifications, newest first',
  access: 'user',
  query: pageQuerySchema,
  responses: { 200: { description: 'Notifications', schema: pageSchema(notificationSchema) } },
});
notificationsApiRouter.get(BASE, async (req, res) => {
  res.json(await listNotifications(currentUser(req).id, parseInput(pageQuerySchema, req.query, req.i18n)));
});

registerRoute({
  method: 'get',
  path: `${BASE}/unread-count`,
  tag: TAG,
  summary: 'Number of unread notifications',
  access: 'user',
  responses: { 200: { description: 'Count', schema: unreadCountSchema } },
});
notificationsApiRouter.get(`${BASE}/unread-count`, async (req, res) => {
  res.json({ count: await unreadCount(currentUser(req).id) });
});

registerRoute({
  method: 'post',
  path: `${BASE}/read-all`,
  tag: TAG,
  summary: 'Mark every notification as read',
  access: 'user',
  responses: { 204: { description: 'Read' } },
});
notificationsApiRouter.post(`${BASE}/read-all`, async (req, res) => {
  await markAllRead(currentUser(req).id);
  res.status(204).end();
});

registerRoute({
  method: 'post',
  path: `${BASE}/:id/read`,
  tag: TAG,
  summary: 'Mark one of my notifications as read',
  access: 'user',
  params: idParams,
  responses: { 204: { description: 'Read' } },
});
notificationsApiRouter.post(`${BASE}/:id/read`, async (req, res) => {
  const { id } = parseInput(idParams, req.params, req.i18n);
  await markRead(currentUser(req).id, id);
  res.status(204).end();
});
