import { apiErrorSchema, type ErrorCode, type ErrorDetail } from '@learnly/contracts/errors';

/** Client-side failures that never reached the API's error format. */
export type TransportErrorCode = 'NETWORK' | 'TIMEOUT' | 'PARSE' | 'CLIPBOARD';

/**
 * The single normalized error shape for every RTK Query endpoint. `retryable` separates transient
 * failures (network, timeout, 5xx, rate limit) from terminal ones (other 4xx), so the UI can choose
 * between "Try again" and a way out (guideline §3.5).
 */
export interface ApiError {
  code: ErrorCode | TransportErrorCode;
  status: number | null;
  /** Already localized by the server in the request language, when the server answered. */
  message: string | null;
  details: ErrorDetail[];
  rule: string | null;
  unmet: string[];
  retryAfterSec: number | null;
  retryable: boolean;
}

const SERVER_ERROR_MIN_STATUS = 500;

function isRetryable(code: ApiError['code'], status: number | null): boolean {
  if (code === 'NETWORK' || code === 'TIMEOUT' || code === 'RATE_LIMITED') return true;
  return status !== null && status >= SERVER_ERROR_MIN_STATUS;
}

export function transportError(code: TransportErrorCode, status: number | null = null): ApiError {
  return {
    code,
    status,
    message: null,
    details: [],
    rule: null,
    unmet: [],
    retryAfterSec: null,
    retryable: isRetryable(code, status),
  };
}

/** Converts a raw HTTP failure into `ApiError`; unknown bodies keep the status only. */
export function fromHttpResponse(status: number, body: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(body);
  if (!parsed.success) {
    const code = status >= SERVER_ERROR_MIN_STATUS ? 'INTERNAL' : 'PARSE';
    return { ...transportError('PARSE', status), code, retryable: isRetryable(code, status) };
  }
  const error = parsed.data.error;
  return {
    code: error.code,
    status,
    message: error.message,
    details: error.details ?? [],
    rule: error.rule ?? null,
    unmet: error.unmet ?? [],
    retryAfterSec: error.retryAfterSec ?? null,
    retryable: isRetryable(error.code, status),
  };
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'retryable' in value &&
    typeof (value as { retryable: unknown }).retryable === 'boolean'
  );
}
