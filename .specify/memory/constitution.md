<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0 (MINOR) → 1.1.1 (PATCH: Node.js constraint raised to 24 LTS)
- Modified principles:
  - VI. "Unified design and accessibility": the Ukrainian-only UI rule was replaced by a reference
    to the new principle VIII
- Added principles: VIII. Bilingual interface (Ukrainian + English)
- Added rules: "Development process and quality" now requires all project documentation in English
- Other: the whole constitution was translated to English (no semantic change in I–V, VII)
- Templates: plan/spec/tasks templates read the constitution at runtime, no changes required
- Deferred TODOs: none
-->

# Learnly Constitution

## Core Principles

### I. One product, one business logic

Learnly is a single product that covers labs 1–3. The public site and the admin panel (SSR), the
SPA dashboard and the REST API run on one server, one database and one authentication system.

- Every business rule (BR-* in `docs/tz.md`) MUST have exactly one owner: the service of the
  corresponding server module. SSR routes and REST routes MUST call that service and MUST NOT
  re-implement the rule.
- Every user-facing function MUST live in exactly one part of the product (site, admin panel or
  dashboard) as defined in section 1.4 of the TZ.
- Business-rule constants and Zod DTO schemas MUST live in `packages/contracts` and be used by
  both the server and the SPA.

Rationale: the product must feel like one coherent system, not three labs glued together.

### II. Fully autonomous implementation

Everything described in the TZ MUST be implementable and runnable locally without external
accounts, API keys or manual configuration of third-party services.

- Development infrastructure (PostgreSQL, Mailpit) MUST start with one `docker compose up`.
- External APIs MUST be public and keyless (Wikipedia REST, noembed).
- Seeds MUST create demo data and accounts for every role.
- Features that require external accounts (OAuth, cloud hosting) MUST NOT be in scope.

Rationale: the whole project is built and verified by an agent without human involvement.

### III. Frontend strictly follows the guideline

SPA code MUST comply with `docs/architecture-and-guidelines.md`. Key rules:

- Feature-first structure `src/features/<domain>/`; the public surface is defined by file
  location, no `index.ts` barrels.
- All I/O (HTTP, external APIs, localStorage) MUST go through RTK Query `createApi` / `queryFn`
  or `listenerMiddleware`; components MUST NOT call `fetch` and MUST NOT load data in `useEffect`.
- Client-only state lives only in `createSlice`; selectors are colocated with the slice.
- Errors are normalized in one `baseQuery`; user-facing text comes from one `describeError`.
- `any` is banned, `strict: true`, `default: assertUnreachable(value)` in every `switch` over a
  union.

Rationale: the guideline is a mandatory requirement for frontend code.

### IV. Secure by default

- Passwords and tokens (refresh, password reset, email verification) MUST be stored only as
  hashes (argon2id for passwords).
- Every REST endpoint and SSR route MUST check role and object ownership on the server.
- Correct quiz answers MUST NOT reach a student before the attempt is submitted; grading happens
  only on the server.
- All input MUST be validated with Zod schemas; Markdown MUST be sanitized when rendered;
  state-changing requests authenticated by cookie MUST pass a CSRF check.
- Secrets MUST be read from env through a configuration module that fails fast; only
  `.env.example` is committed.

Rationale: lab 5 audits security, and an LMS stores credentials and quiz results.

### V. Tests for business rules and contracts

- Every BR-* business rule MUST be covered by a server unit or integration test.
- Key API endpoints (auth, enrollment, learning, quizzes, moderation, access control) MUST have
  integration tests against a separate test database.
- Pure SPA `utils` MUST have 100 % coverage; RTK Query endpoints are tested through MSW.
- End-to-end flows (registration and enrollment, completing a course to the certificate, course
  creation and moderation) MUST have Playwright e2e tests.
- `npm run check` (lint, typecheck, tests, knip, dependency checks) MUST pass before a task is
  done.

Rationale: the product is large, and automated tests are the only way to prove it works without
manual checking.

### VI. Unified design and accessibility

- Design tokens MUST be defined once in `packages/design-tokens/theme.css` and used by both SSR
  and the SPA.
- The palette comes from the reference (monochrome base + accents); CodeHarbor branding, logos,
  fonts and copy MUST NOT be used.
- The UI MUST be responsive (mobile-first, 360–1440 px), support light and dark themes and meet
  WCAG AA contrast; state MUST NOT be conveyed by colour alone.
- Interface language rules are defined in principle VIII.

Rationale: the product must look like a coherent, polished LMS on any device.

### VII. Simplicity

- The solution MUST be the simplest one that satisfies the TZ (KISS, YAGNI).
- New layers, factories, generalizations and dependencies MUST NOT be added without a concrete
  need from the TZ.
- Features from TZ section 15 ("Out of scope") MUST NOT be implemented.
- Denormalization and caching are added only after a measured problem.

Rationale: the scope is already large; every bit of complexity must be justified by a requirement.

### VIII. Bilingual interface

- The UI MUST be available in Ukrainian (default) and English: public site, admin panel, SPA,
  emails, API error messages and validation messages.
- All UI strings MUST live in the shared dictionaries of `packages/i18n`; the English dictionary
  MUST be typed against the Ukrainian one so that a missing key is a type error, and a parity test
  MUST fail on any missing or extra key.
- Hard-coded user-facing strings in components, templates or services MUST NOT exist.
- Dates, numbers and plural forms MUST be formatted with `Intl` for the active locale.
- User-generated content (courses, reviews) is not translated; a course declares its own content
  language.

Rationale: the product targets both Ukrainian and English-speaking learners, and translation
gaps must be caught by tooling, not by users.

## Technology constraints

- npm workspaces monorepo: `apps/server`, `apps/web`, `packages/contracts`, `packages/i18n`,
  `packages/design-tokens`.
- Backend: Node.js 24 LTS, TypeScript strict, Express 5, EJS, PostgreSQL 18, Prisma 7, Zod 4,
  JWT (access 15 min + refresh 30 days with rotation), nodemailer + Mailpit, OpenAPI 3.1 generated
  from Zod, Swagger UI, pino, Vitest + Supertest.
- Frontend: React 19, Vite, TypeScript strict, Redux Toolkit + RTK Query, React Router,
  Tailwind CSS v4, Radix UI Primitives, react-hook-form, Recharts, dnd-kit, Vitest + Testing
  Library + MSW, Playwright.
- REST API under `/api/v1`, a single error format, pagination `{ items, page, limit, total }`.
- In the production build the server serves the SPA at `/app/*`; everything runs on one origin.

## Development process and quality

- The source of requirements is `docs/tz.md`; when a spec-kit artifact and the TZ disagree, both
  documents are corrected.
- All project documentation (TZ, constitution, spec, plan, research, data model, contracts,
  quickstart, tasks, README) MUST be written in English.
- Work follows the tasks in `tasks.md`; each task ends with a green `npm run check` for the
  affected packages.
- Database migrations are created with Prisma and never edited after being applied; schema
  changes only through new migrations.
- The README MUST describe how to start the project with a single sequence of commands and list
  the demo accounts.
- Commits are small, one per task or logical group of tasks.

## Governance

- This constitution takes precedence over other practices; the frontend guideline is an integral
  part of it for SPA code.
- Amendments go through `/speckit-constitution` with a version bump: MAJOR when a principle is
  removed or redefined, MINOR when a principle or section is added, PATCH for wording
  clarifications.
- `/speckit-plan` MUST check the plan against the principles (Constitution Check); any deviation
  MUST be recorded in Complexity Tracking with a justification.
- `/speckit-analyze` is used before implementation to check consistency of spec, plan and tasks.

**Version**: 1.1.1 | **Ratified**: 2026-10-24 | **Last Amended**: 2026-10-24
