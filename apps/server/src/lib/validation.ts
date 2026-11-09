import type { ErrorDetail } from '@learnly/contracts/errors';
import type { Translator } from '@learnly/i18n/translator';
import { localizeIssues, zodErrorMap } from '@learnly/i18n/zod';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from './errors.js';

export type FormResult<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };

const NUL = '\u0000';

/** Paths of the strings that contain a NUL character, anywhere in the input. */
function nulPaths(value: unknown, path: PropertyKey[] = []): PropertyKey[][] {
  if (typeof value === 'string') return value.includes(NUL) ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((item, index) => nulPaths(item, [...path, index]));
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => nulPaths(item, [...path, key]));
  }
  return [];
}

// PostgreSQL text cannot hold NUL, so a string with one is invalid input, not a database error (lab 5, ZAP scans).
// rejectNulInput covers the query and the body of every request, including handlers that parse them leniently;
// withoutNul covers route parameters, which are parsed later.
const withoutNul = z.unknown().superRefine((value, ctx) => {
  for (const path of nulPaths(value)) ctx.addIssue({ code: 'custom', path, message: 'validation.text.nul' });
});

export const rejectNulInput: RequestHandler = (req, _res, next) => {
  const paths = [...nulPaths(req.query), ...nulPaths(req.body)];
  if (paths.length === 0) {
    next();
    return;
  }
  const message = req.i18n.translate('validation.text.nul');
  next(
    new AppError('VALIDATION_ERROR', 'errors.codes.VALIDATION_ERROR', {
      details: paths.map((path) => ({ path: path.map(String).join('.'), message })),
    }),
  );
};

function parse<S extends z.ZodType>(schema: S, input: unknown, i18n: Translator) {
  return withoutNul.pipe(schema).safeParse(input, { error: zodErrorMap(i18n.locale) });
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
