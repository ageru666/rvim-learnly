import type { Locale } from '@learnly/contracts/enums';
import type { Translator } from '@learnly/i18n/translator';
import type { AuthUser } from '../modules/auth/auth.types.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by the auth middleware; undefined for guests. */
    user?: AuthUser;
    authVia?: 'bearer' | 'cookie';
    /** Set by the locale middleware for every request. */
    locale: Locale;
    i18n: Translator;
  }
}
