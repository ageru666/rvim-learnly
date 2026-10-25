import type { Translator } from '@learnly/i18n/translator';
import { localizeIssues } from '@learnly/i18n/zod';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';

/**
 * react-hook-form resolver for the shared contract schemas. Messages are localized like on the
 * server, so a form shows the same text as the API for the same rule. The form declares its value
 * type; the schema validates (and may normalize) those values.
 */
export function zodResolver<TValues extends FieldValues>(schema: z.ZodType, i18n: Translator): Resolver<TValues> {
  return (values) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data as TValues, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const { path, message } of localizeIssues(result.error.issues, i18n)) {
      errors[path] ??= { type: 'validation', message };
    }
    return { values: {}, errors: errors as FieldErrors<TValues> };
  };
}
