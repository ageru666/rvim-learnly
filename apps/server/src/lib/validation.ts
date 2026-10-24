import type { ErrorDetail } from '@learnly/contracts/errors';
import type { Translator } from '@learnly/i18n/translator';
import { localizeIssues, zodErrorMap } from '@learnly/i18n/zod';
import type { z } from 'zod';
import { AppError } from './errors.js';

export type FormResult<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };

function parse<S extends z.ZodType>(schema: S, input: unknown, i18n: Translator) {
  return schema.safeParse(input, { error: zodErrorMap(i18n.locale) });
}

function toFieldErrors(details: ErrorDetail[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const { path, message } of details) errors[path] ??= message;
  return errors;
}

/** API input: throws `VALIDATION_ERROR` with localized details. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown, i18n: Translator): z.infer<S> {
  const result = parse(schema, input, i18n);
  if (result.success) return result.data;
  throw new AppError('VALIDATION_ERROR', 'errors.codes.VALIDATION_ERROR', {
    details: localizeIssues(result.error.issues, i18n),
  });
}

/** SSR forms: returns per-field messages so the form can be re-rendered next to its fields. */
export function validateForm<S extends z.ZodType>(
  schema: S,
  input: unknown,
  i18n: Translator,
): FormResult<z.infer<S>> {
  const result = parse(schema, input, i18n);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: toFieldErrors(localizeIssues(result.error.issues, i18n)) };
}
