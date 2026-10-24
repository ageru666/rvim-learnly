import { describe, expect, it } from 'vitest';
import { fromHttpResponse, isApiError, transportError } from '../apiError';

describe('ApiError normalization', () => {
  it('maps the server error format and marks 4xx as terminal', () => {
    const error = fromHttpResponse(422, {
      error: { code: 'BUSINESS_RULE_VIOLATION', message: 'No', rule: 'BR-P1', unmet: ['cover'] },
    });
    expect(error).toMatchObject({ code: 'BUSINESS_RULE_VIOLATION', rule: 'BR-P1', unmet: ['cover'], retryable: false });
  });

  it('marks 5xx, rate limits and network failures as transient', () => {
    expect(fromHttpResponse(500, { error: { code: 'INTERNAL', message: 'x' } }).retryable).toBe(true);
    expect(fromHttpResponse(429, { error: { code: 'RATE_LIMITED', message: 'x', retryAfterSec: 60 } })).toMatchObject({
      retryable: true,
      retryAfterSec: 60,
    });
    expect(transportError('NETWORK').retryable).toBe(true);
    expect(transportError('TIMEOUT').retryable).toBe(true);
  });

  it('handles bodies that are not in the API format', () => {
    expect(fromHttpResponse(502, '<html>')).toMatchObject({ code: 'INTERNAL', status: 502, retryable: true });
    expect(fromHttpResponse(404, null)).toMatchObject({ code: 'PARSE', status: 404, retryable: false });
  });

  it('recognizes normalized errors', () => {
    expect(isApiError(transportError('PARSE'))).toBe(true);
    expect(isApiError({ code: 'X' })).toBe(false);
    expect(isApiError('error')).toBe(false);
  });
});
