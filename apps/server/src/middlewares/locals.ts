import { themeSchema } from '@learnly/contracts/enums';
import { formatDate, formatDuration, formatNumber, formatPercent } from '@learnly/i18n/format';
import type { NextFunction, Request, Response } from 'express';
import { COOKIES, readCookie } from '../lib/cookies.js';
import { takeFlash } from '../lib/flash.js';
import { isApiRequest } from '../lib/http.js';
import { unreadCount } from '../modules/notifications/notifications.service.js';

/** Values every SSR template can use: the user, theme, flash message and locale-bound formatters. */
export async function templateLocals(req: Request, res: Response, next: NextFunction): Promise<void> {
  const locale = req.locale;
  const theme = themeSchema.safeParse(readCookie(req, COOKIES.theme));
  res.locals.user = req.user ?? null;
  res.locals.theme = theme.success ? theme.data : 'system';
  res.locals.flash = takeFlash(req, res, req.i18n.has);
  res.locals.currentPath = req.path;
  res.locals.unreadNotifications = req.user && !isApiRequest(req) ? await unreadCount(req.user.id) : 0;
  res.locals.format = {
    date: (value: Date | string, style?: 'date' | 'long' | 'dateTime') => formatDate(locale, value, style),
    number: (value: number) => formatNumber(locale, value),
    percent: (value: number) => formatPercent(locale, value),
    duration: (minutes: number) => formatDuration(locale, minutes),
  };
  next();
}
