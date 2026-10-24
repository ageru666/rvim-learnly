import type { Translator } from '@learnly/i18n/translator';
import { isApiError } from '../api/apiError';
import { assertUnreachable } from './assertUnreachable';

/**
 * The one place that turns any error into user-facing text (guideline §3.5). Server errors already
 * carry a message in the request language; client-side failures are translated here.
 */
export function describeError(error: unknown, i18n: Translator): string {
  if (!isApiError(error)) return i18n.t('errors.codes.INTERNAL');
  if (error.message) return error.message;
  switch (error.code) {
    case 'NETWORK':
      return i18n.t('errors.network');
    case 'TIMEOUT':
      return i18n.t('errors.timeout');
    case 'PARSE':
      return i18n.t('errors.codes.INTERNAL');
    case 'VALIDATION_ERROR':
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
    case 'NOT_FOUND':
    case 'CONFLICT':
    case 'BUSINESS_RULE_VIOLATION':
    case 'RATE_LIMITED':
    case 'INTERNAL':
      return i18n.translate(`errors.codes.${error.code}`);
    default:
      return assertUnreachable(error.code);
  }
}
