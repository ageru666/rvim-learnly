import { isLocale, resolveLocale } from '@learnly/i18n/locales';
import type { NextFunction, Request, Response } from 'express';
import { COOKIES, readCookie, setPreferenceCookie } from '../lib/cookies.js';
import { translatorFor } from '../lib/i18n.js';

/** FR-I18N-2: ?lang → cookie → account → Accept-Language → uk. */
export function resolveRequestLocale(req: Request, res: Response, next: NextFunction): void {
  const query: unknown = req.query.lang;
  const locale = resolveLocale({
    query,
    cookie: readCookie(req, COOKIES.locale),
    user: req.user?.locale,
    acceptLanguage: req.get('accept-language'),
  });
  if (isLocale(query)) setPreferenceCookie(res, COOKIES.locale, query);

  req.locale = locale;
  req.i18n = translatorFor(locale);
  res.locals.locale = locale;
  res.locals.t = req.i18n.t;
  res.setHeader('Content-Language', locale);
  next();
}
