import { certificateCodeSchema } from '@learnly/contracts/certificates';
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import { renderPage } from '../../lib/render.js';
import { getByCode } from './certificates.service.js';

const codeParams = z.object({ code: z.string() });

export const certificatesWebRouter = Router();

/** FR-SITE-8 / FR-CERT-3: rendered in the viewer's locale; names as they were issued. */
certificatesWebRouter.get('/certificates/:code', async (req, res) => {
  const code = certificateCodeSchema.safeParse(codeParams.parse(req.params).code);
  let certificate = null;
  if (code.success) {
    try {
      certificate = await getByCode(code.data);
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== 'NOT_FOUND') throw error;
    }
  }
  const t = req.i18n.t;
  await renderPage(
    res,
    'pages/certificate',
    { certificate },
    certificate
      ? { title: t('site.certificate.title', { name: certificate.studentName }), description: certificate.courseTitle }
      : { title: t('site.certificate.notFoundTitle'), status: 404 },
  );
});
