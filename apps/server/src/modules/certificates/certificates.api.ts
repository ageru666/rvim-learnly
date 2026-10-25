import { certificateCodeSchema, certificateSchema } from '@learnly/contracts/certificates';
import { Router } from 'express';
import { z } from 'zod';
import { notFound } from '../../lib/errors.js';
import { API_PREFIX } from '../../lib/http.js';
import { registerRoute } from '../../openapi/registry.js';
import { getByCode } from './certificates.service.js';

const codeParams = z.object({ code: z.string() });

export const certificatesApiRouter = Router();

registerRoute({
  method: 'get',
  path: `${API_PREFIX}/certificates/:code`,
  tag: 'Certificates',
  summary: 'Public certificate verification (FR-SITE-8)',
  access: 'public',
  params: codeParams,
  responses: { 200: { description: 'Certificate', schema: certificateSchema }, 404: { description: 'Unknown code' } },
});
certificatesApiRouter.get(`${API_PREFIX}/certificates/:code`, async (req, res) => {
  const code = certificateCodeSchema.safeParse(codeParams.parse(req.params).code);
  if (!code.success) throw notFound();
  res.json(await getByCode(code.data));
});
