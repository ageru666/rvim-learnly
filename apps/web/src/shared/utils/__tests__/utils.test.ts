import { en } from '@learnly/i18n/messages/en';
import { createTranslator } from '@learnly/i18n/translator';
import { describe, expect, it, vi } from 'vitest';
import { fromHttpResponse, transportError } from '../../api/apiError';
import { assertUnreachable } from '../assertUnreachable';
import { cx } from '../cx';
import { describeError } from '../describeError';
import { logFailure } from '../logger';

const i18n = createTranslator('en', en);

describe('cx', () => {
  it('joins truthy class names', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });
});

describe('assertUnreachable', () => {
  it('throws for values that should not exist', () => {
    expect(() => assertUnreachable('x' as never)).toThrow('Unexpected value: "x"');
  });
});

describe('describeError', () => {
  it('prefers the localized server message', () => {
    const error = fromHttpResponse(404, { error: { code: 'NOT_FOUND', message: 'Курс не знайдено' } });
    expect(describeError(error, i18n)).toBe('Курс не знайдено');
  });

  it('translates transport failures', () => {
    expect(describeError(transportError('NETWORK'), i18n)).toBe(en.errors.network);
    expect(describeError(transportError('TIMEOUT'), i18n)).toBe(en.errors.timeout);
    expect(describeError(transportError('PARSE'), i18n)).toBe(en.errors.codes.INTERNAL);
  });

  it('falls back to the code message', () => {
    const error = { ...fromHttpResponse(409, { error: { code: 'CONFLICT', message: '' } }) };
    expect(describeError(error, i18n)).toBe(en.errors.codes.CONFLICT);
  });

  it('handles values that are not API errors', () => {
    expect(describeError(new Error('boom'), i18n)).toBe(en.errors.codes.INTERNAL);
    expect(describeError(null, i18n)).toBe(en.errors.codes.INTERNAL);
  });

});

describe('logFailure', () => {
  it('logs the operation with a timestamp', () => {
    logFailure('save draft', { id: 1 });
    expect(vi.mocked(console.warn)).toHaveBeenCalledWith(
      '[learnly] save draft failed',
      expect.objectContaining({ id: 1, at: expect.any(String) as string }),
    );
  });
});
