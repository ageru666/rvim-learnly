import { ERROR_HTTP_STATUS, type ErrorCode, type ErrorDetail } from '@learnly/contracts/errors';
import type { MessageKey } from '@learnly/i18n/keys';
import type { LooseParams } from '@learnly/i18n/translator';

interface AppErrorOptions {
  params?: LooseParams;
  details?: ErrorDetail[];
  rule?: string;
  unmet?: string[];
  retryAfterSec?: number;
}

/**
 * The only error type services throw for expected failures. The user-facing text is an i18n key,
 * translated by the error handler in the request locale, so a literal sentence cannot leak through.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    readonly messageKey: MessageKey,
    readonly options: AppErrorOptions = {},
  ) {
    super(messageKey);
    this.name = 'AppError';
    this.status = ERROR_HTTP_STATUS[code];
  }
}

export const notFound = (messageKey: MessageKey = 'errors.codes.NOT_FOUND') =>
  new AppError('NOT_FOUND', messageKey);

export const unauthorized = (messageKey: MessageKey = 'errors.codes.UNAUTHORIZED') =>
  new AppError('UNAUTHORIZED', messageKey);

export const forbidden = (messageKey: MessageKey = 'errors.codes.FORBIDDEN') =>
  new AppError('FORBIDDEN', messageKey);

export const conflict = (messageKey: MessageKey = 'errors.codes.CONFLICT') =>
  new AppError('CONFLICT', messageKey);

export const ruleViolation = (
  rule: string,
  messageKey: MessageKey,
  options: Omit<AppErrorOptions, 'rule'> = {},
) => new AppError('BUSINESS_RULE_VIOLATION', messageKey, { ...options, rule });
