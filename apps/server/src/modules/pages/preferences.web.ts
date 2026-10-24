import { localeSchema, themeSchema } from '@learnly/contracts/enums';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { COOKIES, setPreferenceCookie } from '../../lib/cookies.js';
import { safeReturnTo } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { updateLocale } from '../users/users.service.js';

const themeForm = z.object({ theme: themeSchema, returnTo: z.string().optional() });
const localeForm = z.object({ locale: localeSchema, returnTo: z.string().optional() });

function backTo(req: Request, returnTo: string | undefined): string {
  return safeReturnTo(returnTo ?? req.get('referer')?.replace(/^https?:\/\/[^/]+/, ''));
}

/** Theme and language switchers; plain POST forms so they work without JavaScript. */
export const preferencesRouter = Router();

preferencesRouter.post('/theme', (req, res) => {
  const form = parseInput(themeForm, req.body, req.i18n);
  setPreferenceCookie(res, COOKIES.theme, form.theme);
  res.redirect(303, backTo(req, form.returnTo));
});

preferencesRouter.post('/locale', async (req, res) => {
  const form = parseInput(localeForm, req.body, req.i18n);
  setPreferenceCookie(res, COOKIES.locale, form.locale);
  if (req.user) await updateLocale(req.user.id, form.locale);
  res.redirect(303, backTo(req, form.returnTo));
});
