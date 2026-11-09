# Learnly

A bilingual (Ukrainian and English) learning platform built for labs 1–3 of the course:

- a server-rendered public site and admin panel;
- a React dashboard for students and instructors;
- the REST API between them.

Courses are made of modules and lessons (text, video, quizzes). Students track their progress, get certificates
anyone can verify, and leave reviews. Instructors are approved by an administrator, and every course passes
moderation before it is published.

The full specification is [`docs/tz.md`](docs/tz.md); the spec-kit artifacts are in
[`specs/001-learnly-lms/`](specs/001-learnly-lms/) ([spec](specs/001-learnly-lms/spec.md),
[plan](specs/001-learnly-lms/plan.md), [tasks](specs/001-learnly-lms/tasks.md),
[quickstart](specs/001-learnly-lms/quickstart.md)).

## Stack

| Part | Technologies |
|---|---|
| Server | Node.js 24, Express 5, TypeScript, Prisma 7 + PostgreSQL 18, EJS, Zod, argon2, jose (JWT), helmet, pino, nodemailer |
| Dashboard (`/app`) | React 19, Vite, TypeScript, Tailwind CSS 4, Radix UI, Redux Toolkit + RTK Query, react-hook-form, dnd-kit, Recharts |
| Shared packages | `contracts` (Zod schemas and business-rule constants), `i18n` (dictionaries, ICU plurals), `design-tokens` (one theme for SSR and SPA) |
| Tooling | npm workspaces, ESLint, Prettier, Vitest, Testing Library, MSW, Playwright + axe, Postman/Newman, knip |
| Local services | Docker Compose: PostgreSQL on 5433, Mailpit (SMTP 1025, web 8025) |

## Getting started

Prerequisites:

- Node.js 24 (see `.nvmrc`) and npm 11 or newer.
- Docker Desktop.
- Free ports 3000, 5173, 5433, 1025 and 8025.

```bash
cp .env.example .env        # local defaults, no secrets to fill in
npm install
docker compose up -d        # PostgreSQL and Mailpit
npm run db:reset            # migrations and demo data
npm run dev                 # server on :3000 and Vite on :5173
```

Open http://localhost:5173. In development Vite is the single entry point. It serves the dashboard under `/app`
and proxies everything else (site, admin panel, API, uploads) to the server, so cookies work as in production.

For production mode, run `npm run build && npm start`; everything is then on http://localhost:3000.

| What | Address |
|---|---|
| Site | http://localhost:5173 (`?lang=en` for English) |
| Dashboard | http://localhost:5173/app |
| Admin panel | http://localhost:5173/admin |
| Swagger UI | http://localhost:5173/api/docs (OpenAPI document: `/api/openapi.json`) |
| Mail (Mailpit) | http://localhost:8025 |

### Demo accounts

Every account has the password `Learnly2026!`.

| Email | Role | Language |
|---|---|---|
| `admin@learnly.local` | administrator | Ukrainian |
| `olena.teacher@learnly.local` | instructor | Ukrainian |
| `taras.teacher@learnly.local` | instructor | Ukrainian |
| `iryna.teacher@learnly.local` | instructor | English |
| `student1@learnly.local` | student | Ukrainian |
| `student2@learnly.local`, `student3@learnly.local` | student | English |
| `student15@learnly.local` | student, email not verified | Ukrainian |

The account language decides the language of emails and of the interface after logging in on a new device.
Students 4–14 exist so that statistics and reviews have data.

## Repository structure

```
apps/
  server/                 Express app: REST API (/api/v1), SSR site and admin panel, serves the built SPA
    prisma/               schema, migrations, seed
    src/modules/<domain>/ <domain>.service.ts, <domain>.api.ts (REST), <domain>.web.ts (SSR)
    src/views/            EJS layouts, partials, pages, admin, emails
    tests/                unit and integration tests (Vitest + Supertest on a test database)
  web/                    React SPA, structured by features (docs/architecture-and-guidelines.md)
    e2e/                  Playwright scenarios against a seeded server
packages/
  contracts/              Zod DTOs, enums, limits, error format, Markdown sanitizing schema
  i18n/                   uk/en dictionaries, translator, formatting, Zod error maps, GLOSSARY.md
  design-tokens/          Tailwind theme and component classes, fonts
scripts/                  e2e and Postman servers, load check, bundle budget, template string check
docs/                     tz.md, architecture guideline, security notes, Postman collection
specs/001-learnly-lms/    specification, plan, data model, contracts, tasks
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Server (tsx watch) and Vite with HMR |
| `npm run build` / `npm start` | Production build of every workspace / start the server with the built SPA |
| `npm run db:migrate`, `db:seed`, `db:reset` | Prisma migrations, demo data, both from scratch |
| `npm run check` | Lint, typecheck, all unit and integration tests with coverage, the EJS string check, licences and `npm audit` |
| `npm run e2e` | SPA build, bundle budget, Playwright scenarios in Ukrainian and English (seeded database `learnly_e2e`) |
| `npm run test:postman` | The Postman collection through Newman against a seeded server |
| `npm run perf` | p95 of the catalog, a course page and the catalog API on a seeded production-mode server |
| `npm run check:bundle` | Initial SPA JavaScript ≤ 250 KB gzip, English dictionary loaded on demand |
| `npm run check:full` | `check`, knip, `e2e`, `test:postman` and `perf` |
| `npm run prod:build`, `prod:up`, `prod:down` | The production Docker image on localhost:8080 with its own database ([deployment](docs/deployment.md)) |
| `npm run db:setup` | Migrations, plus demo data while the database is empty, for the database in `DATABASE_URL` |
| `npm run perf -- --url <address>` | Latency of a deployed server, under its rate limit |
| `npm run security:probe -- --url <address>` | The manual security checks of lab 5 against a seeded, disposable deployment |

The e2e, Postman and perf runs each seed their own database (`<database>_e2e`, `_postman`, `_perf`), so they do not
touch the development data. They need `docker compose up -d`.

## How the labs map to the product

Each lab's acceptance checklist is in [`docs/tz.md`](docs/tz.md), section 13.

**Lab 1 (backend), `apps/server`.**

- Express with PostgreSQL through Prisma; migrations and seed in one command.
- Server-rendered pages from the database:
  - home, catalog with filters and pagination, course, author;
  - certificate verification;
  - static pages: about, FAQ, terms, privacy, contacts.
- Registration with email verification, login, logout and password recovery. All email goes to Mailpit.
- User actions saved on the server through SSR forms: enrollment, reviews, instructor applications.
- The admin panel (`/admin`):
  - users, roles and blocking;
  - course moderation, instructor applications, reviews;
  - categories, certificates, the audit log.
- Role and ownership checks on every route. Both languages on every page.

**Lab 2 (frontend), `apps/web`.** A React SPA following
[`docs/architecture-and-guidelines.md`](docs/architecture-and-guidelines.md).

- For students:
  - dashboard, my courses;
  - lesson player and quizzes with server grading;
  - notes, certificates, notifications, profile and settings.
- For instructors:
  - course editor and curriculum with drag and drop (also by keyboard);
  - lesson, quiz and Markdown editors;
  - students with CSV export, statistics charts, replies to reviews.
- Our own API through RTK Query. Public APIs: Wikipedia REST (term lookup) and noembed (video details).
- Local storage: theme, language, notes, unfinished quizzes, editor drafts, a lookup cache and UI state.
- Responsive from 360 px, light and dark themes, accessibility checked with axe, instant language switching.

**Lab 3 (web API), `/api/v1`.**

- Read and write endpoints with JWT in a cookie or a Bearer header, refresh token rotation, and role and ownership checks.
- One localized error format, Zod validation, pagination and rate limits.
- OpenAPI 3.1 generated from the Zod schemas, with Swagger UI at `/api/docs`.
- A Postman collection with a demo scenario: [`docs/api/`](docs/api/).
- The dashboard is the client: it works only through this API.
- Integration tests in `apps/server/tests/integration`.

**Labs 4 and 5.**

- Lab 4: [`docs/deployment.md`](docs/deployment.md) deploys the production image on localhost (Docker Compose) and
  on Render with a Supabase database. `npm run perf -- --url …` measures each deployment.
- Lab 5: [`docs/security-notes.md`](docs/security-notes.md) records the security controls, the results of Gitleaks,
  npm audit, Trivy, Semgrep, OWASP ZAP and the manual checks, the fixes they led to, and the accepted risks.

## Adding a translation key

1. Add the key and the Ukrainian text to [`packages/i18n/src/messages/uk.ts`](packages/i18n/src/messages/uk.ts).
   This is the source dictionary, and its shape is the `Messages` type.
2. Add the English text at the same path in [`en.ts`](packages/i18n/src/messages/en.ts). A missing key is a type
   error.
3. For a count, write an ICU plural in both languages: Ukrainian needs `one`, `few`, `many` and `other`, English
   `one` and `other`. For example: `'{count, plural, one {# урок} few {# уроки} many {# уроків} other {# уроку}}'`.
4. Use the key:
   - in EJS: `t('site.catalog.title')`;
   - in the SPA: `const { t } = useT()`;
   - on the server: `req.i18n.t(...)`, or `translate` for typed parameters.
   Keys are typed, so a misspelled key fails `npm run typecheck`.
5. Follow the terms in [`packages/i18n/GLOSSARY.md`](packages/i18n/GLOSSARY.md).

`npm run check` then verifies:

- that both dictionaries have the same keys, placeholders and plural categories;
- the glossary's machine-checkable rules;
- that no EJS template contains text outside `t()`.

## API tools

- **Swagger UI** at `/api/docs`. Log in with `POST /api/v1/auth/login` (a demo account), then authorize with the
  returned `accessToken`.
- **Postman**: import [`docs/api/learnly.postman_collection.json`](docs/api/learnly.postman_collection.json) and
  the environment file next to it, then run the "Demo flow" folder. The collection is generated from the OpenAPI
  document by `node scripts/build-postman.mjs`.
