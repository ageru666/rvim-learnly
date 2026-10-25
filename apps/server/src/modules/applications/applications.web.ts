import { applySchema, type MyApplication } from '@learnly/contracts/applications';
import { Router, type Request, type Response } from 'express';
import { AppError } from '../../lib/errors.js';
import { setFlash } from '../../lib/flash.js';
import { renderPage } from '../../lib/render.js';
import { validateForm } from '../../lib/validation.js';
import { currentUser, requireAuth } from '../../middlewares/requireRole.js';
import { applyForInstructor, getMyApplication } from './applications.service.js';

interface FormState {
  values: { motivation?: unknown; experience?: unknown };
  errors: Record<string, string>;
}

async function renderTeach(req: Request, res: Response, form: FormState | null) {
  const mine: MyApplication | null = req.user ? await getMyApplication(req.user) : null;
  await renderPage(
    res,
    'pages/teach',
    { mine, form: form ?? { values: {}, errors: {} } },
    { title: req.i18n.t('site.teach.title'), description: req.i18n.t('site.teach.lead'), status: form ? 422 : 200 },
  );
}

export const applicationsWebRouter = Router();

/** FR-SITE-7: benefits, the application form for a signed-in student, or the application status. */
applicationsWebRouter.get('/teach', async (req, res) => {
  await renderTeach(req, res, null);
});

applicationsWebRouter.post('/teach/apply', requireAuth, async (req, res) => {
  const form = validateForm(applySchema, req.body, req.i18n);
  if (!form.ok) {
    const body = req.body as Record<string, unknown>;
    await renderTeach(req, res, { values: { motivation: body.motivation, experience: body.experience }, errors: form.errors });
    return;
  }
  try {
    await applyForInstructor(currentUser(req), form.data);
    setFlash(res, { kind: 'success', key: 'site.teach.sent' });
  } catch (error) {
    if (!(error instanceof AppError) || error.code === 'INTERNAL') throw error;
    setFlash(res, { kind: 'error', key: error.messageKey, params: error.options.params });
  }
  res.redirect(303, '/teach');
});
