import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { config } from '../config/env.js';
import { registry } from './registry.js';

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Learnly API',
      version: '1.0.0',
      description:
        'REST API of the Learnly mini-LMS. Authenticate with `POST /api/v1/auth/login` and use the ' +
        'returned access token as a Bearer token. Messages follow `Accept-Language` (uk or en).',
    },
    servers: [{ url: config.APP_URL }],
  });
}
