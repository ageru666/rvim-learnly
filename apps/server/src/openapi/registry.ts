import { OpenAPIRegistry, type RouteConfig } from '@asteasolutions/zod-to-openapi';
import { loginSchema } from '@learnly/contracts/auth';
import { LOCALES, localeSchema } from '@learnly/contracts/enums';
import { apiErrorSchema, type ErrorCode } from '@learnly/contracts/errors';
import { z } from 'zod';
import { apiErrorBody, AppError } from '../lib/errors.js';
import { translatorFor } from '../lib/i18n.js';
import { parseInput } from '../lib/validation.js';

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'The `accessToken` from `POST /api/v1/auth/login` (15 minutes; renew with `/auth/refresh`).',
});
registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'access_token',
  description: 'The session cookie of the website and the SPA; state-changing requests also need `X-CSRF-Token`.',
});

const errorSchema = apiErrorSchema.meta({ id: 'ApiError' });

const localeHeaders = z.object({
  'accept-language': localeSchema
    .optional()
    .describe('Language of messages and validation details: `uk` (default) or `en`.'),
});

type Method = RouteConfig['method'];
type Access = 'public' | 'user';

interface ResponseSpec {
  description: string;
  schema?: z.ZodType;
  contentType?: string;
  example?: unknown;
}

export interface RouteSpec {
  method: Method;
  /** Express-style path, e.g. `/api/v1/courses/:slug`. */
  path: string;
  tag: string;
  summary: string;
  access: Access;
  params?: z.ZodObject;
  query?: z.ZodObject;
  body?: z.ZodType;
  bodyContentType?: 'application/json' | 'multipart/form-data';
  bodyExample?: unknown;
  responses: Record<number, ResponseSpec>;
}

function toOpenApiPath(path: string): string {
  return path.replace(/:(\w+)/g, '{$1}');
}

function content(schema: z.ZodType, contentType = 'application/json', example?: unknown) {
  return { [contentType]: { schema, ...(example === undefined ? {} : { example }) } };
}

interface ErrorResponse {
  description: string;
  sample: () => AppError;
}

/** A real validation failure, so the documented details are exactly what the API returns. */
function validationSample(): AppError {
  try {
    parseInput(loginSchema, { email: 'not-an-email', password: '' }, translatorFor('en'));
  } catch (error) {
    if (error instanceof AppError) return error;
  }
  throw new Error('the sample input must fail validation');
}

const codeSample = (code: ErrorCode, options?: ConstructorParameters<typeof AppError>[2]) => () =>
  new AppError(code, `errors.codes.${code}`, options);

const ERROR_RESPONSES: Record<number, ErrorResponse> = {
  400: { description: 'Invalid input', sample: validationSample },
  422: {
    description: 'Business rule violation',
    sample: codeSample('BUSINESS_RULE_VIOLATION', { rule: 'BR-E1' }),
  },
  429: { description: 'Too many requests', sample: codeSample('RATE_LIMITED', { retryAfterSec: 60 }) },
};
const USER_ERROR_RESPONSES: Record<number, ErrorResponse> = {
  401: { description: 'Not authenticated', sample: codeSample('UNAUTHORIZED') },
  403: { description: 'Not allowed', sample: codeSample('FORBIDDEN') },
};

/** The same error in both languages: `code` stays, `message` and `details` follow `Accept-Language`. */
function errorExamples(response: ErrorResponse) {
  const error = response.sample();
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      { summary: `Accept-Language: ${locale}`, value: apiErrorBody(error, translatorFor(locale)) },
    ]),
  );
}

/** Describes a route in the OpenAPI document; every `*.api.ts` module calls this for its routes. */
export function registerRoute(spec: RouteSpec): void {
  const errors = { ...ERROR_RESPONSES, ...(spec.access === 'user' ? USER_ERROR_RESPONSES : {}) };
  const responses: RouteConfig['responses'] = {};
  for (const [status, error] of Object.entries(errors)) {
    responses[status] = {
      description: error.description,
      content: { 'application/json': { schema: errorSchema, examples: errorExamples(error) } },
    };
  }
  for (const [status, response] of Object.entries(spec.responses)) {
    responses[status] = {
      description: response.description,
      ...(response.schema
        ? { content: content(response.schema, response.contentType, response.example) }
        : {}),
    };
  }

  registry.registerPath({
    method: spec.method,
    path: toOpenApiPath(spec.path),
    tags: [spec.tag],
    summary: spec.summary,
    security: spec.access === 'user' ? [{ bearerAuth: [] }, { cookieAuth: [] }] : [],
    request: {
      headers: localeHeaders,
      ...(spec.params ? { params: spec.params } : {}),
      ...(spec.query ? { query: spec.query } : {}),
      ...(spec.body
        ? {
            body: {
              content: content(spec.body, spec.bodyContentType, spec.bodyExample),
              required: true,
            },
          }
        : {}),
    },
    responses,
  });
}
