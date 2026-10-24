import type { MessageKey } from '@learnly/i18n/keys';
import type { Translator } from '@learnly/i18n/translator';
import { isApiError, type TransportErrorCode } from '../api/apiError';

/** Client-side failures have no server message; the record type keeps this mapping exhaustive. */
const TRANSPORT_MESSAGES: Record<TransportErrorCode, MessageKey> = {
  NETWORK: 'errors.network',
  TIMEOUT: 'errors.timeout',
  PARSE: 'errors.codes.INTERNAL',
};

function isTransportCode(code: string): code is TransportErrorCode {
  return code in TRANSPORT_MESSAGES;
}

/**
 * The one place that turns any error into user-facing text (guideline §3.5). Server errors already
 * carry a message in the request language; client-side failures are translated here.
 */
export function describeError(error: unknown, i18n: Translator): string {
  if (!isApiError(error)) return i18n.t('errors.codes.INTERNAL');
  if (error.message) return error.message;
  if (isTransportCode(error.code)) return i18n.translate(TRANSPORT_MESSAGES[error.code]);
  return i18n.translate(`errors.codes.${error.code}`);
}
