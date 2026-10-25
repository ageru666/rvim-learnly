import type { ErrorDetail } from '@learnly/contracts/errors';
import type { Translator } from '@learnly/i18n/translator';
import { localizeIssues } from '@learnly/i18n/zod';
import type { z } from 'zod';

export type FieldErrors = Partial<Record<string, string>>;

/** First message per field, in the order the issues were reported. */
export function fieldErrorsFrom(details: readonly ErrorDetail[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const { path, message } of details) errors[path] ??= message;
  return errors;
}

/** Validates the submitted values with the shared contract; the result is localized. */
export function checkForm<S extends z.ZodType>(
  schema: S,
  values: unknown,
  i18n: Translator,
): { data: z.infer<S>; errors: FieldErrors } | { data: null; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };
  return { data: null, errors: fieldErrorsFrom(localizeIssues(result.error.issues, i18n)) };
}
