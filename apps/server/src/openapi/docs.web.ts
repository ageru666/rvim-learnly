import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './document.js';

const DOCUMENT_PATH = '/api/openapi.json';

export const docsRouter = Router();

docsRouter.get(DOCUMENT_PATH, (_req, res) => {
  res.json(buildOpenApiDocument());
});

docsRouter.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    customSiteTitle: 'Learnly API',
    swaggerOptions: { url: DOCUMENT_PATH, persistAuthorization: true },
  }),
);
