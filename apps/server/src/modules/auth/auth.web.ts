import {
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  withPasswordConfirmation,
} from '@learnly/contracts/auth';
import { VALIDATION_MESSAGES } from '@learnly/contracts/validation';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  clearSessionCookies,
  COOKIES,
  readCookie,
  setPreferenceCookie,
  setSessionCookies,
} from '../../lib/cookies.js';
import { AppError } from '../../lib/errors.js';
import { setFlash } from '../../lib/flash.js';
import { clientInfo, safeReturnTo } from '../../lib/http.js';
import { renderPage } from '../../lib/render.js';
import { validateForm } from '../../lib/validation.js';
import { enrollFromSite } from '../learning/site-enrollment.js';
import { currentUser, requireAuth } from '../../middlewares/requireRole.js';
import {
  forgotPassword,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
  type SignedIn,
} from './auth.service.js';

const AFTER_SIGN_IN = '/app';

/** Where the visitor came from; carried through login ↔ register (contracts/ssr-routes.md). */
const continuationSchema = z.object({
  returnTo: z.string().optional(),
  intent: z.literal('enroll').optional().catch(undefined),
  course: z.string().max(80).optional(),
});
type Continuation = z.infer<typeof continuationSchema>;

const registerForm = withPasswordConfirmation(
  registerSchema.extend({
    passwordConfirm: z.string(),
    acceptTerms: z.literal('on', { error: VALIDATION_MESSAGES.termsRequired }).transform(() => true as const),
  }),
);

const resetForm = withPasswordConfirmation(
  z.object({ token: z.string().min(1), password: passwordSchema, passwordConfirm: z.string() }),
);

const tokenQuery = z.object({ token: z.string().min(1) });
const returnToForm = z.object({ returnTo: z.string().optional() });

function continuationFrom(input: unknown): Continuation {
  const parsed = continuationSchema.safeParse(input);
  return parsed.success ? parsed.data : {};
}

/** Query string that keeps the continuation on the link between login and registration. */
function continuationQuery(continuation: Continuation): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(continuation)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Expected failures (wrong password, lockout, used link) are shown on the page; anything else is rethrown. */
function expectedError(error: unknown): AppError {
  if (error instanceof AppError && error.code !== 'INTERNAL') return error;
  throw error;
}

function messageOf(req: Request, error: AppError): string {
  return req.i18n.translate(error.messageKey, error.options.params);
}

function destinationAfterSignIn(continuation: Continuation): string {
  return safeReturnTo(continuation.returnTo, AFTER_SIGN_IN);
}

/** Completes the enrollment intent in the same request, otherwise follows `returnTo`. */
async function continueAfterSignIn(res: Response, userId: string, continuation: Continuation): Promise<string> {
  if (continuation.intent === 'enroll' && continuation.course) {
    return enrollFromSite(res, userId, continuation.course);
  }
  return destinationAfterSignIn(continuation);
}

function signIn(res: Response, signedIn: SignedIn): void {
  setSessionCookies(res, signedIn.tokens);
  setPreferenceCookie(res, COOKIES.locale, signedIn.locale);
}

interface FormState {
  values?: Record<string, unknown>;
  errors?: Record<string, string>;
  formError?: string;
  status?: number;
}

function renderLogin(req: Request, res: Response, continuation: Continuation, state: FormState = {}) {
  return renderPage(
    res,
    'pages/auth/login',
    {
      continuation,
      switchQuery: continuationQuery(continuation),
      values: state.values ?? {},
      errors: state.errors ?? {},
      formError: state.formError,
    },
    { title: req.i18n.t('site.auth.login.title'), status: state.status },
  );
}

function renderRegister(req: Request, res: Response, continuation: Continuation, state: FormState = {}) {
  return renderPage(
    res,
    'pages/auth/register',
    {
      continuation,
      switchQuery: continuationQuery(continuation),
      values: state.values ?? {},
      errors: state.errors ?? {},
      formError: state.formError,
    },
    { title: req.i18n.t('site.auth.register.title'), status: state.status },
  );
}

export const authWebRouter = Router();

authWebRouter.get('/login', async (req, res) => {
  const continuation = continuationFrom(req.query);
  if (req.user) {
    res.redirect(destinationAfterSignIn(continuation));
    return;
  }
  await renderLogin(req, res, continuation);
});

authWebRouter.post('/login', async (req, res) => {
  const continuation = continuationFrom(req.body);
  const values = { email: (req.body as Record<string, unknown>).email };
  const form = validateForm(loginSchema, req.body, req.i18n);
  if (!form.ok) {
    await renderLogin(req, res, continuation, { values, errors: form.errors, status: 422 });
    return;
  }
  let signedIn: SignedIn;
  try {
    signedIn = await login(form.data, clientInfo(req));
  } catch (error) {
    const failure = expectedError(error);
    await renderLogin(req, res, continuation, { values, formError: messageOf(req, failure), status: failure.status });
    return;
  }
  signIn(res, signedIn);
  res.redirect(303, await continueAfterSignIn(res, signedIn.userId, continuation));
});

authWebRouter.get('/register', async (req, res) => {
  const continuation = continuationFrom(req.query);
  if (req.user) {
    res.redirect(destinationAfterSignIn(continuation));
    return;
  }
  await renderRegister(req, res, continuation);
});

authWebRouter.post('/register', async (req, res) => {
  const continuation = continuationFrom(req.body);
  const body = req.body as Record<string, unknown>;
  const values = { name: body.name, email: body.email, acceptTerms: body.acceptTerms === 'on' };
  const form = validateForm(registerForm, req.body, req.i18n);
  if (!form.ok) {
    await renderRegister(req, res, continuation, { values, errors: form.errors, status: 422 });
    return;
  }
  let signedIn: SignedIn;
  try {
    signedIn = await register(form.data, req.locale, clientInfo(req));
  } catch (error) {
    const failure = expectedError(error);
    await renderRegister(req, res, continuation, {
      values,
      errors: { email: messageOf(req, failure) },
      status: failure.status,
    });
    return;
  }
  signIn(res, signedIn);
  setFlash(res, { kind: 'success', key: 'site.auth.register.welcome' });
  res.redirect(303, await continueAfterSignIn(res, signedIn.userId, continuation));
});

authWebRouter.post('/logout', async (req, res) => {
  await logout(readCookie(req, COOKIES.refresh));
  clearSessionCookies(res);
  setFlash(res, { kind: 'info', key: 'site.auth.loggedOut' });
  res.redirect(303, '/');
});

authWebRouter.get('/forgot-password', async (req, res) => {
  await renderPage(res, 'pages/auth/forgot', { values: {}, errors: {} }, { title: req.i18n.t('site.auth.forgot.title') });
});

authWebRouter.post('/forgot-password', async (req, res) => {
  const form = validateForm(forgotPasswordSchema, req.body, req.i18n);
  if (!form.ok) {
    await renderPage(
      res,
      'pages/auth/forgot',
      { values: { email: (req.body as Record<string, unknown>).email }, errors: form.errors },
      { title: req.i18n.t('site.auth.forgot.title'), status: 422 },
    );
    return;
  }
  await forgotPassword(form.data.email);
  setFlash(res, { kind: 'info', key: 'site.auth.forgot.sent' });
  res.redirect(303, '/login');
});

function renderReset(req: Request, res: Response, data: { token?: string; errors?: Record<string, string>; invalid?: boolean }, status?: number) {
  return renderPage(
    res,
    'pages/auth/reset',
    { token: data.token ?? '', errors: data.errors ?? {}, invalid: data.invalid ?? false },
    { title: req.i18n.t('site.auth.reset.title'), status },
  );
}

authWebRouter.get('/reset-password', async (req, res) => {
  const query = tokenQuery.safeParse(req.query);
  await renderReset(req, res, query.success ? { token: query.data.token } : { invalid: true });
});

authWebRouter.post('/reset-password', async (req, res) => {
  const form = validateForm(resetForm, req.body, req.i18n);
  if (!form.ok) {
    const token = (req.body as Record<string, unknown>).token;
    await renderReset(req, res, { token: typeof token === 'string' ? token : '', errors: form.errors }, 422);
    return;
  }
  try {
    await resetPassword(form.data.token, form.data.password);
  } catch (error) {
    await renderReset(req, res, { invalid: true }, expectedError(error).status);
    return;
  }
  clearSessionCookies(res);
  setFlash(res, { kind: 'success', key: 'site.auth.reset.done' });
  res.redirect(303, '/login');
});

authWebRouter.get('/verify-email', async (req, res) => {
  const query = tokenQuery.safeParse(req.query);
  let verified = false;
  if (query.success) {
    try {
      await verifyEmail(query.data.token);
      verified = true;
    } catch (error) {
      expectedError(error);
    }
  }
  await renderPage(
    res,
    'pages/auth/verify',
    { verified },
    { title: req.i18n.t('site.auth.verify.title'), status: verified ? 200 : 422 },
  );
});

authWebRouter.post('/verify-email/resend', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const { returnTo } = returnToForm.parse(req.body);
  try {
    await resendVerification(user.id);
    setFlash(res, { kind: 'success', key: 'common.verifyBanner.sent', params: { email: user.email } });
  } catch (error) {
    setFlash(res, { kind: 'error', key: expectedError(error).messageKey });
  }
  res.redirect(303, safeReturnTo(returnTo, AFTER_SIGN_IN));
});
