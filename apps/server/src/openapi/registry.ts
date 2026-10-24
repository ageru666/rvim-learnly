import { OpenAPIRegistry, type RouteConfig } from '@asteasolutions/zod-to-openapi';
import { localeSchema } from '@learnly/contracts/enums';
import { apiErrorSchema } from '@learnly/contracts/errors';
import { z } from 'zod';

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});
registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'access_token',
});


const localeHeaders = z.object({ 'accept-language': localeSchema.optional() });

type Method = RouteConfig['method'];
type Access = 'public' | 'user';

interface ResponseSpec {
  description: string;
  schema?: z.ZodType;
  contentType?: string;
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
  responses: Record<number, ResponseSpec>;
}

function toOpenApiPath(path: string): string {
  return path.replace(/:(\w+)/g, '{$1}');
}

function content(schema: z.ZodType, contentType = 'application/json') {
  return { [contentType]: { schema } };
}

const ERROR_RESPONSES: Record<number, string> = {
  400: 'Invalid input',
  422: 'Business rule violation',
  429: 'Too many requests',
};
const USER_ERROR_RESPONSES: Record<number, string> = {
  401: 'Not authenticated',
  403: 'Not allowed',
};

/** Describes a route in the OpenAPI document; every `*.api.ts` module calls this for its routes. */
export function registerRoute(spec: RouteSpec): void {
  const errors = { ...ERROR_RESPONSES, ...(spec.access === 'user' ? USER_ERROR_RESPONSES : {}) };
  const responses: RouteConfig['responses'] = {};
  for (const [status, description] of Object.entries(errors)) {
    responses[status] = { description, content: content(apiErrorSchema) };
  }
  for (const [status, response] of Object.entries(spec.responses)) {
    responses[status] = {
      description: response.description,
      ...(response.schema ? { content: content(response.schema, response.contentType) } : {}),
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
        ? { body: { content: content(spec.body, spec.bodyContentType), required: true } }
        : {}),
    },
    responses,
  });
}
