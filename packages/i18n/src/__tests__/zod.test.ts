import { VALIDATION_MESSAGES } from '@learnly/contracts/validation';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { en } from '../messages/en.js';
import { uk } from '../messages/uk.js';
import { createTranslator } from '../translator.js';
import { localizeIssues, zodErrorMap } from '../zod.js';

const schema = z.object({
  name: z.string().min(2),
  password: z.string().regex(/\d/, { error: VALIDATION_MESSAGES.passwordLetterAndDigit }),
  nested: z.object({ count: z.number().max(3) }),
});

function issuesFor(locale: 'uk' | 'en') {
  const result = schema.safeParse(
    { name: 'a', password: 'abc', nested: { count: 5 } },
    { error: zodErrorMap(locale) },
  );
  if (result.success) throw new Error('expected a validation failure');
  return result.error.issues;
}

describe('localizeIssues', () => {
  it('translates custom keys and keeps Zod built-in messages in the same locale', () => {
    const details = localizeIssues(issuesFor('en'), createTranslator('en', en));
    expect(details).toEqual([
      { path: 'name', message: expect.stringContaining('2') as string },
      { path: 'password', message: en.validation.password.letterAndDigit },
      { path: 'nested.count', message: expect.stringContaining('3') as string },
    ]);
  });

  it('produces Ukrainian messages for the Ukrainian locale', () => {
    const [nameIssue, passwordIssue] = localizeIssues(issuesFor('uk'), createTranslator('uk', uk));
    expect(nameIssue?.message).toMatch(/[а-яіїєґ]/i);
    expect(passwordIssue?.message).toBe(uk.validation.password.letterAndDigit);
  });

  it('passes minimum and maximum to translated messages', () => {
    const translator = createTranslator('en', en);
    const details = localizeIssues(
      [
        {
          code: 'too_small',
          origin: 'string',
          minimum: 5,
          inclusive: true,
          path: ['title'],
          message: 'common.pagination.page',
          input: '',
        },
      ],
      translator,
    );
    expect(details[0]?.message).toBe('Page {page} of {total}');
  });

  it('passes numeric maximums and ignores non-numeric bounds', () => {
    const translator = createTranslator('en', en);
    const [maxDetail, bigintDetail] = localizeIssues(
      [
        {
          code: 'too_big',
          origin: 'string',
          maximum: 3,
          inclusive: true,
          path: [],
          message: 'common.pagination.page',
          input: '',
        },
        {
          code: 'too_small',
          origin: 'bigint',
          minimum: 1n,
          inclusive: true,
          path: [0],
          message: 'common.actions.save',
          input: 0n,
        },
      ],
      translator,
    );
    expect(maxDetail).toEqual({ path: '', message: 'Page {page} of {total}' });
    expect(bigintDetail).toEqual({ path: '0', message: 'Save' });
  });
});
