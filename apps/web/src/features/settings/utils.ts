import { passwordSchema, withPasswordConfirmation, emailSchema } from '@learnly/contracts/auth';
import type { ErrorDetail } from '@learnly/contracts/errors';
import type { Translator } from '@learnly/i18n/translator';
import { localizeIssues } from '@learnly/i18n/zod';
import { z } from 'zod';

export type FieldErrors = Partial<Record<string, string>>;

export const passwordFormSchema = withPasswordConfirmation(
  z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema, newPasswordConfirm: z.string() }),
  { password: 'newPassword', confirm: 'newPasswordConfirm' },
);

export const emailFormSchema = z.object({ currentPassword: z.string().min(1), newEmail: emailSchema });

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
