import { Validator } from '@seriousme/openapi-schema-validator';
import type { Express } from 'express';
import { describe, expect, it } from 'vitest';
import { testApp } from '../helpers/agent.js';
import { API_PREFIX } from '../../src/lib/http.js';
import { buildOpenApiDocument } from '../../src/openapi/document.js';

interface StackLayer {
  route?: { path: string | string[]; methods: Record<string, boolean> };
  handle?: { stack?: StackLayer[] };
}

/** `METHOD /path` of every route handler registered on the app, in OpenAPI path syntax. */
function expressRoutes(app: Express): string[] {
  const routes: string[] = [];
  const walk = (stack: StackLayer[]) => {
    for (const layer of stack) {
      if (layer.route) {
        const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
        for (const path of paths) {
          for (const method of Object.keys(layer.route.methods)) {
            routes.push(`${method.toUpperCase()} ${path.replace(/:(\w+)/g, '{$1}')}`);
          }
        }
      } else if (layer.handle?.stack) {
        walk(layer.handle.stack);
      }
    }
  };
  walk((app as unknown as { router: { stack: StackLayer[] } }).router.stack);
  return routes;
}

const document = buildOpenApiDocument();
const documented = Object.entries(document.paths ?? {}).flatMap(([path, item]) =>
  Object.keys(item ?? {}).map((method) => `${method.toUpperCase()} ${path}`),
);

describe('OpenAPI document (FR-API-1)', () => {
  it('describes every Express route under /api/v1', () => {
    const apiRoutes = expressRoutes(testApp()).filter((route) => route.split(' ')[1]?.startsWith(API_PREFIX));
    expect(apiRoutes.length).toBeGreaterThan(50);
    expect(apiRoutes.filter((route) => !documented.includes(route))).toEqual([]);
    expect(documented.filter((route) => route.includes(API_PREFIX) && !apiRoutes.includes(route))).toEqual([]);
  });

  it('declares security and the Accept-Language parameter on every operation', () => {
    for (const [path, item] of Object.entries(document.paths ?? {})) {
      for (const [method, operation] of Object.entries(item ?? {})) {
        const label = `${method.toUpperCase()} ${path}`;
        expect(operation.security, label).toBeDefined();
        expect(operation.tags?.length, label).toBe(1);
        const parameters = (operation.parameters ?? []) as { name: string; in: string }[];
        expect(parameters.some((parameter) => parameter.in === 'header' && parameter.name === 'accept-language'), label).toBe(true);
        if (operation.security?.length) expect(Object.keys(operation.responses ?? {}), label).toContain('401');
      }
    }
  });

  it('documents the shared error body with the same error in both languages', () => {
    expect(document.components?.schemas).toHaveProperty('ApiError');
    const invalid = document.paths?.['/api/v1/auth/login']?.post?.responses?.['400'] as {
      content: Record<string, { examples: Record<string, { value: { error: { code: string; message: string; details: { path: string; message: string }[] } } }> }>;
    };
    const { uk, en } = invalid.content['application/json']?.examples ?? {};
    expect(uk?.value.error.code).toBe('VALIDATION_ERROR');
    expect(en?.value.error.code).toBe('VALIDATION_ERROR');
    expect(en?.value.error.message).toBe('Please check the entered data.');
    expect(uk?.value.error.message).toMatch(/[а-яіїєґ]/i);
    expect(en?.value.error.details.map((detail) => detail.path)).toEqual(['email', 'password']);
    expect(document.tags?.map((tag) => tag.name)).toEqual(expect.arrayContaining(['Auth', 'Admin', 'Teaching']));
  });

  it('is a valid OpenAPI 3.1 document', async () => {
    const result = await new Validator().validate(JSON.parse(JSON.stringify(document)));
    expect(result.errors ?? []).toEqual([]);
    expect(result.valid).toBe(true);
  });
});
