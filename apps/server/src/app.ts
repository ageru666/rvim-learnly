import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { JSON_BODY_LIMIT } from '@learnly/contracts/limits';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type Express, type RequestHandler, type Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { config, SERVER_ROOT, UPLOADS_PATH } from './config/env.js';
import { FONT_DIRECTORIES } from './lib/fonts.js';
import { logger } from './lib/logger.js';
import { authenticate } from './middlewares/auth.js';
import { csrfProtection } from './middlewares/csrf.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { resolveRequestLocale } from './middlewares/locale.js';
import { templateLocals } from './middlewares/locals.js';
import { createRateLimiters, type RateLimits } from './middlewares/rateLimit.js';
import { authApiRouter } from './modules/auth/auth.api.js';
import { adminApiRouter } from './modules/admin/admin.api.js';
import { adminWebRouter } from './modules/admin/admin.web.js';
import { applicationsWebRouter } from './modules/applications/applications.web.js';
import { authWebRouter } from './modules/auth/auth.web.js';
import { certificatesApiRouter } from './modules/certificates/certificates.api.js';
import { certificatesWebRouter } from './modules/certificates/certificates.web.js';
import { catalogApiRouter } from './modules/catalog/catalog.api.js';
import { catalogWebRouter } from './modules/catalog/catalog.web.js';
import { learningApiRouter } from './modules/learning/learning.api.js';
import { notificationsApiRouter } from './modules/notifications/notifications.api.js';
import { quizzesApiRouter } from './modules/quizzes/quizzes.api.js';
import { instructorCoursesApiRouter } from './modules/courses/instructor-courses.api.js';
import { curriculumApiRouter } from './modules/curriculum/curriculum.api.js';
import { reviewsApiRouter } from './modules/reviews/reviews.api.js';
import { healthRouter } from './modules/pages/health.api.js';
import { preferencesRouter } from './modules/pages/preferences.web.js';
import { seoRouter } from './modules/pages/seo.web.js';
import { staticPagesRouter } from './modules/pages/static.web.js';
import { spaRouter } from './modules/spa/spa.web.js';
import { meApiRouter } from './modules/users/me.api.js';
import { docsRouter } from './openapi/docs.web.js';

const STATIC_MAX_AGE = '1h';
const UPLOADS_MAX_AGE = '30d';

export interface AppOptions {
  rateLimits?: RateLimits;
}

/** Browser features the product never uses; fullscreen and autoplay stay available to the embedded video players. */
const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()';

/**
 * Content Security Policy per contracts/client-storage-and-external.md, plus the other security headers
 * (docs/security-notes.md). HSTS is sent only when the site is served over HTTPS (COOKIE_SECURE).
 */
function securityHeaders(): RequestHandler[] {
  const permissions: RequestHandler = (_req, res, next) => {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    next();
  };
  const helmetHeaders = helmet({
    strictTransportSecurity: config.COOKIE_SECURE,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          'data:',
          'https://upload.wikimedia.org',
          'https://i.ytimg.com',
          'https://i.vimeocdn.com',
        ],
        connectSrc: [
          "'self'",
          'https://uk.wikipedia.org',
          'https://en.wikipedia.org',
          'https://noembed.com',
        ],
        frameSrc: ['https://www.youtube-nocookie.com', 'https://player.vimeo.com'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: config.COOKIE_SECURE ? [] : null,
      },
    },
  });
  return [helmetHeaders, permissions];
}

/** Routers of the domain modules, mounted in order. Each story adds its routers here. */
function routers(): Router[] {
  return [
    healthRouter,
    docsRouter,
    preferencesRouter,
    authApiRouter,
    notificationsApiRouter,
    meApiRouter,
    catalogApiRouter,
    learningApiRouter,
    quizzesApiRouter,
    reviewsApiRouter,
    instructorCoursesApiRouter,
    curriculumApiRouter,
    adminApiRouter,
    certificatesApiRouter,
    authWebRouter,
    certificatesWebRouter,
    applicationsWebRouter,
    adminWebRouter,
    catalogWebRouter,
    staticPagesRouter,
    seoRouter,
    spaRouter,
  ];
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const limiters = createRateLimiters(
    options.rateLimits ?? {
      globalPerMin: config.RATE_LIMIT_GLOBAL_PER_MIN,
      authPerMin: config.RATE_LIMIT_AUTH_PER_MIN,
    },
  );

  app.set('views', join(SERVER_ROOT, 'src', 'views'));
  app.set('view engine', 'ejs');
  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
    }),
  );
  app.use(securityHeaders());
  app.use(compression());
  app.use('/static', express.static(join(SERVER_ROOT, 'src', 'public'), { maxAge: STATIC_MAX_AGE }));
  app.use('/static', express.static(join(SERVER_ROOT, 'dist', 'public'), { maxAge: STATIC_MAX_AGE }));
  for (const directory of FONT_DIRECTORIES) {
    app.use('/static/fonts', express.static(directory, { maxAge: UPLOADS_MAX_AGE, immutable: true }));
  }
  app.use('/uploads', express.static(UPLOADS_PATH, { maxAge: UPLOADS_MAX_AGE, immutable: true }));

  app.use(limiters.global);
  app.use(['/api/v1/auth', '/login', '/register', '/forgot-password', '/reset-password'], (req, res, next) => {
    if (req.method === 'POST') limiters.auth(req, res, next);
    else next();
  });
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());

  app.use(authenticate);
  app.use(resolveRequestLocale);
  app.use(templateLocals);
  app.use(csrfProtection);

  for (const router of routers()) app.use(router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
