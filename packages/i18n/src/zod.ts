import type { Locale } from '@learnly/contracts/enums';
import type { ErrorDetail } from '@learnly/contracts/errors';
import { z } from 'zod';
import type { LooseParams, Translator } from './translator.js';

const LOCALE_PACKS: Record<Locale, () => { localeError: z.core.$ZodErrorMap }> = {
  uk: z.locales.uk,
  en: z.locales.en,
};

/** Zod's built-in messages for generic issues (too short, invalid email, ...) in the given locale. */
export function zodErrorMap(locale: Locale): z.core.$ZodErrorMap {
  return LOCALE_PACKS[locale]().localeError;
}

function issueParams(issue: z.core.$ZodIssue): LooseParams {
  const params: Record<string, number> = {};
  if ('minimum' in issue && typeof issue.minimum === 'number') params.minimum = issue.minimum;
  if ('maximum' in issue && typeof issue.maximum === 'number') params.maximum = issue.maximum;
  return params;
}

/** Turns issues into `{ path, message }`, translating custom messages that are i18n keys. */
export function localizeIssues(
  issues: readonly z.core.$ZodIssue[],
  translator: Translator,
): ErrorDetail[] {
  return issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: translator.has(issue.message)
      ? translator.translate(issue.message, issueParams(issue))
      : issue.message,
  }));
}
