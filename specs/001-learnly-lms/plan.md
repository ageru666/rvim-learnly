# Implementation Plan: Learnly, an online course platform (mini-LMS)

**Branch**: `001-learnly-lms` | **Date**: 2026-10-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-learnly-lms/spec.md`

## Summary

A coherent bilingual (Ukrainian by default, English) mini-LMS covering labs 1–3: one
Node.js/Express server with PostgreSQL serves server-rendered pages of the public site and the
admin panel (EJS), the REST API `/api/v1` with OpenAPI/Swagger, and the built React SPA "Dashboard"
at `/app`. Business logic lives in the services of server modules and is called by both SSR routes
and API routes. Contracts (Zod schemas, enums, rule constants) and localization (typed uk/en
dictionaries, translator, `Intl` formatting) are shared packages. The SPA follows the guideline
(feature-first, RTK Query for all I/O including localStorage and the Wikipedia and noembed external
APIs). Everything runs locally: Docker starts Postgres and Mailpit, no external accounts are needed.

## Technical Context

**Language/Version**: TypeScript ~6.0 (strict), Node.js 24 LTS (`>=24`, development on 24.22.1)

**Primary Dependencies**:
- server: Express 5.3, EJS 7, Prisma 7.10 + `@prisma/adapter-pg`, Zod 4.6,
  `@asteasolutions/zod-to-openapi` 9, swagger-ui-express 5, argon2 0.45, jose 6, multer,
  sharp 0.35, file-type, nodemailer 10, pino / pino-http, helmet, express-rate-limit,
  cookie-parser, unified/remark/rehype, `@tailwindcss/cli` 4.3
- web: React 19.3, Vite 8.3, React Router 8, Redux Toolkit 2.13 (RTK Query incl. `infiniteQuery`),
  Radix UI Primitives, Tailwind CSS 4.3 (`@tailwindcss/vite`), react-hook-form +
  `@hookform/resolvers`, react-markdown + rehype-sanitize + rehype-highlight, dnd-kit, Recharts 3,
  lucide-react, async-mutex, `@tanstack/react-virtual` 3.14, `@fontsource*`
- shared: `packages/contracts` (Zod), `packages/i18n` (dictionaries, translator, formatters, Zod
  error maps), `packages/design-tokens` (theme.css)
- tooling: ESLint 10 + typescript-eslint, eslint-plugin-boundaries, Prettier, knip,
  license-checker-rseidelsohn 5, newman 6

**Storage**: PostgreSQL 18 (Docker, port 5433; extensions `citext`, `pg_trgm`), local folder
`apps/server/uploads` for images, browser localStorage for client data

**Testing**: Vitest 5 (all packages), Supertest (API on the `learnly_test` database), Testing
Library + MSW 2 + jsdom (SPA), Playwright 1.64 (e2e, Chromium), newman (Postman collection)

**Target Platform**: a local Windows/Linux/macOS machine with Node and Docker; browsers: latest
2 versions of Chrome, Firefox, Safari, Edge

**Project Type**: web application (monorepo: server + SPA + shared packages)

**Performance Goals**: catalog and course pages < 300 ms p95 on localhost, read API < 200 ms,
dashboard action feedback < 0.5 s, initial SPA bundle ≤ 250 KB gzip (inactive locale loaded on
demand)

**Constraints**: no external accounts or keys; Ukrainian and English UI with no untranslated or
hard-coded strings; WCAG AA; 360–1440 px; light and dark themes; catalog works without JS; correct
answers never leave the server before an attempt is submitted

**Scale/Scope**: tens of concurrent users; 22 tables + 1 view, ~100 endpoints, ~30 SSR pages,
~16 SPA screens, 2 locales, 14 user stories, 55 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Before Phase 0 | After Phase 1 |
|---|---|---|---|
| I. One product, one business logic | Module services are the only owners of BR-*; SSR and API call them; contracts in `packages/contracts`, texts in `packages/i18n`; features distributed per TZ 1.4 | PASS | PASS: `contracts/ssr-routes.md` calls services directly; API and SSR share services and dictionaries |
| II. Fully autonomous | Docker (Postgres, Mailpit), keyless public APIs, no OAuth, seeds with accounts | PASS | PASS: R8, R9, `quickstart.md` ≤ 5 commands |
| III. Frontend per guideline | Feature-first, RTK Query for all I/O, `describeError` with transient/terminal, strict, exhaustive switch in lint, no barrels, virtualized long lists, license check in `check` | PASS | PASS: R13, R23, R24, `client-storage-and-external.md` through `storageApi`/`createApi`; locale is client state in `localeSlice` |
| IV. Security | argon2id, hashed tokens, permission checks, quiz answers only on the server, Zod, sanitization, CSRF, fail-fast config | PASS | PASS: R6, R7, R11, `QuizForStudent` without `isCorrect` |
| V. Tests | API integration tests on a real database, unit BR-*, 100 % utils, MSW, e2e | PASS | PASS: R18, i18n parity tests (R25) |
| VI. Design and accessibility | One `theme.css` for SSR and SPA, palette without branding, no DIN Pro, themes, responsiveness | PASS | PASS: R12; fonts with Cyrillic + Latin |
| VII. Simplicity | No repository layer, no cache layer, no denormalization, nothing from "Out of scope" | PASS | PASS: `course_stats` view instead of counters; integer positions (R20); own small i18n package instead of i18next (R25) |
| VIII. Bilingual interface | uk + en everywhere, shared typed dictionaries, parity test, no hard-coded strings, `Intl` formatting | PASS | PASS: R25, `contracts/i18n.md`, locale resolution in `ssr-routes.md` and `rest-api.md` |

No violations; Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-learnly-lms/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── rest-api.md
│   ├── ssr-routes.md
│   ├── client-storage-and-external.md
│   └── i18n.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
package.json                     # workspaces, root scripts dev/build/check/check:full/check:deps/test/e2e/test:postman/db:*
docker-compose.yml               # postgres:18-alpine (5433), axllent/mailpit (1025, 8025)
docker/postgres/init.sql
.env.example
eslint.config.js  prettier.config.js  knip.json  tsconfig.base.json
scripts/                         # check-ejs-strings.mjs, perf.mjs
README.md

packages/
├── contracts/
│   └── src/
│       ├── enums.ts             # Locale, Role, CourseStatus, LessonType, ...
│       ├── limits.ts            # field limits and BR constants
│       ├── errors.ts            # ErrorCode, ApiError schema
│       ├── common.ts            # Page<T>, PageQuery, Id, DateTime
│       ├── auth.ts  me.ts  catalog.ts  learning.ts  quizzes.ts  reviews.ts
│       ├── instructor.ts  applications.ts  admin.ts  notifications.ts  certificates.ts
│       ├── markdown.ts          # shared sanitization schema
│       ├── slugify.ts           # KMU 2010 transliteration
│       ├── video.ts             # parseVideoUrl, buildEmbedUrl
│       └── __tests__/
├── i18n/
│   └── src/
│       ├── locales.ts  keys.ts  translator.ts  format.ts  zod.ts
│       ├── messages/uk.ts  messages/en.ts
│       └── __tests__/           # parity, translator, plural, format, resolveLocale
└── design-tokens/
    ├── theme.css                # @theme: primitives, semantics, dark, fonts, radii
    └── fonts.css                # @fontsource imports

apps/server/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/                    # index.ts, users.ts, courses.ts, covers.ts, activity.ts
├── prisma.config.ts
├── .env.test
├── src/
│   ├── main.ts                  # start, graceful shutdown
│   ├── app.ts                   # createApp(): middleware, routes, errors
│   ├── config/env.ts            # Zod env schema, fail fast
│   ├── lib/                     # db.ts, logger.ts, mailer.ts, errors.ts, tokens.ts,
│   │                            # passwords.ts, markdown.ts, images.ts, pagination.ts, i18n.ts
│   ├── middlewares/             # auth.ts, requireRole.ts, csrf.ts, locale.ts, rateLimit.ts,
│   │                            # upload.ts, validate.ts, errorHandler.ts, locals.ts
│   ├── modules/
│   │   ├── auth/                # auth.service.ts, auth.api.ts, auth.web.ts
│   │   ├── users/               # users.service.ts, me.api.ts
│   │   ├── catalog/             # catalog.service.ts, catalog.api.ts, catalog.web.ts
│   │   ├── courses/             # courses.service.ts (BR-P*), instructor-courses.api.ts
│   │   ├── curriculum/          # curriculum.service.ts, curriculum.api.ts
│   │   ├── quizzes/             # quizzes.service.ts (BR-Q*), grading.ts, quizzes.api.ts
│   │   ├── learning/            # enrollment.service.ts, progress.service.ts, learning.api.ts
│   │   ├── reviews/             # reviews.service.ts (BR-R*), reviews.api.ts
│   │   ├── certificates/        # certificates.service.ts, certificates.web.ts
│   │   ├── notifications/       # notifications.service.ts, notifications.api.ts
│   │   ├── applications/        # applications.service.ts (BR-U1), applications.web.ts
│   │   ├── stats/               # instructor-stats.service.ts, admin-stats.service.ts
│   │   ├── admin/               # admin.service.ts, audit.service.ts, admin.api.ts, admin.web.ts
│   │   ├── pages/               # static.web.ts, seo.web.ts, theme.web.ts, locale.web.ts, health.api.ts
│   │   └── spa/                 # spa.web.ts (serves /app/*)
│   ├── openapi/                 # registry.ts, document.ts, docs.web.ts
│   ├── views/
│   │   ├── layouts/  partials/  pages/  pages/auth/  pages/static/  pages/errors/
│   │   ├── admin/
│   │   └── emails/                # one template per email, texts via t()
│   └── public/
│       ├── css/app.css          # Tailwind CLI input (imports theme.css) → dist/public/css/app.css
│       └── js/                  # theme.js, locale.js, menu.js, confirm.js, star-input.js
├── uploads/                     # .gitignore
└── tests/
    ├── helpers/                 # testDb.ts, factories.ts, agent.ts (login, csrf, locale)
    ├── unit/                    # grading, progress, slug, readiness, tokens, csrf, markdown
    └── integration/             # auth, account, catalog, learning, quizzes, completion, reviews,
                                 # applications, instructor, curriculum, admin, stats, notifications,
                                 # profile, i18n, openapi, api-conventions, ssr-public, ssr-admin

apps/web/
├── index.html                   # inline theme + lang script
├── vite.config.ts               # base '/app/', proxy everything except /app → :3000
├── src/
│   ├── index.tsx  App.tsx  store.ts  router.tsx
│   ├── shared/
│   │   ├── api/baseApi.ts       # baseQuery: errors, CSRF, Accept-Language, refresh under a mutex
│   │   ├── api/storageApi.ts    # localStorage through queryFn
│   │   ├── components/          # Button, Dialog, Drawer, Toast, Table, VirtualList, MarkdownView, ...
│   │   ├── utils/               # describeError.ts, assertUnreachable.ts
│   │   ├── test/                # MSW server, renderWithStore
│   │   └── config.ts
│   ├── types/                   # global types (if needed)
│   └── features/
│       ├── auth/  navigation/  theme/  locale/  dashboard/  enrollments/  player/  quizzes/
│       ├── notes/  wiki/  videoEmbed/  certificates/  notifications/  profile/  settings/
│       ├── teachCourses/  teachCurriculum/  teachLessons/  teachQuizzes/
│       ├── teachStudents/  teachStats/  reviews/
│       └── <feature>/{<feature>Api.ts, <feature>Slice.ts, utils.ts, components/, __tests__/}
└── e2e/                         # Playwright: enroll, complete-course, publish-course, locale, a11y, responsive

docs/
├── tz.md  architecture-and-guidelines.md  labs-ukr.docx
└── api/learnly.postman_collection.json, learnly.postman_environment.json
```

**Structure Decision**: an npm workspaces monorepo with two apps (`apps/server`, `apps/web`) and
three packages (`packages/contracts`, `packages/i18n`, `packages/design-tokens`). The server is
organized by domain modules (service + api routes + web routes in one folder), the SPA by features
per the guideline. Server tests live in `apps/server/tests`, SPA tests are colocated in feature
`__tests__/`, e2e in `apps/web/e2e`.

## Key technical decisions (summary of research.md)

- Authentication: JWT access 15 min + refresh 30 days with rotation and token families; cookies for
  the browser, Bearer for external clients; double-submit CSRF for cookie requests.
- SSR sessions: refresh cookie with path `/`; the middleware transparently rotates an expired access
  token.
- Development: single entry point `:5173` (Vite proxies everything except `/app` to `:3000`);
  production: `:3000`.
- Guest enrollment: the `intent=enroll` intent is carried through login and registration, and the
  enrollment is created right after successful authentication.
- Theme and locale: `theme` and `locale` cookies are read by the server (SSR without flashing) and by
  the SPA inline script; locale resolution `?lang` → cookie → user → `Accept-Language` → `uk` by one shared `resolveLocale`;
  the cookie holds only explicit choices and is reset to the account locale on login.
- Localization: own typed dictionaries in `packages/i18n` shared by SSR, SPA, emails and API messages;
  English typed against Ukrainian; parity tests; static pages and emails take every text from the
  dictionaries; `MessageKey`-typed server APIs; `Intl` formatting; Zod built-in uk/en error maps.
- Markdown: one unified pipeline and one sanitization schema for SSR and SPA.
- Course completion: a transaction "mark → recalculate → status → certificate → notification"; a
  unique index on `certificates.enrollment_id` guarantees a single issue.
- Quiz grading: a pure function `gradeAttempt(quiz, answers)` in `modules/quizzes/grading.ts`; the
  result snapshot is stored in the attempt.
- Emails are sent after the transaction commits, in the recipient's locale; a sending failure never
  rolls back the action.
- Statistics: aggregate SQL queries and the `course_stats` view; admin charts are server-rendered SVG.

## Implementation order (for tasks.md)

1. Monorepo skeleton, Docker, lint, config, design tokens, i18n package.
2. Prisma schema, migrations, base seed; `createApp`, errors, logging, auth and locale middleware,
   CSRF.
3. US2 (account) → US1 (catalog) → US3 (learning): MVP.
4. US4 (languages): switchers, persistence, emails, static pages and content-language filter.
5. US5 (quizzes) → US6 (certificates) → US7 (reviews).
6. US8 (teaching) → US9 (admin panel).
7. US10 → US11 → US12 → US13 → US14.
8. Polish: responsiveness, accessibility, translation review, e2e, Postman, README, full seed.

## Complexity Tracking

Not needed: no constitution violations.
