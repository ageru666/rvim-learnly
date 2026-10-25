---

description: "Task list for the Learnly mini-LMS implementation"
---

# Tasks: Learnly, an online course platform (mini-LMS)

**Input**: Design documents from `/specs/001-learnly-lms/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: included. The constitution (principle V) and SC-004 require tests for every BR-*,
API integration tests, 100 % coverage of SPA `utils`, i18n parity tests and e2e tests of the key
flows. Tests of each story are written before the implementation and must fail first.

**Organization**: tasks are grouped by the user stories of spec.md.

**Definition of done for every task**: every user-facing string added by the task exists in both
`packages/i18n/src/messages/uk.ts` and `en.ts` (the parity test and the hard-coded string checks
enforce it), and `npm run check` is green for the affected packages.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: the user story from spec.md (US1–US14)

## Path Conventions

Monorepo: `apps/server/`, `apps/web/`, `packages/contracts/`, `packages/i18n/`,
`packages/design-tokens/`. Server: modules in `apps/server/src/modules/<domain>/`, tests in
`apps/server/tests/`. SPA: features in `apps/web/src/features/<feature>/`, tests in
`<feature>/__tests__/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: initialize the monorepo and tooling

- [X] T001 Create root `package.json` with npm workspaces (`apps/*`, `packages/*`), `engines.node ">=24"` and `.nvmrc` (`24`), scripts `dev`, `build`, `start`, `check` (= `lint` + `typecheck` + `test` + `check:strings` + `knip` + `check:deps`), `check:full` (= `check` + `e2e` + `test:postman`), `check:deps` (`license-checker-rseidelsohn --production --onlyAllow "MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause;0BSD;BlueOak-1.0.0;CC0-1.0;CC-BY-4.0;Unlicense;Python-2.0;OFL-1.1"` (OFL for the font packages) and `npm audit --omit=dev --audit-level=high`), `check:strings` (runs `scripts/check-ejs-strings.mjs`), `lint`, `typecheck`, `test`, `test:server`, `e2e`, `test:postman`, `db:migrate`, `db:seed`, `db:reset`, and root `.gitignore` (node_modules, dist, .env, .env.local, apps/server/uploads, coverage, playwright-report)
- [X] T002 [P] Create `tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `module/moduleResolution: NodeNext`, `verbatimModuleSyntax: true`, TypeScript `~6.0` as a root devDependency
- [X] T003 [P] Create `eslint.config.js` (ESLint 10 flat, typescript-eslint 8 typed rules, `@typescript-eslint/no-explicit-any: error`, `consistent-type-imports`, `@typescript-eslint/switch-exhaustiveness-check: error` (backs the `default: assertUnreachable(value)` rule), `no-restricted-syntax` forbidding JSX text and string-literal JSX attributes (`title`, `aria-label`, `placeholder`, `alt`) that contain letters in `apps/web/src/**` (excluding `**/__tests__/**`, `apps/web/src/shared/test/**` and `apps/web/e2e/**`) so UI text must go through `t()`, `eslint-plugin-boundaries` for `apps/web/src` enforcing guideline §2.3: features may import only root-level files of other features, `shared/` must not import `features/`) and `prettier.config.js`
- [X] T004 [P] Create `knip.json` covering all workspaces (entry points: server `src/main.ts`, `prisma/seed/index.ts`; web `src/index.tsx`; contracts and i18n `src/*.ts`)
- [X] T005 [P] Create `docker-compose.yml`: `postgres:18-alpine` on host port 5433 (user/password `learnly`, database `learnly`, init script `docker/postgres/init.sql` creating `learnly_test`), `axllent/mailpit` on 1025/8025; create `docker/postgres/init.sql`
- [X] T006 [P] Create `.env.example` with working local defaults: `DATABASE_URL`, `DATABASE_URL_TEST`, `PORT=3000`, `APP_URL=http://localhost:5173` (public base URL for emails and redirects; in development the Vite single entry point, in production `http://localhost:3000`), `SPA_DEV_URL=http://localhost:5173` (empty in production), `JWT_SECRET`, `COOKIE_SECURE=false`, `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `MAIL_FROM`, `UPLOADS_DIR`, `LOG_LEVEL`, `RATE_LIMIT_GLOBAL_PER_MIN=300`, `RATE_LIMIT_AUTH_PER_MIN=10`; plus `apps/server/.env.test` overriding `DATABASE_URL` to `learnly_test` and both rate limits to `100000`
- [X] T007 Scaffold `packages/contracts` (`package.json` with `"exports": { "./*": "./dist/*.js" }` and no barrel, `tsconfig.json`, `vitest.config.ts`, dependency `zod@^4.6`)
- [X] T008 [P] Scaffold `packages/i18n` (`package.json` with `"exports": { "./*": "./dist/*.js" }`, dependency `@learnly/contracts` (for `LOCALES` and the enums checked by the parity test; direction i18n → contracts only), peer `zod@^4.6`, `tsconfig.json`, `vitest.config.ts` with 100 % coverage thresholds)
- [X] T009 [P] Scaffold `packages/design-tokens` with `theme.css` (Tailwind v4 `@theme`: neutral 0–950 primitives, accents `yellow #ffb411`, `green #10d690`, `cyan #1abbe5`, `blue #357cff`, `indigo #4123e8`, `red #f94128`, `pink #d81879`, `magenta #b20c6f`, AA-contrast text variants, semantic tokens `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-primary` (ink), `--color-success|warning|danger|info`, radii 4/8/16, font families; semantic tokens declared once with `light-dark()`, `data-theme` on `<html>` drives `color-scheme`) and `fonts.css` importing `@fontsource-variable/inter`, `@fontsource-variable/roboto-condensed`, `@fontsource/jetbrains-mono` with Cyrillic and Latin subsets
- [X] T010 Scaffold `apps/server` (`package.json` with Express 5.3, EJS 7, Prisma 7.10 + `@prisma/adapter-pg`, zod, jose, argon2, multer, sharp, file-type, nodemailer, pino, pino-http, helmet, express-rate-limit, cookie-parser, unified/remark/rehype stack, `@asteasolutions/zod-to-openapi`, swagger-ui-express, `@tailwindcss/cli`, workspace deps `@learnly/contracts`, `@learnly/i18n`; dev: tsx, vitest, supertest, pino-pretty, `@faker-js/faker`; scripts `dev` (tsx watch + tailwind watch), `build`, `start`), `tsconfig.json`, `vitest.config.ts`, `prisma.config.ts`
- [X] T011 Scaffold `apps/web` with Vite 8 + React 19 + TS: `vite.config.ts` (`base: '/app/'`, `@tailwindcss/vite`, development single entry point: proxy every path except `/app` (regex `^/(?!app(/|$))`) to `:3000` without changing `Host`, so site, admin, API, uploads and SPA all open on `http://localhost:5173` and share cookies), `index.html` (inline script applying `data-theme` and `lang` from the `theme`/`locale` cookies or localStorage before the bundle), `src/index.css` importing `@learnly/design-tokens/theme.css` and `fonts.css`, `vitest.config.ts` (jsdom, coverage thresholds 100 % for `src/**/utils.ts` and `src/shared/utils/**`), dependencies from plan.md incl. `@tanstack/react-virtual`
- [X] T012 Run `git init`, `npm install`, `docker compose up -d`, verify `npm run lint`, `npm run typecheck` and `npm run check:deps` pass on empty scaffolds, then make the first commit (docs, specs, scaffolds)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: contracts, localization core, database schema, server core, SSR layout, SPA core,
demo data

**⚠️ CRITICAL**: no user story work starts before this phase is complete

### Contracts package

- [X] T013 [P] Create `packages/contracts/src/enums.ts` with all enums from data-model.md (`LOCALES` + `Locale` as the single source of the supported locale list, `AuditAction` (`course.approve`, `course.reject`, `course.unpublish`, `application.approve`, `application.reject`, `user.role`, `user.block`, `user.unblock`, `category.create`, `category.update`, `category.delete`, `review.hide`, `review.unhide`, `certificate.revoke`), `Role`, `UserStatus`, `ApplicationStatus`, `CourseLevel`, `CourseStatus`, `LessonType`, `QuestionType`, `RevealAnswers`, `EnrollmentStatus`, `ReviewStatus`, `Accent`, `OneTimeTokenPurpose`, `NotificationType`) as `z.enum` + inferred types
- [X] T014 [P] Create `packages/contracts/src/limits.ts` with named constants: name 2–60, bio ≤ 500, password ≥ 8 with letter and digit, course title 5–120, shortDescription ≤ 200, description ≤ 10 000, lesson content ≤ 50 000, outcomes/requirements ≤ 10 items × ≤ 160, tags ≤ 5 × 2–30, review text 10–2000, reply ≤ 1000, reason 10–1000, motivation 50–2000, category name 2–40, options 2–8, points 1–10, passScore default 70, maxAttempts 1–10, `REVIEW_MIN_PROGRESS = 30`, `APPLICATION_RETRY_DAYS = 7`, `LOGIN_MAX_FAILS = 5`, `LOGIN_WINDOW_MIN = 15`, `VERIFY_RESEND_SEC = 60`, token TTLs (access 15 min, refresh 30 d, reset 1 h, verify 24 h), avatar 1 MB, cover 2 MB, `CATALOG_PAGE_SIZE = 12`, `WIKI_CACHE_SIZE = 20`
- [X] T015 [P] Create `packages/contracts/src/common.ts` (`Id`, `DateTime`, `pageQuerySchema` 1..100 default 20, `pageSchema<T>`) and `packages/contracts/src/errors.ts` (`ErrorCode` union, `apiErrorSchema` per contracts/rest-api.md); custom Zod messages everywhere in contracts are `validation.*` i18n keys
- [X] T016 [P] Implement `packages/contracts/src/slugify.ts` (Ukrainian KMU 2010 transliteration, English passes through, lowercase, `-` separators, max 80) with 100 % tests in `packages/contracts/src/__tests__/slugify.test.ts` (incl. «Програмування» → `prohramuvannia`, "Intro to SQL" → `intro-to-sql`, empty, emoji, long input)
- [X] T017 [P] Implement `packages/contracts/src/video.ts` (`parseVideoUrl` for youtube watch/youtu.be/embed and vimeo/player.vimeo, `buildEmbedUrl(id, provider, locale)` to youtube-nocookie with `hl` / player.vimeo) with 100 % tests in `packages/contracts/src/__tests__/video.test.ts`
- [X] T018 [P] Create `packages/contracts/src/markdown.ts` exporting the shared rehype-sanitize schema (GFM tables, code classes for highlighting, no raw HTML, safe link protocols)

### Localization package

- [X] T019 [P] Implement `packages/i18n/src/locales.ts` (imports `LOCALES`/`Locale` from `@learnly/contracts/enums`, adds `DEFAULT_LOCALE = 'uk'`, `isLocale`, `negotiateAcceptLanguage`, `resolveLocale({ query, cookie, user, acceptLanguage })`) with 100 % tests in `packages/i18n/src/__tests__/locales.test.ts` (order of precedence, invalid values ignored, `de-DE,de;q=0.9,en;q=0.5` → `en`, unsupported → `uk`)
- [X] T020 Implement `packages/i18n/src/keys.ts` (dotted `MessageKey` union and `MessageParams<K>` derived from `{placeholders}`) and `packages/i18n/src/translator.ts` (`createTranslator(locale, dict, { onMissing })`, interpolation, ICU-lite `plural` with `Intl.PluralRules` and `#`, fallback to `uk`) with 100 % tests in `packages/i18n/src/__tests__/translator.test.ts` (uk 1/2/5/11/21/22/25 lessons, en 1/2, missing key fallback and callback)
- [X] T021 [P] Implement `packages/i18n/src/format.ts` (`formatDate`, `formatNumber`, `formatPercent`, `formatDuration`, `formatRelative` with injected `now`) with 100 % tests in `packages/i18n/src/__tests__/format.test.ts`
- [X] T022 [P] Implement `packages/i18n/src/zod.ts` (`zodErrorMap(locale)` over `z.locales.uk()` / `z.locales.en()`, `localizeIssues(issues, t)` translating `validation.*` keys with issue params) with 100 % tests in `packages/i18n/src/__tests__/zod.test.ts`
- [X] T023 Create the baseline dictionaries `packages/i18n/src/messages/uk.ts` (`as const`, source of `Messages`) and `packages/i18n/src/messages/en.ts` (`satisfies Messages`) with namespaces from contracts/i18n.md and initial keys: `common` (buttons, states, pagination, plural units), `errors` (every `ErrorCode`), `validation` (every custom rule in contracts), `enums` (every enum value), `notifications` (every `NotificationType` with payload placeholders), `readiness` (every BR-P1 checklist item), `admin.audit` (every `AuditAction`), `site.header`, `site.footer`, `site.locale` (switcher labels "UA"/"EN" and full names)
- [X] T024 Implement the parity test `packages/i18n/src/__tests__/parity.test.ts` (same key sets, same placeholders and plural presence per key, uk plurals define one/few/many/other, en define one/other, no empty strings, every `ErrorCode`, `NotificationType`, `AuditAction`, readiness item and enum value from `packages/contracts` has a message, and every static page has `site.pages.<page>.title` and `.body` in both locales)
- [X] T025 [P] Implement `scripts/check-ejs-strings.mjs` (fails when an `.ejs` file under `apps/server/src/views` contains Cyrillic or Latin words in text nodes or in `title`/`alt`/`placeholder`/`aria-label` attributes outside `<%= t(...) %>`; allowlist for brand name "Learnly", `©`, punctuation)

### Database

- [X] T026 Write `apps/server/prisma/schema.prisma` with every entity from data-model.md (User with `locale` default `uk`, RefreshToken, OneTimeToken, LoginAttempt, InstructorApplication, Category with `nameUk`/`nameEn`, Course with `language`, CourseSlugHistory, Tag, CourseTag, Module, Lesson, Quiz, Question, AnswerOption, Enrollment, LessonCompletion, QuizAttempt, Review, Certificate, Notification, AuditLogEntry) with `@@map`/`@map` snake_case, cascade/restrict rules, uniques (`users.email` citext, `categories.name_uk`, `categories.name_en`, `enrollments(user_id, course_id)`, `reviews(user_id, course_id)`, `certificates.enrollment_id`, `certificates.code`, `quizzes.lesson_id`) and indexes from data-model.md incl. `courses(language)`
- [X] T027 Create the initial migration in `apps/server/prisma/migrations/` and append SQL: `CREATE EXTENSION citext, pg_trgm`, GIN trgm indexes on `courses.title` and `courses.short_description`, partial unique index on `instructor_applications(user_id) WHERE status = 'pending'`, view `course_stats(course_id, students, lessons, minutes, rating_avg, rating_count)`; verify with `npm run db:migrate`

### Server core

- [X] T028 Implement `apps/server/src/config/env.ts` (Zod schema for all `.env.example` keys incl. rate limits as positive integers, loads `.env.test` when `NODE_ENV=test`, throws a clear error listing missing keys at startup)
- [X] T029 [P] Implement `apps/server/src/lib/logger.ts` (pino, pretty in development) and `apps/server/src/lib/db.ts` (Prisma client with `@prisma/adapter-pg`, `withTransaction` helper)
- [X] T030 [P] Implement `apps/server/src/lib/errors.ts` (`AppError(code, status, messageKey: MessageKey, { params, details, rule, unmet, retryAfterSec })`; the `MessageKey` type makes passing a literal sentence impossible, factories `notFound`, `forbidden`, `conflict`, `ruleViolation`)
- [X] T031 [P] Implement `apps/server/src/lib/passwords.ts` (argon2id hash/verify) and `apps/server/src/lib/tokens.ts` (jose HS256 access sign/verify, `randomToken()` 32 bytes base64url, `sha256()`), with tests in `apps/server/tests/unit/tokens.test.ts`
- [X] T032 [P] Implement `apps/server/src/lib/i18n.ts` (load both dictionaries once, `translatorFor(locale)` cached per locale, `onMissing` logging a warning)
- [X] T033 [P] Implement `apps/server/src/lib/mailer.ts` (nodemailer SMTP from config, render one template per email `views/emails/<template>.ejs` with `t` bound to the recipient's locale (every text from `emails.<template>.*` keys, no per-locale templates), subject from `emails.<template>.subject` typed as `MessageKey`, `sendAfterCommit` that logs failures without throwing)
- [X] T034 [P] Implement `apps/server/src/lib/markdown.ts` (unified: remark-parse, remark-gfm, remark-rehype, rehype-sanitize with the contracts schema, rehype-highlight, rehype-stringify) with XSS tests in `apps/server/tests/unit/markdown.test.ts`
- [X] T035 [P] Implement `apps/server/src/lib/images.ts` (file-type signature check jpg/png/webp, sharp avatar 256×256 WebP, cover 1280×720 WebP cover crop, random uuid filenames in `UPLOADS_DIR/{avatars,covers}`)
- [X] T036 [P] Implement `apps/server/src/lib/pagination.ts` (parse PageQuery → skip/take, build `Page<T>`)
- [X] T037 Implement `apps/server/src/middlewares/locale.ts` (`resolveLocale` from `?lang`, `locale` cookie, `req.user?.locale`, `Accept-Language`; sets `req.locale`, `req.t`, `res.locals.locale`, `res.locals.t`, `res.locals.formatters`, `Content-Language`; a valid `?lang` also sets the `locale` cookie for 1 year) with tests in `apps/server/tests/unit/locale.test.ts`
- [X] T038 Implement `apps/server/src/middlewares/validate.ts` (Zod body/query/params parsed with `zodErrorMap(req.locale)` → typed `req.valid`; failures → `VALIDATION_ERROR` with `localizeIssues` details)
- [X] T039 Implement `apps/server/src/middlewares/auth.ts` (resolve the user from `Authorization: Bearer` first, otherwise the `access_token` cookie; record `req.authVia = 'bearer' | 'cookie'`; for cookie auth with an expired or missing access token and a valid `refresh_token` cookie, transparently rotate the session and set new cookies so SSR pages stay signed in; reject blocked users; attach `req.user` incl. `locale`) and `apps/server/src/middlewares/requireRole.ts` (`requireAuth`, `requireRole(...roles)`, `requireVerifiedEmail` for BR-U4) with SSR redirect to `/login?returnTo=` vs API 401/403
- [X] T040 Implement `apps/server/src/middlewares/csrf.ts` (double-submit: issue a non-httpOnly `csrf_token` cookie, check the `X-CSRF-Token` header or `_csrf` field on POST/PUT/PATCH/DELETE unless `req.authVia === 'bearer'`; requests carrying both Bearer and cookies (Swagger UI) are treated as Bearer; anonymous form posts such as login, register and locale switching still require the token) with tests in `apps/server/tests/unit/csrf.test.ts`
- [X] T041 [P] Implement `apps/server/src/middlewares/rateLimit.ts` (global `RATE_LIMIT_GLOBAL_PER_MIN` per IP, `/api/v1/auth` and SSR auth POST `RATE_LIMIT_AUTH_PER_MIN`, both from config; `RATE_LIMITED` with `retryAfterSec`; the factory accepts limits so a dedicated test can create an app with a low limit) and `apps/server/src/middlewares/upload.ts` (multer memory, limits 1 MB avatar / 2 MB cover)
- [X] T042 Implement `apps/server/src/middlewares/errorHandler.ts` (AppError/Zod/Prisma unique → JSON `ApiError` under `/api` with `message` translated by `req.t(messageKey, params)`, HTML `pages/errors/{403,404,500}` otherwise, no stack in production) and the `notFound` handler
- [X] T043 Implement `apps/server/src/middlewares/locals.ts` (res.locals: `user`, `theme` from cookie, `csrfToken`, one-time `flash` cookie stored as a typed `MessageKey` + params, `currentPath`)
- [X] T044 Implement `apps/server/src/app.ts` `createApp()` (helmet with CSP from contracts/client-storage-and-external.md, cookie-parser, pino-http with `X-Request-Id`, json limit 1 MB, urlencoded, static `src/public/` (scripts) and `dist/public/` (built CSS) under `/static`, `/uploads` with cache headers, compression, middleware order auth → locale → csrf → locals, module router registration, error handlers) and `apps/server/src/main.ts` (listen, graceful shutdown closing Prisma)
- [X] T045 Implement the OpenAPI infrastructure: `apps/server/src/openapi/registry.ts` (shared `OpenAPIRegistry`, bearer + cookie security schemes, `Accept-Language` header parameter, `registerRoute` helper used by every `*.api.ts`), `apps/server/src/openapi/document.ts`, `apps/server/src/openapi/docs.web.ts` (`/api/openapi.json`, Swagger UI at `/api/docs`), plus `GET /health` in `apps/server/src/modules/pages/health.api.ts`
- [X] T046 [P] Implement `apps/server/src/modules/notifications/notifications.service.ts` `notify(tx, userId, type, payload)` and `notifyAdmins(tx, type, payload)` (type + payload only, no text; used by later stories)
- [X] T047 [P] Implement `apps/server/src/modules/admin/audit.service.ts` `recordAudit(tx, actorId, action: AuditAction, entityType, entityId, meta)`

### SSR layout

- [X] T048 Configure the SSR Tailwind build: `apps/server/src/public/css/app.css` (imports design-tokens theme and fonts, `@source "../../views"`), scripts `build:css` / `watch:css` emitting `apps/server/dist/public/css/app.css`
- [X] T049 Create `apps/server/src/views/layouts/main.ejs` (`<html lang="<%= locale %>" data-theme>`, skip link, meta/OG slots, header, flash, footer, all text via `t`) and partials in `apps/server/src/views/partials/`: `header.ejs` (logo, catalog link, search, theme toggle form, locale switcher, guest/user menu, admin link), `locale-switcher.ejs` (POST `/locale` forms for UA and EN with `aria-current`), `footer.ejs`, `flash.ejs`, `form-field.ejs`, `pagination.ejs`, `course-card.ejs`, `tag.ejs`, `star-rating.ejs`, `empty-state.ejs`, `alert.ejs`, `logo.ejs` (original Learnly SVG wordmark + mark); add the `site.*` and `common.*` keys they use to both dictionaries
- [X] T050 [P] Create error pages `apps/server/src/views/pages/errors/{403,404,500}.ejs`
- [X] T051 [P] Create `apps/server/src/public/js/theme.js` (instant toggle + cookie + localStorage), `locale.js` (progressive enhancement of the locale forms), `menu.js` (mobile nav and user dropdown with Esc/click-outside, ARIA), `confirm.js` (confirmation dialog for destructive forms via `<dialog>`, texts from `data-*` attributes rendered by the server), and `POST /theme` in `apps/server/src/modules/pages/theme.web.ts` and `POST /locale` in `apps/server/src/modules/pages/locale.web.ts` (cookie + `users.locale` for signed-in users, redirect to a relative `returnTo`)

### Seed data

- [X] T052 Implement `apps/server/prisma/seed/index.ts` orchestrator (deterministic faker seed, truncate all tables, run steps in order) and `apps/server/prisma/seed/users.ts` (accounts from data-model.md, password `Learnly2026!`, `student15` unverified, `iryna.teacher`, `student2`, `student3` with locale `en`)
- [X] T053 Implement `apps/server/prisma/seed/covers.ts` (generate SVG covers in category accent colours → WebP via sharp into uploads) and `apps/server/prisma/seed/courses.ts` (6 categories with `nameUk`/`nameEn` and slugs from English names; 10 courses: 7 published (5 Ukrainian, 2 English), 1 pending_review, 1 draft, 1 archived; 3–5 modules × 3–5 lessons; text lessons with code blocks; public YouTube video lessons; 1–2 quizzes per course with single and multiple questions; 1–2 preview lessons)
- [X] T054 Implement `apps/server/prisma/seed/activity.ts` (enrollments with 0–100 % progress, quiz attempts, 30+ reviews with some author replies and one hidden, 3 certificates, 2 applications pending/rejected, notifications, audit entries) and wire `db:seed` / `db:reset`

### Server test infrastructure

- [X] T055 Create `apps/server/tests/helpers/testDb.ts` (vitest globalSetup: migrate `learnly_test`; `resetDb()` TRUNCATE CASCADE), `apps/server/tests/helpers/factories.ts` (users per role and locale, course with modules/lessons/quiz, enrollment), `apps/server/tests/helpers/agent.ts` (supertest agent with login, cookies and CSRF, `bearer(token)` variant, `withLocale('en')` setting `Accept-Language`) and a vitest setup file that fails any test in which the server translator's `onMissing` fires

### SPA core

- [X] T056 Create `apps/web/src/shared/config.ts` (public config, fail fast)
- [X] T057 Implement `apps/web/src/features/locale/localeSlice.ts` (state `locale`, action `setLocale`, selector `selectLocale`; the initial value is `resolveLocale({ cookie, user: Me.locale once loaded, acceptLanguage: navigator.languages })` from `@learnly/i18n/locales`, the same function the server uses), `apps/web/src/features/locale/localeApi.ts` (`queryFn` that lazily imports `@learnly/i18n/messages/<locale>` and caches it), `apps/web/src/features/locale/useT.ts` (returns `t` and formatters for the active locale; suspends until the dictionary is loaded), a store listener persisting the choice to `storageApi` (`locale`), the `locale` cookie and `document.documentElement.lang`, switching the global Zod error map via `zodErrorMap`, and invalidating the RTK Query `Locale` tag; tests in `apps/web/src/features/locale/__tests__/`
- [X] T058 Implement `apps/web/src/shared/api/baseApi.ts` (`fetchBaseQuery` with `credentials: 'include'`, CSRF header from the cookie, `Accept-Language` from `selectLocale`, `tagTypes` incl. `Locale`, normalization to a typed `ApiError` union with `retryable: boolean` (transient: network failure, timeout, 5xx, `RATE_LIMITED`; terminal: other 4xx), one `/auth/refresh` retry under async-mutex, dispatch `sessionExpired` on failure, logging rejected operations with name/id/timestamp) with MSW tests in `apps/web/src/shared/api/__tests__/baseApi.test.ts`
- [X] T059 [P] Implement `apps/web/src/shared/utils/describeError.ts` (maps `ApiError` / domain errors to an i18n key + params, the caller translates with `t`) and `assertUnreachable.ts`, with 100 % tests in `apps/web/src/shared/utils/__tests__/`
- [X] T060 [P] Implement `apps/web/src/shared/api/storageApi.ts` (`createApi` with `fakeBaseQuery`, endpoints `getItem`/`setItem`/`removeItem`/`clearPersonal` via `queryFn`, Zod-validated values, corrupted → removed + `null`, unavailable storage → typed error) with tests in `apps/web/src/shared/api/__tests__/storageApi.test.ts`
- [X] T061 Create `apps/web/src/store.ts` (baseApi, storageApi, localeApi, slices, listenerMiddleware), `apps/web/src/index.tsx`, `apps/web/src/App.tsx` (root ErrorBoundary with a static bilingual fallback and a reload action, Suspense for the dictionary, Toast provider), `apps/web/src/router.tsx` (data router `basename: '/app'`, `React.lazy` routes per plan.md)
- [X] T062 [P] Implement form primitives in `apps/web/src/shared/components/`: `Button.tsx`, `IconButton.tsx` (required `aria-label` prop), `Input.tsx`, `Textarea.tsx`, `Select.tsx` (Radix), `Checkbox.tsx`, `RadioGroup.tsx`, `Switch.tsx`, `FormField.tsx` (label, hint, error via `aria-describedby`); primitives receive texts as props and never translate themselves
- [X] T063 [P] Implement display primitives in `apps/web/src/shared/components/`: `Card.tsx`, `Tag.tsx` (accent prop), `Badge.tsx` (status with icon + text), `Avatar.tsx` (initials fallback), `ProgressBar.tsx` (Radix Progress, text value), `Skeleton.tsx`, `Spinner.tsx`, `EmptyState.tsx`, `Alert.tsx`
- [X] T064 [P] Implement overlay primitives in `apps/web/src/shared/components/`: `Dialog.tsx`, `Drawer.tsx`, `AlertDialog.tsx`, `DropdownMenu.tsx`, `Tooltip.tsx`, `Popover.tsx`, `Toast.tsx`
- [X] T065 [P] Implement data primitives in `apps/web/src/shared/components/`: `Table.tsx`, `VirtualList.tsx` and `VirtualTable.tsx` (`@tanstack/react-virtual`, `onEndReached` to request the next page, `aria-rowcount`/`aria-busy`; guideline §4.2 forbids hand-rolled pagination in the SPA for lists that may exceed a few hundred rows), `StarRating.tsx`, `Tabs.tsx`, `Accordion.tsx`, `MarkdownView.tsx` (react-markdown + remark-gfm + rehype-sanitize with the contracts schema + rehype-highlight), `ErrorState.tsx` (message passed in; retry button only when `retryable`, otherwise a navigation action)
- [X] T066 [P] Create SPA test utilities `apps/web/src/shared/test/server.ts` (MSW), `apps/web/src/shared/test/renderWithStore.tsx` (preloaded locale and dictionaries), a vitest setup file that fails any test in which `onMissing` fires
- [X] T067 Implement `apps/web/src/features/theme/themeSlice.ts` (+ listener persisting to storageApi and the `theme` cookie) and `apps/web/src/features/theme/ThemeToggle.tsx` with tests in `apps/web/src/features/theme/__tests__/`
- [X] T068 Implement `apps/web/src/features/auth/authApi.ts` (`getMe`, `logout`), `apps/web/src/features/auth/authSlice.ts` (`sessionExpired`, `selectSessionStatus`), `apps/web/src/features/auth/RequireAuth.tsx` / `RequireRole.tsx` (redirect to `/login?returnTo=` on the server site)
- [X] T069 Implement `apps/web/src/features/navigation/AppLayout.tsx` (header matching the SSR header: logo link to `/`, catalog link, theme toggle, `LocaleSwitcher` from the locale feature, user menu, mobile nav), `apps/web/src/features/locale/LocaleSwitcher.tsx`, `apps/web/src/features/navigation/navigationSlice.ts`, `apps/web/src/features/navigation/NotFoundPage.tsx`; add the `app.layout.*` keys to both dictionaries
- [X] T070 Implement `apps/server/src/modules/spa/spa.web.ts` (production: serve `apps/web/dist` at `/app/*` with index fallback; development, when `SPA_DEV_URL` is set and the request reached `:3000` directly: redirect `/app/*` to the same path on `SPA_DEV_URL`; unauthenticated → `/login?returnTo=`)

**Implementation notes (Phase 2)**: validation is a `parseInput`/`validateForm` helper in
`lib/validation.ts` instead of a middleware; theme and locale forms share `modules/pages/preferences.web.ts`;
`RequireRole` is the `roles` prop of `RequireAuth`; both dictionaries are bundled eagerly (small, simpler than
lazy loading); fonts are served by the server from `/static/fonts` (`scripts/build-fonts-css.mjs`) so SSR and the SPA
share one stylesheet; shared component classes live in `packages/design-tokens/components.css`; knip runs in
`check:full` until the stories consume the foundation and returns to `check` in T200.

**Checkpoint**: `npm run check` is green, `npm run db:reset` creates demo data, `/health` and
`/api/docs` open, the SSR layout and `/app` render in both languages via `?lang=`.

---

## Phase 3: User Story 1 - A guest explores the catalog and a course page (Priority: P1) 🎯 MVP

**Goal**: public site: home, catalog, course, preview, author, static pages, SEO

**Independent Test**: a guest on demo data finds a course through search and filters, opens the
course page and a preview lesson, visits the information pages; the catalog works with JS disabled

### Tests for User Story 1

- [X] T071 [P] [US1] Integration tests for the catalog API in `apps/server/tests/integration/catalog.test.ts`: only `published` listed; trgm search; filters category/level/language/tag/minRating; sorts popular/newest/rating/title; page size 12; `GET /courses/:slug` for draft/pending/archived → 404; old slug → 301; preview of an `isPreview` lesson → 200, of a non-preview lesson → 403 `FORBIDDEN`; categories with counts and `name` per `Accept-Language`; `stats/public`
- [X] T072 [P] [US1] SSR tests in `apps/server/tests/integration/ssr-public.test.ts`: `/`, `/courses?...`, `/courses/:slug`, preview, `/instructors/:id`, static pages return 200 with expected content in `uk` and with `?lang=en`; a non-preview lesson preview URL → 302 to the course page with a flash offering to log in and enroll; unknown → 404 page; sitemap lists only published courses

### Implementation for User Story 1

- [X] T073 [P] [US1] Define catalog schemas in `packages/contracts/src/catalog.ts` (`CategoryDto`, `CourseCard` with `language`, `CourseDetail`, `ReviewDto`, catalog query with sort enum and `language`, instructor profile, public stats) per contracts/rest-api.md
- [X] T074 [US1] Implement `apps/server/src/modules/catalog/catalog.service.ts`: `listCourses(query, locale)` (published only, trgm ILIKE on title/short_description, filters incl. `language`, sorts, pagination using `course_stats`, category name by locale), `getCourseBySlug` (slug history redirect, curriculum without content, rating distribution, `viewer` block with `reviewBlockReason` as an i18n key), `listReviews` (visible only, `rating` filter), `getPreviewLesson`, `getInstructorProfile`, `getPublicStats`, `listCategories(locale)`, `getHomeBlocks` (top-6 popular, 6 newest)
- [X] T075 [US1] Implement `apps/server/src/modules/catalog/catalog.api.ts` (`/categories`, `/courses`, `/courses/:slug`, `/courses/:slug/reviews`, `/courses/:slug/preview/:lessonId`, `/instructors/:id`, `/stats/public`) with OpenAPI registration
- [X] T076 [US1] Implement `apps/server/src/modules/catalog/catalog.web.ts` and the view `apps/server/src/views/pages/home.ejs` (hero, counters, popular, new, categories, "How it works", "Become an instructor" CTA) with `site.home.*` keys in both dictionaries
- [X] T077 [US1] Create `apps/server/src/views/pages/catalog.ejs` (GET filter form incl. content language, sort select, active tag chip with a remove link, result count with plural, 12-card grid, pagination, empty state, mobile filter disclosure via `<details>`) and render tags in `partials/course-card.ejs` as links to `/courses?tag=<tag>` plus a content-language badge
- [X] T078 [US1] Create `apps/server/src/views/pages/course.ejs` (hero with tag links to `/courses?tag=<tag>` and content-language badge, outcomes, requirements, Markdown description via `lib/markdown`, curriculum accordion with types/durations/preview links, author block, rating summary + distribution bars, reviews list with pagination and localized dates, sticky sidebar with enroll/continue/edit buttons per `viewer`, OG meta in the active locale)
- [X] T079 [P] [US1] Create `apps/server/src/views/pages/preview.ejs` (lesson content, video embed via `buildEmbedUrl`, CTA to enroll; non-preview lessons redirect to the course page with flash `site.preview.enrollToOpen`) and `apps/server/src/views/pages/instructor.ejs`
- [X] T080 [P] [US1] Implement `apps/server/src/modules/pages/static.web.ts` and one view per page `apps/server/src/views/pages/static/{about,terms,privacy,contacts}.ejs` rendering `site.pages.<page>.title` and the Markdown `site.pages.<page>.body` through `lib/markdown`, plus `faq.ejs` rendering `site.pages.faq.items` (question/answer pairs) as a `<details>` accordion; write the Ukrainian and English texts of all five pages into both dictionaries (no allowlist in `check-ejs-strings.mjs`)
- [X] T081 [P] [US1] Implement `apps/server/src/modules/pages/seo.web.ts` (`/sitemap.xml` with home, catalog, published courses, instructors; `/robots.txt` disallowing `/app` and `/admin`) and per-page `<title>`/description keys in the layout

**Checkpoint**: US1 works on its own: the storefront on demo data

---

## Phase 4: User Story 2 - Registration, login and account management (Priority: P1)

**Goal**: registration, email verification, login, logout, password reset and change, email change,
sessions

**Independent Test**: register, verify the email from Mailpit, log out, reset the password from the
email, log in with the new password

### Tests for User Story 2

- [X] T082 [P] [US2] Integration tests in `apps/server/tests/integration/auth.test.ts`: register (validation messages in `uk` and with `Accept-Language: en`, duplicate email case-insensitive → 409, role `student`, `locale` = request locale, verification email sent), login generic 401, lockout after 5 fails in 15 min → 429 (business rule, independent of rate limits), the rate limiter returns 429 with `retryAfterSec` on an app created with `RATE_LIMIT_AUTH_PER_MIN=3`, an SSR request with an expired access cookie and a valid refresh cookie stays authenticated and receives rotated cookies, refresh rotation, reuse of a revoked refresh token revokes the family, logout, logout-all, a blocked user cannot log in, Bearer access works without CSRF, a cookie mutation without CSRF → 403
- [X] T083 [P] [US2] Integration tests in `apps/server/tests/integration/account.test.ts`: verify email (valid, reused, expired > 24 h), resend < 60 s → 429, forgot always 204 and mails only existing addresses, reset (1 h, single use, revokes sessions), change password revokes other sessions, change email requires the password and applies only after confirming the new address; every email is rendered in the recipient's `locale`

### Implementation for User Story 2

- [X] T084 [P] [US2] Define auth/me schemas in `packages/contracts/src/auth.ts` and `packages/contracts/src/me.ts` (register `name 2–60`, password rule, `acceptTerms: true`; login; refresh; verify; forgot; reset; change password; change email; `Me` with `locale`)
- [X] T085 [US2] Implement `apps/server/src/modules/auth/auth.service.ts`: `register(input, locale)`, `login` (LoginAttempt window check, `lastLoginAt`), `issueSession`/`refresh` (rotation, `familyId`, reuse detection), `logout`, `logoutAll`, `sendVerification` (invalidate previous, 60 s throttle), `verifyEmail`, `forgotPassword`, `resetPassword`; hourly cleanup of LoginAttempt older than 24 h
- [X] T086 [US2] Implement `apps/server/src/modules/users/users.service.ts` `changePassword`, `requestEmailChange`, `getMe`
- [X] T087 [US2] Implement `apps/server/src/modules/auth/auth.api.ts` (`/auth/register|login|refresh|logout|logout-all|email/verify|email/resend|password/forgot|password/reset`, cookie options: httpOnly, SameSite=Lax, path `/` for both `access_token` and `refresh_token` so SSR pages can refresh sessions) and `apps/server/src/modules/users/me.api.ts` (`GET /me`, `PUT /me/password`, `POST /me/email`) with OpenAPI registration
- [X] T088 [US2] Implement `apps/server/src/modules/auth/auth.web.ts` and views `apps/server/src/views/pages/auth/{login,register,forgot,reset,verify}.ejs` (localized server validation errors next to fields, `returnTo` only relative paths, PRG with flash; hidden fields `intent=enroll` and `course=<slug>` are carried through login and register, see contracts/ssr-routes.md)
- [X] T089 [P] [US2] Create email templates `apps/server/src/views/emails/{layout,welcome-verify,verify-new-email,password-reset}.ejs` and `emails.*` keys in both dictionaries
- [X] T090 [US2] Add the unverified-email banner with a resend form to `apps/server/src/views/partials/header.ejs` and `apps/web/src/features/auth/VerifyEmailBanner.tsx` (resend mutation, 60 s cooldown display with a localized countdown)
- [X] T091 [US2] Implement `apps/web/src/features/settings/settingsApi.ts` and `apps/web/src/features/settings/components/SecuritySettings.tsx` (change password, change email, logout everywhere) on `apps/web/src/features/settings/SettingsPage.tsx` with tests in `apps/web/src/features/settings/__tests__/`

**Implementation notes (US2)**: emails in tests are read back from Mailpit (`tests/helpers/mailbox.ts`);
the CSRF check skips non-browser clients (no `Origin` and no `Sec-Fetch-Site`, research R7), so Postman and
curl call the API without a token; `PUT /me/password` accepts an optional `refreshToken` naming the session a
Bearer client keeps; `withPasswordConfirmation` in `packages/contracts/src/auth.ts` is the one mismatch rule for
SSR and SPA forms; SPA security forms are uncontrolled (values read on submit) with client errors and the confirm
dialog in `settingsSlice`; the resend cooldown lives in `authSlice` and is set from `onQueryStarted`. The
enrollment `intent` is carried through login and registration; completing it is part of US3.

**Checkpoint**: US1 + US2 work independently

---

## Phase 5: User Story 3 - A student enrolls in a course and takes lessons (Priority: P1)

**Goal**: enrollment, student dashboard, player, progress, "Continue learning", author preview

**Independent Test**: `student1` enrolls in a course, completes two lessons, logs out and comes back:
progress and the last lesson are kept

### Tests for User Story 3

- [X] T092 [P] [US3] Unit tests for progress calculation (BR-L3 floor, zero lessons) in `apps/server/tests/unit/progress.test.ts`
- [X] T093 [P] [US3] Integration tests in `apps/server/tests/integration/learning.test.ts`: enroll only published (BR-E1), the author cannot enroll (BR-E2), duplicate → 409, content access only enrolled/author/admin else preview only (BR-E3), completion toggle for text/video (BR-L1), `last_lesson_id` updated on open, leaving deletes progress, dashboard and my-courses filters, a blocked user is denied (BR-E4), author preview mode returns `mode: 'preview'` without saving progress; SSR: a guest `POST /courses/:slug/enroll` → login with `intent=enroll`, after login or registration the user is enrolled and lands on the first lesson
- [X] T094 [P] [US3] SPA tests in `apps/web/src/features/player/__tests__/` (curriculum renders completion state, optimistic toggle with rollback on error, prev/next navigation, drawer on small screens) and `apps/web/src/features/enrollments/__tests__/` (dashboard states: loading, empty, error, data)

### Implementation for User Story 3

- [X] T095 [P] [US3] Define learning schemas in `packages/contracts/src/learning.ts` (`MyCourse`, dashboard, `LearnCourse`, `LessonContent`, `ProgressResult`)
- [X] T096 [US3] Implement `apps/server/src/modules/learning/enrollment.service.ts` (`enroll`, `leave`, `assertLessonAccess`, `listMyCourses`, `getDashboard` incl. recommendations: up to 4 popular published courses from the student's categories not yet enrolled)
- [X] T097 [US3] Implement `apps/server/src/modules/learning/progress.service.ts` (`getLearnCourse`, `openLesson` updating `lastLessonId`/`lastActivityAt`, `completeLesson`, `uncompleteLesson` forbidding quiz lessons, `computeProgress`)
- [X] T098 [US3] Implement `apps/server/src/modules/learning/learning.api.ts` (`/courses/:id/enrollment` POST/DELETE, `/learn/courses/:courseId`, `/learn/lessons/:lessonId`, `/learn/lessons/:lessonId/completion` PUT/DELETE) and add `GET /me/dashboard`, `GET /me/enrollments` to `apps/server/src/modules/users/me.api.ts`, with OpenAPI
- [X] T099 [US3] Add SSR `POST /courses/:slug/enroll` to `apps/server/src/modules/catalog/catalog.web.ts` (guest → `/login?returnTo=/courses/:slug&intent=enroll&course=:slug`; success → redirect to `/app/learn/:courseId/:firstLessonId`) and the post-login/register enrollment hook in `apps/server/src/modules/auth/auth.web.ts` reusing `enrollment.service.enroll`
- [X] T100 [US3] Implement `apps/web/src/features/enrollments/enrollmentsApi.ts` (dashboard, my courses, enroll, leave with tags) and `apps/web/src/features/enrollments/utils.ts` (sorting/grouping helpers) with 100 % tests
- [X] T101 [US3] Implement `apps/web/src/features/dashboard/DashboardPage.tsx` with components in `apps/web/src/features/dashboard/components/` (`ContinueLearningCard`, `ActiveCoursesList`, `RecommendationsList`; certificate and notification blocks are added in US6/US11)
- [X] T102 [US3] Implement `apps/web/src/features/enrollments/MyCoursesPage.tsx` ("Active"/"Completed" tabs, search, leave-course AlertDialog)
- [X] T103 [US3] Implement `apps/web/src/features/player/playerApi.ts` (learn course, lesson, completion mutations with optimistic updates of the curriculum and progress) and `apps/web/src/features/player/utils.ts` (`findAdjacentLessons`, `flattenCurriculum`, `sumCourseMinutes`) with 100 % tests
- [X] T104 [US3] Implement `apps/web/src/features/player/PlayerPage.tsx` with components in `apps/web/src/features/player/components/`: `PlayerHeader` (course title, progress, exit), `CurriculumSidebar` (collapsible modules persisted in the `ui` storage key, type icons, completion marks), `CurriculumDrawer` (mobile), `LessonView` (`MarkdownView`, `lang` attribute = course content language), `VideoEmbed` (iframe from `buildEmbedUrl` with the UI locale, localized title attribute), `LessonFooter` (prev/next, mark complete with `aria-busy`), `PreviewBanner`
- [X] T105 [US3] Register routes `/app`, `/app/courses`, `/app/learn/:courseId/:lessonId` in `apps/web/src/router.tsx`

**Implementation notes (US3)**: `computeProgress` (BR-L3) moved to `packages/contracts/src/progress.ts` so the
SPA's optimistic update and the server use one rule; `LessonContent` carries `courseId`; the dashboard schema holds the
learning blocks now and gains certificates/notifications in US6/US11; `ProgressResult.courseCompleted` mirrors the
enrollment status until BR-C1 lands in US6; SSR enrollment shares `modules/learning/site-enrollment.ts` between the
course form and the login/registration intent; the player has its own full-height route (`/app/learn/:courseId`
resumes the last lesson); collapsed modules live in `navigationSlice` (owner of the `ui` key) and are persisted by
`navigationListeners`; "My courses" loads one page per status and searches on the client; dashboard tests live in
`features/dashboard/__tests__/`, shared learning fixtures in `shared/test/learningFixtures.ts`.

**Checkpoint**: MVP (US1–US3) is ready: storefront, account, learning

---

## Phase 6: User Story 4 - Using the product in Ukrainian or English (Priority: P2)

**Goal**: complete, persistent and verifiable bilingual experience on top of the foundational i18n
infrastructure

**Independent Test**: switch to English on the home page, register, open the dashboard, trigger a
validation error, request a password reset, open a notification: everything is in English; switch
to Ukrainian in the dashboard and everything changes without a reload

### Tests for User Story 4

- [X] T106 [P] [US4] Integration tests in `apps/server/tests/integration/i18n.test.ts`: first visit with `Accept-Language: en` renders English, `de` renders Ukrainian; `?lang=en` sets the cookie and wins over the user locale; `POST /locale` updates the cookie and `users.locale` for a signed-in user and requires CSRF; a user with `locale = en` gets English emails even when the action is triggered by a Ukrainian-speaking admin; API `message` follows `Accept-Language` while `code` is unchanged; `<html lang>` and `Content-Language` match
- [X] T107 [P] [US4] SPA tests in `apps/web/src/features/locale/__tests__/LocaleSwitcher.test.tsx`: switching re-renders texts, dates and plurals without remounting the route, keeps unsaved form input, calls `PATCH /me { locale }` when signed in, refetches `Locale`-tagged queries, and the inactive dictionary is loaded lazily

### Implementation for User Story 4

- [X] T108 [US4] Add `locale` to `PATCH /me` in `apps/server/src/modules/users/me.api.ts` and `users.service.updateLocale`; on every successful login (API and SSR, `apps/server/src/modules/auth/auth.web.ts`, `auth.api.ts`) set the `locale` cookie to `users.locale`, so any device opens in the account language after login (US4 AS3); otherwise the cookie is written only on an explicit choice (`?lang`, `POST /locale`, the SPA switcher)
- [X] T109 [US4] Add `LanguageSettings.tsx` (radio group UA / EN, uses `setLocale`) to `apps/web/src/features/settings/SettingsPage.tsx`, and re-run `resolveLocale` in `apps/web/src/features/locale/localeSlice.ts` once `Me` is loaded
- [X] T110 [US4] Verify the content-language path end to end and close gaps: catalog filter and badge (API, SSR catalog, course page from T074, T077, T078), `language` in course creation and editing (T136, T143, T144), the `lang` attribute on lesson content (T104); add the missing assertions to `apps/server/tests/integration/i18n.test.ts`
- [X] T111 [US4] Review every SSR template, email and SPA screen created so far for completeness in English (the T055/T066 setups already fail any test that hits a missing key; here run the whole server and SPA suites once with `en` as the default request locale) and fix gaps in the dictionaries

**Implementation notes (US4)**: both dictionaries stay bundled eagerly (Phase 2 decision; they are small), so the
"lazy inactive dictionary" part of T107 is intentionally not implemented; `setLocale` is an explicit choice (cookie,
storage, `PATCH /me`), `localeResolved` applies the account locale after `Me` loads without writing the cookie;
`site.locale.native` names each language in itself for the switchers, `enums.locale` is the translated course
language; the English completeness check (T111) is automated in `i18n.test.ts`: every public SSR page rendered with
`?lang=en` must contain no Cyrillic outside elements marked `lang="uk"`; course creation and editing (T136, T143,
T144) do not exist yet, so their content-language checks move to those tasks.

**Checkpoint**: the whole product so far works in both languages; later stories keep adding keys to
both dictionaries per the definition of done

---

## Phase 7: User Story 5 - A student takes a quiz (Priority: P2)

**Goal**: quizzes graded on the server, attempts, review, restoring an unfinished attempt

**Independent Test**: a student fails a quiz, reads the review, retakes it, and the quiz lesson is
marked completed

### Tests for User Story 5

- [X] T112 [P] [US5] Unit tests for `gradeAttempt` in `apps/server/tests/unit/grading.test.ts` (BR-Q1 single/multiple exact set, points weighting, rounding; BR-Q2 threshold; BR-Q4 foreign question/option rejected)
- [X] T113 [P] [US5] Integration tests in `apps/server/tests/integration/quizzes.test.ts`: `GET /learn/quizzes/:id` never contains `isCorrect`/`explanation`; attempt limit (BR-Q3) → 422; reveal modes; passing marks the quiz lesson complete and it cannot be uncompleted (BR-L2); editing questions does not change stored attempt results (BR-Q5); shuffle returns a permutation
- [X] T114 [P] [US5] SPA tests in `apps/web/src/features/quizzes/__tests__/` (answers restored from storage after remount, unanswered confirmation with a pluralized count, the result view hides correct options when not revealed, storage cleared after submit)

### Implementation for User Story 5

- [X] T115 [P] [US5] Define quiz schemas in `packages/contracts/src/quizzes.ts` (`QuizForStudent`, attempt submit `answers: Record<Id, Id[]>`, `AttemptResult`, `AttemptSummary`, `QuizEditor` with options 2–8, points 1–10, passScore 1–100, maxAttempts null or 1–10)
- [X] T116 [US5] Implement the pure `apps/server/src/modules/quizzes/grading.ts` (`gradeAttempt(quiz, answers)` → per-question result snapshot, score, passed; `shouldRevealAnswers`)
- [X] T117 [US5] Implement `apps/server/src/modules/quizzes/quizzes.service.ts` (`getForStudent` with shuffle and attempts info, `submitAttempt` in a transaction: validate, grade, store the snapshot, on the first pass complete the lesson via progress.service, `listAttempts`)
- [X] T118 [US5] Implement `apps/server/src/modules/quizzes/quizzes.api.ts` (`GET /learn/quizzes/:quizId`, `POST|GET /learn/quizzes/:quizId/attempts`) with OpenAPI
- [X] T119 [US5] Implement `apps/web/src/features/quizzes/quizzesApi.ts`, `apps/web/src/features/quizzes/quizSlice.ts` (current index, answers per quiz; selectors `selectAnsweredCount`, `selectUnanswered`) with a listener persisting to the `quiz:<quizId>` storage key and hydration on start, and `apps/web/src/features/quizzes/utils.ts` (answer toggling for single/multiple, order handling) with 100 % tests
- [X] T120 [US5] Implement components in `apps/web/src/features/quizzes/components/`: `QuizStart`, `QuizQuestion` (RadioGroup/Checkbox, Markdown text), `QuizNavigator` (answered/unanswered indicators with text), `SubmitConfirmDialog`, `QuizResult` (score, status badge, per-question review, retry), `AttemptHistory`; integrate as lesson type `quiz` in `apps/web/src/features/player/components/LessonView.tsx` via the quizzes feature's public `QuizLesson.tsx`

**Implementation notes (US5)**: explanations are part of every graded result, correct options follow
`revealAnswers` (`always`, or after a pass / when no attempts are left); the attempt stores the graded snapshot
(selected and correct options, points, explanation) for BR-Q5; the attempt limit is checked inside a transaction that
locks the enrollment row; `QuizForStudent` adds `lessonId` and `canSubmit` (false in preview or without attempts);
an invalid answer set is a `VALIDATION_ERROR` with `errors.quizzes.invalidAnswers`; a restored attempt opens the
questions directly; the shuffled order is kept in the `quiz:<quizId>` storage value and reused after a reload.

**Checkpoint**: US5 works on top of US3

---

## Phase 8: User Story 6 - Course completion and certificate (Priority: P2)

**Goal**: automatic course completion, certificate, public verification, printing

**Independent Test**: complete a short demo course and open the certificate verification page
without logging in

### Tests for User Story 6

- [X] T121 [P] [US6] Integration tests in `apps/server/tests/integration/completion.test.ts`: completing the last lesson sets `completed`, issues exactly one certificate even with 5 concurrent completion requests (BR-C1), creates a `course_completed` notification; adding lessons later keeps the status and certificate (BR-C2); leaving a course with a certificate → 422; `GET /certificates/:code` valid, unknown → 404, revoked shows revoked; the code alphabet excludes `0 O 1 I L`; the SSR certificate page renders in `uk` and with `?lang=en`

### Implementation for User Story 6

- [X] T122 [P] [US6] Define `packages/contracts/src/certificates.ts` (`CertificateDto`, code format regex)
- [X] T123 [US6] Implement `apps/server/src/modules/certificates/certificates.service.ts` (`generateCode`, `issueForEnrollment(tx)` idempotent via the unique `enrollment_id`, snapshot `studentName`/`courseTitle`/`authorName`, `getByCode`, `listMine`)
- [X] T124 [US6] Extend `apps/server/src/modules/learning/progress.service.ts` with `checkCompletion(tx, enrollmentId)` (all lessons completed → status `completed`, `completedAt`, certificate, notification) called from `completeLesson` and the quiz pass; return `courseCompleted` and `certificateCode` in `ProgressResult`
- [X] T125 [US6] Add `GET /certificates/:code` to `apps/server/src/modules/catalog/catalog.api.ts`, `GET /me/certificates` to `apps/server/src/modules/users/me.api.ts`; implement `apps/server/src/modules/certificates/certificates.web.ts` and `apps/server/src/views/pages/certificate.ejs` (valid/revoked/not-found states, localized date, print stylesheet with a single `@media print` page)
- [X] T126 [US6] Implement `apps/web/src/features/certificates/certificatesApi.ts`, `apps/web/src/features/certificates/CertificatesPage.tsx` (view, copy link, print), `apps/web/src/features/certificates/CertificatesBlock.tsx` for the dashboard, and `apps/web/src/features/player/CourseCompletedPage.tsx` at `/app/learn/:courseId/completed` (redirect after `courseCompleted`, links to the certificate and to the review form on the course page)

**Implementation notes (US6)**: completion checks lock the enrollment row (`lockEnrollment`), so concurrent
requests issue one certificate and one notification; the public endpoint lives in `modules/certificates/`
(`certificates.api.ts`, `certificates.web.ts`) instead of `catalog.api.ts`; codes are matched case-insensitively;
`CertificateDto` adds `courseId` and `courseSlug` for the SPA; "Print / PDF" opens the public page with `?print=1`
(`public/js/print.js` prints it; the site chrome is `print:hidden`); copying the link is a `queryFn` mutation with
a `CLIPBOARD` error code; the dashboard response now includes `certificates`.

**Checkpoint**: the full learning loop up to the certificate

---

## Phase 9: User Story 7 - Course reviews and rating (Priority: P2)

**Goal**: reviews, rating, author replies

**Independent Test**: a student with 40 % progress leaves a review, the author replies, the rating
is updated

### Tests for User Story 7

- [X] T127 [P] [US7] Integration tests in `apps/server/tests/integration/reviews.test.ts`: BR-R1 (progress < 30 % and not completed → 422), BR-R2 (second review → 409, course author → 422), BR-U4 unverified → 422, edit/delete own only, reply only by the course author (once, editable), hidden reviews excluded from the rating average and count, notifications `course_new_review` and `review_replied`

### Implementation for User Story 7

- [X] T128 [P] [US7] Define `packages/contracts/src/reviews.ts` (create `rating 1–5`, `text 10–2000`; update; reply `≤ 1000`)
- [X] T129 [US7] Implement `apps/server/src/modules/reviews/reviews.service.ts` (`canReview` returning a reason key used by `CourseDetail.viewer`, `create` notifying the course author with `course_new_review`, `update`, `remove`, `reply` notifying the reviewer with `review_replied`) and `apps/server/src/modules/reviews/reviews.api.ts` (`POST /courses/:id/reviews`, `PATCH|DELETE /reviews/:id`, `PUT /reviews/:id/reply`, `GET /instructor/reviews`) with OpenAPI
- [X] T130 [US7] Add SSR review forms to `apps/server/src/views/pages/course.ejs` and handlers `POST /courses/:slug/reviews` and `/reviews/delete` in `apps/server/src/modules/catalog/catalog.web.ts`; implement `apps/server/src/public/js/star-input.js` (accessible radio-based star input working without JS, labels rendered by the server)
- [X] T131 [US7] Implement `apps/web/src/features/reviews/reviewsApi.ts` (`GET /instructor/reviews` as an `infiniteQuery`, reply mutation) and `apps/web/src/features/reviews/TeachReviewsPage.tsx` at `/app/teach/reviews` (filter by course, `VirtualList`, reply/edit reply dialog), with tests in `apps/web/src/features/reviews/__tests__/`

**Implementation notes (US7)**: eligibility (BR-R1, BR-R2, BR-U4) lives once in `reviewEligibility` and feeds
both the API errors and `CourseDetail.viewer` (`canReview`, `reviewBlockReason`, `myReview`); a review DTO mapper is
shared in `modules/reviews/review-dto.ts`; one SSR form creates or edits the review, invalid input re-renders the
course page (422) with field errors, delete is `POST /courses/:slug/reviews/delete`; `review_replied` is sent on the
first reply only; the SPA course filter lists the courses found among the author's reviews until the teaching course
list exists (US8); the SPA test setup stubs element sizes, pointer capture and `scrollIntoView` for virtual lists and
Radix Select in jsdom.

**Checkpoint**: US7 works; catalog ratings reflect reviews

---

## Phase 10: User Story 8 - A user becomes an instructor and creates a course (Priority: P2)

**Goal**: instructor application, course creation and editing, drag-and-drop curriculum, lesson and
quiz editors, drafts, moderation checklist

**Independent Test**: an instructor creates a course with 1 module and 3 lessons (including a quiz)
and submits it for moderation

### Tests for User Story 8

- [X] T132 [P] [US8] Integration tests in `apps/server/tests/integration/applications.test.ts`: BR-U1 single pending, retry 7 days after rejection, unverified email blocked (BR-U4), admins notified
- [X] T133 [P] [US8] Integration tests in `apps/server/tests/integration/instructor-courses.test.ts`: create a draft with `language`; only the author edits (403 for others); slug uniqueness incl. history (409); a slug change of a published course writes history and the old slug redirects 301 (BR-P6); readiness items (BR-P1 incl. content language) and submit → 422 with `unmet`; editing forbidden in `pending_review` and `archived` (BR-P2); withdraw; archive/restore (BR-P4); delete only a never-enrolled draft (BR-P5); cover upload type/size validation; BR-U2 a demoted instructor cannot edit; BR-U4 an author with an unverified email cannot submit → 422
- [X] T134 [P] [US8] Integration tests in `apps/server/tests/integration/curriculum.test.ts`: module/lesson CRUD, `PUT structure` rejects mismatched id sets and moves lessons between modules atomically, lesson type locked after completions/attempts, deleting a lesson recalculates progress and may complete enrollments (BR-C3), `PUT /instructor/lessons/:id/quiz` validates `single` exactly one correct and `multiple` at least one, options 2–8
- [X] T135 [P] [US8] SPA tests: `apps/web/src/features/teachCurriculum/__tests__/` (`moveLesson`/`moveModule` utils 100 %, drag result persisted via mutation), `apps/web/src/features/teachLessons/__tests__/` (autosave draft every 5 s after a change, restore/discard dialog when `draft.savedAt > updatedAt`, conflict warning, unsaved-changes blocker), `apps/web/src/features/teachQuizzes/__tests__/` (`validateQuizDraft` utils 100 %)

### Implementation for User Story 8

- [X] T136 [P] [US8] Define `packages/contracts/src/instructor.ts` (create course `{ title 5–120, categoryId, level, language }`, update with limits from data-model.md, `CourseEditor`, `ModuleDto`, `LessonEditor`, structure payload, readiness items as i18n keys) and `packages/contracts/src/applications.ts` (`motivation 50–2000`, `experience ≤ 2000`, `ApplicationDto`)
- [X] T137 [US8] Implement `apps/server/src/modules/applications/applications.service.ts` (`apply` with `notifyAdmins(admin_application_submitted)`, `getMine` with `canApplyAt`) and `applications.web.ts` (`GET /teach`, `POST /teach/apply`) with the view `apps/server/src/views/pages/teach.ejs`; add `GET|POST /me/instructor-application` to `apps/server/src/modules/users/me.api.ts`
- [X] T138 [US8] Implement `apps/server/src/modules/courses/courses.service.ts` (`create` with slugify + suffix uniqueness and `language` defaulting to the author's locale, `update` with editability by status and BR-U2, slug history, tag normalization ≤ 5, `uploadCover`, `getReadiness` BR-P1 items, `submit` (verified email, notify admins), `withdraw`, `archive`, `restore`, `remove` BR-P5, `listMine`, `getOverview`)
- [X] T139 [US8] Implement `apps/server/src/modules/courses/instructor-courses.api.ts` (`/instructor/overview`, `/instructor/courses` CRUD, cover, readiness, submit/withdraw/archive/restore) with OpenAPI
- [X] T140 [US8] Implement `apps/server/src/modules/curriculum/curriculum.service.ts` (`createModule`, `renameModule`, `deleteModule`, `setStructure` as a transactional rewrite of positions, `createLesson` auto-creating a Quiz for the `quiz` type, `getLessonForEditor`, `updateLesson` with type lock and video URL validation, `deleteLesson` with BR-C3 recalculation via progress.service) and `apps/server/src/modules/curriculum/curriculum.api.ts`
- [X] T141 [US8] Add `saveQuiz(lessonId, QuizEditor)` (full replace in a transaction, validation) to `apps/server/src/modules/quizzes/quizzes.service.ts` and `PUT /instructor/lessons/:id/quiz` to `apps/server/src/modules/quizzes/quizzes.api.ts`
- [X] T142 [US8] Implement `apps/web/src/features/teachCourses/teachCoursesApi.ts` (overview, list, create, get, update, cover upload, readiness, lifecycle mutations with tags)
- [X] T143 [US8] Implement `apps/web/src/features/teachCourses/TeachDashboardPage.tsx` (overview cards, course list with a status filter and status badges, "Create course" `CreateCourseDialog` with title, category, level and content language) at `/app/teach` guarded by `RequireRole('instructor','admin')`
- [X] T144 [US8] Implement `apps/web/src/features/teachCourses/CourseEditorPage.tsx` with tabs in `apps/web/src/features/teachCourses/components/`: `BasicTab` (react-hook-form + contracts schema with localized messages, Markdown description with preview, content language, dynamic outcomes/requirements lists, tags input, cover upload, course draft persisted to `draft:course:<id>`), `PublishTab` (status, readiness checklist with icons + text, submit/withdraw/archive/restore, last moderation comment); the `CurriculumTab` slot rendered from teachCurriculum
- [X] T145 [US8] Implement `apps/web/src/features/teachCurriculum/teachCurriculumApi.ts`, `utils.ts` (`moveLesson`, `moveModule`, `toStructurePayload`) and `CurriculumEditor.tsx` with components (`SortableModule`, `SortableLesson` with the dnd-kit keyboard sensor and localized screen-reader announcements, add/rename/delete dialogs, preview toggle)
- [X] T146 [US8] Implement `apps/web/src/features/teachLessons/teachLessonsApi.ts`, `useLessonDraft.ts` (autosave every 5 s via storageApi `draft:lesson:<id>`, restore/discard, conflict detection), `useUnsavedChangesBlocker.ts`, and `LessonEditorPage.tsx` at `/app/teach/lessons/:id` with components `MarkdownEditor` (edit/preview tabs, toolbar: heading, bold, list, code, link, image URL), `VideoLessonFields` (URL validated by `parseVideoUrl`), the common fields form
- [X] T147 [US8] Implement `apps/web/src/features/teachQuizzes/utils.ts` (`validateQuizDraft` returning i18n keys, `duplicateQuestion`, reorder) and `QuizEditor.tsx` (settings, question list add/remove/duplicate/reorder, options with correct marks, points, explanation) used by `LessonEditorPage` for `quiz` lessons
- [X] T148 [US8] Add "Teaching" to the SPA and SSR user menus for instructors, and "Edit course" on the course page for authors linking to `/app/teach/courses/:id`

**Implementation notes (US8)**: `@hookform/resolvers` 6 has an unresolvable optional peer (`effect`), so
`shared/utils/zodResolver.ts` (localized like the server) replaces it; drafts are a small `drafts` feature
(`draftsApi` over `storageApi`, `useDraft`, restore dialog, `useUnsavedChangesBlocker` + dialog) used by the course
basics and the lesson editor (`useLessonDraft`); `MarkdownEditor` and `LessonTypeIcon` live in `shared/components`
(labels via `locale/useMarkdownLabels`); the curriculum keeps a pending order in `curriculumSlice` until the course
refetches, and every lesson also has "Move up/down" buttons as a non-drag alternative; SPA routes under `/app/teach`
are guarded by `RequireAuth roles`; the "Teaching" menu entries and the "Edit course" link already existed from US1–US3;
`QuizForStudent` editing types come from `packages/contracts/src/quizzes.ts`; the SPA test setup also stubs
`ResizeObserver`; `formatDate` gained a `time` style for the autosave note.

**Checkpoint**: an instructor creates and submits a course; without US9 it stays awaiting review

---

## Phase 11: User Story 9 - The administrator moderates and manages the platform (Priority: P2)

**Goal**: SSR admin panel: dashboard, users, moderation, applications, categories, reviews,
certificates, audit log; API equivalents

**Independent Test**: the administrator approves an application and a course; the course is in the
catalog, both actions are in the audit log

### Tests for User Story 9

- [X] T149 [P] [US9] Integration tests in `apps/server/tests/integration/admin.test.ts`: non-admin → 403 on `/api/v1/admin/*` and `/admin/*`; approve/reject/unpublish with reason `10–1000` (missing → 422), notifications and emails in the recipient's locale; application approval sets role `instructor`; blocking revokes refresh tokens and blocks login; self-block/self-demote and the last active admin are protected (BR-U3); a category with courses cannot be deleted; categories require both `nameUk` and `nameEn`; review hide/unhide; certificate revoke; every mutation creates an audit entry
- [X] T150 [P] [US9] SSR tests in `apps/server/tests/integration/ssr-admin.test.ts`: every admin page renders for an admin in `uk` and `en`; forms without `_csrf` are rejected; PRG flash after actions

### Implementation for User Story 9

- [X] T151 [P] [US9] Define `packages/contracts/src/admin.ts` (reason payload, role payload, `AdminUserRow` with `locale`, `AdminUserDetail`, `AdminCategoryDto` with `nameUk`/`nameEn`, `AuditDto`, admin stats, filters)
- [X] T152 [US9] Implement `apps/server/src/modules/admin/admin.service.ts` (users list/detail/role/block/unblock with BR-U3, course moderation approve/reject/unpublish with notifications and emails, applications approve/reject, categories CRUD with names in both languages and the delete restriction, reviews hide/unhide with the `review_hidden` notification, certificate revoke, audit log query), recording an audit entry for every mutation
- [X] T153 [US9] Implement `apps/server/src/modules/stats/admin-stats.service.ts` (cards, 30-day daily registrations/enrollments, top-5 courses, recent audit)
- [X] T154 [US9] Implement `apps/server/src/modules/admin/admin.api.ts` (all `/admin/*` endpoints from contracts/rest-api.md) with OpenAPI
- [X] T155 [P] [US9] Create email templates `apps/server/src/views/emails/{course-approved,course-rejected,course-unpublished,application-approved,application-rejected}.ejs` and their `emails.*` keys
- [X] T156 [US9] Create `apps/server/src/views/layouts/admin.ejs` (sidebar navigation with counters, locale switcher, responsive collapse) and `apps/server/src/views/partials/admin-table.ejs`, `svg-chart.ejs` (server-rendered bar/line SVG with an accessible localized title and a data table fallback), `reason-form.ejs`
- [X] T157 [US9] Implement `apps/server/src/modules/admin/admin.web.ts` with views `apps/server/src/views/admin/{dashboard,users,user,courses,moderation,course,applications,application,categories,reviews,certificates,audit}.ejs` per contracts/ssr-routes.md, audit action labels from `admin.audit.<action>`

**Implementation notes (US9)**: the admin logic is split by area instead of one `admin.service.ts`
(`admin-users`, `admin-courses`, `admin-applications`, `admin-categories`, `admin-content` for reviews and
certificates, `audit-log`), shared by `admin.api.ts` and `admin.web.ts`; every mutation writes its audit entry in the
same transaction; the panel uses `partials/admin-filters.ejs` (GET filters) instead of a generic table partial; every
admin action is a POST with `returnTo` and a flash message (PRG); the email layout now has an optional reason quote and
shows expiry/"ignore" lines only for link-token emails; the course page certificate mapper is shared
(`toCertificateDto`); the 30-day series uses UTC days.

**Checkpoint**: the full publication loop: application → course → moderation → catalog

---

## Phase 12: User Story 10 - An instructor analyzes a course and works with students (Priority: P3)

**Goal**: course students, CSV, attempt reset, statistics with charts

**Independent Test**: on a demo course open the statistics, find the lesson with the largest drop-off,
export the CSV

### Tests for User Story 10

- [X] T158 [P] [US10] Integration tests in `apps/server/tests/integration/instructor-stats.test.ts`: student list search/sort/pagination; CSV has a UTF-8 BOM and headers in the request locale (`uk` Cyrillic, `en` English); attempt reset removes attempts and uncompletes the quiz lesson (BR-Q3); funnel shares in curriculum order, 12 weekly buckets, quiz average and first-try pass share; access to another author's course → 403
- [X] T159 [P] [US10] SPA tests in `apps/web/src/features/teachStats/__tests__/` (chart components are pure functions of data: snapshot tests in both locales; `utils` 100 % for bucket/percent preparation)

### Implementation for User Story 10

- [X] T160 [P] [US10] Add `StudentRow`, `CourseStats` and the students query to `packages/contracts/src/instructor.ts`
- [X] T161 [US10] Implement `apps/server/src/modules/stats/instructor-stats.service.ts` (`listStudents`, `exportStudentsCsv(courseId, query, t)` with column headers given as `MessageKey`s, `getCourseStats`) and add `resetAttempts` to `apps/server/src/modules/quizzes/quizzes.service.ts`
- [X] T162 [US10] Add `/instructor/courses/:id/students`, `/students.csv`, `/students/:userId/attempts/:quizId` DELETE and `/stats` to `apps/server/src/modules/courses/instructor-courses.api.ts` with OpenAPI
- [X] T163 [US10] Implement `apps/web/src/features/teachStudents/teachStudentsApi.ts` (`infiniteQuery` over the page-based API) and `StudentsPage.tsx` at `/app/teach/courses/:id/students` (`VirtualTable`, search, sort, progress bars, quiz results, CSV download link with the active locale, reset attempts AlertDialog)
- [X] T164 [US10] Implement `apps/web/src/features/teachStats/teachStatsApi.ts`, `utils.ts`, and `StatsPage.tsx` at `/app/teach/courses/:id/stats` with pure chart components in `apps/web/src/features/teachStats/components/` (`StatCards`, `EnrollmentsChart`, `FunnelChart` highlighting the largest drop with a text label, `QuizStatsTable`, `RatingDistribution`) using Recharts, chart tokens and locale-aware axis formatting

**Implementation notes (US10)**: course students are ranked in memory (a course has at most a few hundred), so
search and every sort work the same for the table and the CSV; `StudentRow.quizzes` carries the quiz title; the CSV
language follows the normal resolution (`?lang` from the SPA link wins over the account language); chart components
are pure functions of the data with a data table under every chart, and the SPA tests check the rendered text in both
locales instead of snapshots; the course editor links to the students and statistics pages.

**Checkpoint**: the instructor dashboard is complete

---

## Phase 13: User Story 11 - Notifications (Priority: P3)

**Goal**: notification list, counters on the site and in the dashboard, reading

**Independent Test**: after a course is approved, the author sees the counter and a notification with
a link within a minute

### Tests for User Story 11

- [X] T165 [P] [US11] Integration tests in `apps/server/tests/integration/notifications.test.ts`: list pagination newest first, unread count, read one (own only, otherwise 404), read all; a link is built for every `NotificationType`
- [X] T166 [P] [US11] SPA tests in `apps/web/src/features/notifications/__tests__/` (`buildNotificationLink` and `notificationMessage(type, payload)` utils 100 % for every type in both locales; the bell shows the count as text; read-all resets the count)

### Implementation for User Story 11

- [X] T167 [P] [US11] Define `packages/contracts/src/notifications.ts` (`NotificationDto`, payload schemas per type; the `notifications.<type>` messages already exist from T023)
- [X] T168 [US11] Add `list`, `unreadCount`, `markRead`, `markAllRead` to `apps/server/src/modules/notifications/notifications.service.ts` and implement `apps/server/src/modules/notifications/notifications.api.ts` (`/me/notifications*`) with OpenAPI
- [X] T169 [US11] Render the unread counter and notifications link in `apps/server/src/views/partials/header.ejs` via `apps/server/src/middlewares/locals.ts`
- [X] T170 [US11] Implement `apps/web/src/features/notifications/notificationsApi.ts` (unread count with `pollingInterval: 60000` and `refetchOnFocus`, list as an `infiniteQuery`, mark read with an optimistic update, read all), `utils.ts`, `NotificationBell.tsx` (in the AppLayout header), `NotificationsPage.tsx` at `/app/notifications` (`VirtualList`), `NotificationsBlock.tsx` for the dashboard

**Implementation notes (US11)**: `buildNotificationLink` lives in `packages/contracts/src/notifications.ts` and is
used by the server DTO and the SPA alike (tested there for every type); the SPA `utils.ts` has `notificationMessage`
and `linkTarget` (`/app/...` stays in the SPA); the SSR header counter comes from `templateLocals` (now async);
the dashboard response includes the five latest notifications.

**Checkpoint**: roles are connected by notifications

---

## Phase 14: User Story 12 - Student learning tools (Priority: P3)

**Goal**: notes, Wikipedia lookup, video data, clearing personal data on logout

**Independent Test**: a summary for a selected word; a note survives a reload and is exported

### Tests for User Story 12

- [X] T171 [P] [US12] Tests in `apps/web/src/features/wiki/__tests__/` (MSW: uk UI → uk hit; uk 404 → en fallback; en UI → en first then uk; both 404 → not_found; timeout → unavailable; disambiguation; `normalizeSelection` 2–80 chars ≤ 5 words, `wikiLanguageOrder(locale)` and `lruInsert` ≤ 20 utils 100 %)
- [X] T172 [P] [US12] Tests in `apps/web/src/features/notes/__tests__/` (save/restore per lesson, `exportNotesMarkdown` util 100 % with localized headings, storage unavailable warning) and `apps/web/src/features/videoEmbed/__tests__/` (noembed normalization, error field → not_found)
- [X] T173 [P] [US12] Test in `apps/web/src/features/auth/__tests__/logoutCleanup.test.ts`: logout or a different user's login clears `notes:*`, `quiz:*`, `draft:*`, `wiki-cache` and keeps `theme`, `locale`, `ui`

### Implementation for User Story 12

- [X] T174 [US12] Implement `apps/web/src/features/wiki/wikiApi.ts` (own `createApi` with `fetchBaseQuery` to Wikipedia REST, 5 s timeout, language order from the active locale in `queryFn`, cache read/write via storageApi `wiki-cache`), `utils.ts` (`normalizeSelection`, `wikiLanguageOrder`, `toWikiSummary`, `lruInsert`), `useTextSelection.ts`, `WikiLookup.tsx` (floating "What is this?" button + Popover with title, extract, thumbnail, link, error states) and mount it in `apps/web/src/features/player/components/LessonView.tsx`
- [X] T175 [US12] Implement `apps/web/src/features/notes/notesApi.ts` (storage-backed queries/mutations per course), `utils.ts` (`exportNotesMarkdown`, size limit 20 000), `NotesPanel.tsx` (debounced autosave, list of course notes, `.md` export via a Blob download, warning when storage is unavailable) and integrate it into `PlayerPage` (resizable panel width saved to `ui`)
- [X] T176 [US12] Implement `apps/web/src/features/videoEmbed/videoEmbedApi.ts` (noembed with a 5 s timeout), `utils.ts` (`toVideoMeta`), `VideoMetaCard.tsx`; use it in `apps/web/src/features/teachLessons/components/VideoLessonFields.tsx` and for video lesson thumbnails in the curriculum sidebar
- [X] T177 [US12] Implement the logout cleanup listener in `apps/web/src/features/auth/authSlice.ts` / store listener (on logout, `sessionExpired`, or a `last-user` mismatch → `storageApi.clearPersonal`)

**Implementation notes (US12)**: `wikiApi` and `videoEmbedApi` are separate `createApi` instances over
`fakeBaseQuery` (typed `WikiError`/`VideoMetaError`) that call a `fetchBaseQuery` with a 5 s timeout inside `queryFn`;
any error other than 404 (network, timeout, 5xx) maps to `unavailable`, so the network-error test covers the timeout
branch. The wiki cache is read and written in the same `queryFn` (an unavailable storage only means a request). The
note being typed lives in `notesSlice`; `saveNote` writes it 0.8 s after typing stops. Video thumbnails in the
curriculum sidebar are not shown: `LearnLesson` carries no video URL, and fetching noembed for every lesson of a
course on each player load is not worth it; the card is used in the lesson editor. Personal storage is cleared by
`authListeners` (`sessionExpired`, `last-user` mismatch on `getMe`) and by `useLogout`.

**Checkpoint**: the lab 2 requirements for external APIs and local storage are covered

---

## Phase 15: User Story 13 - A third-party client works through the programmatic interface (Priority: P3)

**Goal**: complete OpenAPI documentation, Swagger, a Postman collection with a demo flow

**Independent Test**: the Collection Runner / newman runs "Demo flow" from student login to the
approved course appearing in the catalog

### Tests for User Story 13

- [X] T178 [P] [US13] Test in `apps/server/tests/integration/openapi.test.ts`: every Express route under `/api/v1` is present in the generated document with security requirements and the `Accept-Language` parameter; the document validates against the OpenAPI 3.1 schema
- [X] T179 [P] [US13] Test in `apps/server/tests/integration/api-conventions.test.ts`: unauthenticated → 401 `UNAUTHORIZED`, wrong role → 403, invalid body → 400 with `details` in the request locale, rate limit → 429 with `retryAfterSec`, `X-Request-Id` and `Content-Language` present

### Implementation for User Story 13

- [X] T180 [US13] Complete OpenAPI metadata in `apps/server/src/openapi/document.ts` (info, servers, tags per module, examples for key requests/responses incl. a localized error in both languages, error response components) and Swagger UI options (persistAuthorization, Authorize for Bearer)
- [X] T181 [US13] Create `docs/api/learnly.postman_collection.json` and `docs/api/learnly.postman_environment.json` (variables baseUrl, tokens, `locale`; folders per module; login scripts saving tokens; status-code tests; folder "Demo flow": student login → catalog → enroll → complete lesson → submit quiz → review; instructor login → create course → module → lessons → quiz → submit; admin login → approve; the catalog contains the course; request "Localized error" sent with `Accept-Language: uk` and `en` asserting the same `code`)
- [X] T182 [US13] Add the root script `test:postman` running the collection with `newman` against a freshly seeded server and wire it into `npm run check:full`

**Implementation notes (US13)**: the route-coverage test walks the Express router stack and compares it with
the generated document both ways; the document is validated with `@seriousme/openapi-schema-validator`. The error
examples are built by the real `parseInput` and `apiErrorBody` (now shared by the error handler), so the uk/en
examples in Swagger are exactly what the API returns. The demo flow runs instructor → administrator → catalog →
student on a course the collection creates itself, so it does not depend on random seed data and can run again.
`npm run test:postman` (`scripts/postman.mjs`) applies migrations to a separate `<db>_postman` database with the
non-destructive `migrate deploy`, seeds it (the seed truncates every table), starts the server on port 3199 and
runs Newman through `npx newman@6.2.3`; Newman is not a dependency because it pulls 19 known-vulnerable
transitive packages. Anonymous requests in the collection drop the session cookie first: for a signed-in user the
account language wins over `Accept-Language`.

**Checkpoint**: lab 3 is demonstrated with developer tools

---

## Phase 16: User Story 14 - Profile, settings and appearance (Priority: P3)

**Goal**: profile and avatar, public author page with the profile, one theme everywhere

**Independent Test**: change the avatar and the theme, go from the site to the dashboard and back:
everything is the same, no flashing

### Tests for User Story 14

- [X] T183 [P] [US14] Integration tests in `apps/server/tests/integration/profile.test.ts`: `PATCH /me` limits (`name 2–60`, `bio ≤ 500`, links valid URL ≤ 200, `locale` only `uk|en`); an avatar > 1 MB or a non-image (renamed .txt) is rejected; the avatar is stored as 256×256 WebP; delete avatar; the `theme` cookie renders `data-theme` on SSR
- [X] T184 [P] [US14] SPA tests in `apps/web/src/features/profile/__tests__/` (form validation from contracts with localized messages, avatar upload error display)

### Implementation for User Story 14

- [X] T185 [US14] Add `updateProfile`, `setAvatar`, `removeAvatar` to `apps/server/src/modules/users/users.service.ts` and `PATCH /me` (profile fields), `POST|DELETE /me/avatar` to `apps/server/src/modules/users/me.api.ts`
- [X] T186 [US14] Implement `apps/web/src/features/profile/profileApi.ts` and `ProfilePage.tsx` at `/app/profile` (name, bio, links, avatar upload with preview and remove)
- [X] T187 [US14] Add `AppearanceSettings.tsx` (light/dark/system using the ThemeToggle state) to `apps/web/src/features/settings/SettingsPage.tsx` and verify SSR ↔ SPA theme sync through the `theme` cookie

**Implementation notes (US14)**: `updateMeSchema` now carries `name`, `bio` (empty → null) and `links` (empty → removed,
http(s) only); `userNameSchema` moved to `contracts/me.ts` to avoid an import cycle with `auth.ts` (re-exported there).
`PATCH /me` applies only the fields present; the avatar keeps the existing `saveAvatar` (signature check, 256×256
WebP) and deletes the previous file. The SPA profile form follows the settings pattern (uncontrolled form, contract
check, client errors in `profileSlice`); `checkForm`/`fieldErrorsFrom` moved to `shared/utils/checkForm.ts` for both
features. The avatar file type and size are checked before uploading, the server checks again. The public author page
(FR-PROFILE-3) already existed from US1. On Windows the avatar test reads image metadata from a buffer: sharp keeps a
path open and delays the deletion the test checks.

**Checkpoint**: every story is implemented

---

## Phase 17: Polish & Cross-Cutting Concerns

**Purpose**: quality, end-to-end checks, documentation

- [X] T188 [P] E2E setup in `apps/web/e2e/playwright.config.ts` (build + start the server on a seeded database, Chromium, projects for `uk` and `en` browser locales) and `apps/web/e2e/helpers/mailpit.ts` (read the latest email through the Mailpit API)
- [X] T189 [P] E2E `apps/web/e2e/enroll.spec.ts`: guest → catalog filter → course → enroll → register → verify email via Mailpit → first lesson opened
- [X] T190 [P] E2E `apps/web/e2e/complete-course.spec.ts`: a student completes lessons, reloads mid-quiz (answers kept), fails then passes the quiz, completes the course, opens the certificate in a fresh context, leaves a review
- [ ] T191 [P] E2E `apps/web/e2e/publish-course.spec.ts`: a user applies, the admin approves, the instructor builds a course with drag and drop, closes the tab mid-edit and restores the draft, submits, the admin rejects then approves, the course is in the catalog, audit log entries exist
- [ ] T192 [P] E2E `apps/web/e2e/locale.spec.ts`: an English-preferring browser gets English; switching on the site, in the admin panel and in the dashboard; the choice persists across pages and after re-login on a new context; English email in Mailpit for an English user; filtering the catalog by English-language courses (US4 independent test)
- [ ] T193 [P] Accessibility checks with `@axe-core/playwright` in `apps/web/e2e/a11y.spec.ts` for home, catalog, course, login, admin dashboard, dashboard, player, quiz, course editor (no serious/critical violations, both themes, both languages)
- [ ] T194 [P] Responsive check `apps/web/e2e/responsive.spec.ts`: no horizontal scroll at 360/768/1024/1440 for all SSR pages and SPA screens in both themes and both languages (SC-007)
- [ ] T195 Review every SPA screen for loading/empty/error/success states and `aria-busy` on async controls (FR-046); fix gaps in the owning feature components
- [ ] T196 Translation review pass: read both dictionaries end to end for terminology consistency (one term per concept: course, lesson, module, quiz, enrollment), Ukrainian plural correctness and natural English; record the glossary in `packages/i18n/GLOSSARY.md`
- [ ] T197 [P] Performance check script `scripts/perf.mjs` (autocannon against `/courses`, `/courses/:slug`, `/api/v1/courses`; assert p95 < 300 ms / 200 ms) and a bundle budget check of the `apps/web/dist` initial chunk ≤ 250 KB gzip with the inactive locale as a separate chunk
- [ ] T198 [P] Security pass: verify CSP and security headers on SSR, API and `/app`; cookie flags; `npm audit --omit=dev` clean of high/critical; document findings in `docs/security-notes.md` for lab 5
- [ ] T199 Write `README.md` in English (stack, structure, ≤ 5-command setup, URLs, demo accounts incl. English-speaking ones, scripts, how each lab requirement maps to features, how to add a translation key, links to tz.md, spec, Swagger, Postman)
- [ ] T200 Run `npm run check`, `npm run e2e`, `npm run test:postman` and every scenario of `specs/001-learnly-lms/quickstart.md`; fix failures
- [ ] T201 Update the acceptance checklists in `docs/tz.md` section 13 to reflect the implemented state and note any deviations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: after Setup; blocks every story (includes the i18n core, so every story
  is built bilingual from the start)
- **US1 (Phase 3)**: after Foundational
- **US2 (Phase 4)**: after Foundational; independent of US1
- **US3 (Phase 5)**: needs US2 (login) and US1 (the SSR enroll button on the course page)
- **US4 (Phase 6)**: needs US1–US3 to have screens to verify; its switchers and persistence can start
  right after Foundational
- **US5 (Phase 7)**: needs US3 (player, progress)
- **US6 (Phase 8)**: needs US3; works without US5 (courses without quizzes), fully after US5
- **US7 (Phase 9)**: needs US3 (progress for BR-R1) and US1 (course page)
- **US8 (Phase 10)**: needs US2; the editor is independent of US3–US7
- **US9 (Phase 11)**: needs US8 for course and application moderation; user and category management
  works after US2
- **US10 (Phase 12)**: needs US8 and US5 (attempt reset)
- **US11 (Phase 13)**: needs the Foundational `notify`; events come from US6–US9
- **US12 (Phase 14)**: needs US3 (player) and US8 (video lesson editor)
- **US13 (Phase 15)**: after every API story (US1–US11)
- **US14 (Phase 16)**: needs US2
- **Polish (Phase 17)**: after every story

### Story Completion Order

```text
Setup → Foundational → US1 ┐
                    → US2 ─┴→ US3 → US4 → US5 → US6 → US7
                       US2 → US8 → US9 → US10
                       US3 + US8 → US12
                       US6..US9 → US11
                       US2 → US14
                       all → US13 → Polish
```

### Within Each User Story

- Tests are written first and fail
- Contracts (`packages/contracts`) and dictionary keys (`packages/i18n`) → services → api/web routes
  → SPA api → SPA components
- A story is finished when `npm run check` is green

## Parallel Execution Examples

### Foundational

```text
T013 enums | T014 limits | T015 common/errors | T016 slugify | T017 video | T018 markdown
T019 locales | T021 format | T022 zod | T025 check-ejs-strings
T029 logger+db | T030 errors | T031 passwords+tokens | T032 server i18n | T033 mailer | T034 markdown | T035 images | T036 pagination
T062 form primitives | T063 display | T064 overlay | T065 data primitives | T066 test utils
```

### User Story 1

```text
T071 catalog API tests | T072 SSR tests | T073 catalog schemas
T079 preview+instructor views | T080 static pages uk/en | T081 seo
```

### User Story 3

```text
T092 progress unit tests | T093 learning integration tests | T094 SPA tests | T095 schemas
(T100 enrollmentsApi follows T098)
```

### User Story 8

```text
T132 applications tests | T133 courses tests | T134 curriculum tests | T135 SPA tests | T136 schemas
(T142 teachCoursesApi follows T139)
```

### Across stories (after US2)

```text
US1 and US2 in parallel right after Foundational
US8 in parallel with US3–US7
US14 in parallel with any story after US2
```

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Phase 1 Setup → Phase 2 Foundational (including the i18n core)
2. US1 (storefront) and US2 (account) in parallel
3. US3 (learning)
4. **STOP and VALIDATE**: quickstart scenarios 1, 2 and the learning part of 4 (without quizzes),
   `npm run check`
5. This already demonstrates the core of lab 1 (pages, static content, registration, actions) and
   lab 2 (SPA), in both languages

### Incremental Delivery

1. MVP → US4: the bilingual experience is complete and verified
2. US5 → US6 → US7: the complete learning loop
3. US8 → US9: the publication loop, the admin panel (lab 1 complete)
4. US10 → US11 → US12: a full dashboard, external APIs and local storage (lab 2 complete)
5. US13: documentation and Postman (lab 3 complete)
6. US14 → Polish: completeness, e2e, translation review, README

### Notes

- [P] = different files, no dependency on unfinished tasks
- Every story is verified by its Independent Test
- Commit after each task or logical group
- Features from `docs/tz.md` section 15 are not implemented
