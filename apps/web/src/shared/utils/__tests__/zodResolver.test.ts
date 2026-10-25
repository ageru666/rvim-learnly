import { en } from '@learnly/i18n/messages/en';
import { createTranslator } from '@learnly/i18n/translator';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodResolver } from '../zodResolver';

const i18n = createTranslator('en', en);
const schema = z.object({ title: z.string().min(3), slug: z.string().regex(/^[a-z]+$/, { error: 'validation.slug.format' }) });
const resolve = zodResolver<{ title: string; slug: string }>(schema, i18n);
const options = { fields: {}, shouldUseNativeValidation: false } as const;

describe('zodResolver', () => {
  it('returns the parsed values when the schema accepts them', async () => {
    expect(await resolve({ title: 'Course', slug: 'course' }, undefined, options)).toEqual({
      values: { title: 'Course', slug: 'course' },
      errors: {},
    });
  });

  it('returns one localized message per field', async () => {
    const result = await resolve({ title: 'x', slug: 'Bad Slug' }, undefined, options);
    expect(result.values).toEqual({});
    expect(result.errors.slug?.message).toBe('Only lowercase Latin letters, digits and hyphens.');
    expect(result.errors.title?.message).toBeTruthy();
  });
});
