import type { MessageKey } from '@learnly/i18n/keys';
import { DEFAULT_LOCALE } from '@learnly/i18n/locales';
import type { Translator } from '@learnly/i18n/translator';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { isProduction } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError, notFound } from '../lib/errors.js';
import { isApiRequest } from '../lib/http.js';
import { translatorFor } from '../lib/i18n.js';
import { logger } from '../lib/logger.js';
import { renderPage } from '../lib/render.js';

const UNIQUE_VIOLATION = 'P2002';

const ERROR_PAGES: Record<number, { view: string; title: MessageKey }> = {
  403: { view: 'pages/errors/403', title: 'site.errors.forbiddenTitle' },
  404: { view: 'pages/errors/404', title: 'site.errors.notFoundTitle' },
};
const SERVER_ERROR_PAGE = { view: 'pages/errors/500', title: 'site.errors.serverTitle' } as const;

function isBodyParseError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed'
  );
}

/** Maps known library errors to AppError; anything else is an unexpected INTERNAL error. */
function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
    return new AppError('CONFLICT', 'errors.codes.CONFLICT');
  }
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return new AppError('VALIDATION_ERROR', 'errors.upload.tooLarge');
  }
  if (isBodyParseError(error)) return new AppError('VALIDATION_ERROR', 'errors.invalidJson');
  return new AppError('INTERNAL', 'errors.codes.INTERNAL');
}

/** Errors raised before the locale middleware (e.g. a malformed body) still get a translation. */
function requestTranslator(req: Request): Translator {
  const translator: Translator | undefined = req.i18n;
  return translator ?? translatorFor(DEFAULT_LOCALE);
}

function sendApiError(res: Response, error: AppError, i18n: Translator): void {
  const { params, details, rule, unmet, retryAfterSec } = error.options;
  if (retryAfterSec) res.setHeader('Retry-After', String(retryAfterSec));
  res.status(error.status).json({
    error: {
      code: error.code,
      message: i18n.translate(error.messageKey, params),
      ...(details ? { details } : {}),
      ...(rule ? { rule } : {}),
      ...(unmet ? { unmet } : {}),
      ...(retryAfterSec ? { retryAfterSec } : {}),
    },
  });
}

async function sendErrorPage(req: Request, res: Response, error: AppError, i18n: Translator) {
  if (error.code === 'UNAUTHORIZED') {
    res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
    return;
  }
  const page = ERROR_PAGES[error.status] ?? SERVER_ERROR_PAGE;
  await renderPage(res, page.view, {}, { title: i18n.translate(page.title), status: error.status });
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(notFound());
}

export async function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  // Express recognizes error handlers by their four parameters.
  _next: NextFunction,
): Promise<void> {
  const appError = toAppError(error);
  if (appError.code === 'INTERNAL') {
    logger.error({ err: error, requestId: req.id, url: req.originalUrl }, 'unhandled error');
  }
  if (res.headersSent) return;

  const i18n = requestTranslator(req);
  const canRenderPage = !isApiRequest(req) && res.locals.t !== undefined;
  if (!canRenderPage) {
    sendApiError(res, appError, i18n);
    return;
  }
  try {
    await sendErrorPage(req, res, appError, i18n);
  } catch (renderError) {
    logger.error({ err: renderError }, 'error page rendering failed');
    res.status(appError.status).send(isProduction ? '' : String(renderError));
  }
}
