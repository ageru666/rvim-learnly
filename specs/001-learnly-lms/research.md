# Research: Learnly

Phase 0 of the plan. Every Technical Context item is resolved; no open `NEEDS CLARIFICATION`.
Versions checked with `npm view` on 2026-10-24.

## R1. Node.js version

- **Decision**: Node.js 24 LTS (`engines.node: ">=24"`, `.nvmrc` = `24`); development on 24.22.1
  installed through nvm-windows. npm 11 is used (npm 10.8 has an arborist bug on this tree); install
  scripts are allowed explicitly through `allowScripts` (argon2, prisma, esbuild, ...), telemetry
  scripts are denied.
- **Rationale**: Node 20 left LTS in April 2026, and current versions of the chosen stack require
  Node 22+ (vitest 5, file-type 22, concurrently 10, jsdom 30, a Prisma internal package) or 24+
  (license-checker-rseidelsohn 5). Staying on Node 20 would mean outdated tooling and no security
  updates.
- **Alternatives considered**: staying on Node 20 with older tool versions (rejected by the user
  on 2026-10-24); Prisma 8 RC (unstable).

## R2. ORM and migrations

- **Decision**: Prisma 7.10.1 with the `@prisma/adapter-pg` driver adapter, `prisma.config.ts`,
  generated client in `apps/server/src/generated/prisma`. The `citext` and `pg_trgm` extensions and
  GIN indexes are created in the SQL of the first migration.
- **Rationale**: declarative schema, type-safe client, migrations and seeds out of the box;
  transactions (`$transaction`) are needed for BR-C1 and saving a whole quiz.
- **Alternatives considered**: Drizzle 0.45 (closer to SQL, but migrations and seeds would be
  hand-rolled), Knex (no model types), Prisma 8 RC (unstable).

## R3. TypeScript and linting

- **Decision**: TypeScript `~6.0`, ESLint 10 flat config + typescript-eslint 8.72,
  `eslint-plugin-boundaries` for the SPA, Prettier, knip 6.
- **Rationale**: typescript-eslint supports `typescript >=4.8.4 <6.1.0`; TypeScript 7 (native
  compiler) is not yet supported by the linter, and linting is mandatory per the guideline.
- **Alternatives considered**: TypeScript 7 + oxlint (no boundaries rules and incomplete typed
  rules).

## R4. HTTP server and SSR

- **Decision**: Express 5.3, EJS 7 for templates with a shared layout and partials. Small vanilla
  scripts in `src/public/js` for theme, locale switching, mobile menu, user dropdown, confirmation
  dialogs. The FAQ accordion uses `<details>`.
- **Rationale**: Express 5 handles async errors natively; EJS is simple and escapes output by
  default; SSR pages work without JS (catalog requirement FR-008).
- **Alternatives considered**: Fastify (smaller middleware ecosystem for SSR), Nunjucks/Pug (no real
  difference), React SSR (complicates and duplicates the SPA).

## R5. Validation and contracts

- **Decision**: Zod 4.6 in `packages/contracts`: request and response schemas, enums, business-rule
  constants (limits, passing score, token lifetimes). OpenAPI 3.1 is generated from these schemas
  with `@asteasolutions/zod-to-openapi` 9; Swagger UI through `swagger-ui-express`. Custom
  validation messages in schemas are i18n message keys (see R25), never literal text.
- **Rationale**: one schema validates the server, the SPA forms (react-hook-form +
  `@hookform/resolvers`) and the documentation (constitution, principle I).
- **Alternatives considered**: hand-written OpenAPI YAML (drifts from code), tRPC (not REST, unfit
  for lab 3).

## R6. Authentication and sessions

- **Decision**: argon2id (`argon2` 0.45) for passwords; `jose` 6 for HS256 JWTs; access 15 minutes,
  refresh 30 days with rotation and reuse detection (presenting an already revoked token revokes
  the whole family). Cookies `access_token` and `refresh_token`, both with path `/`, httpOnly,
  SameSite=Lax. Path `/` on the refresh cookie lets SSR pages refresh the session: when the access
  token has expired and the refresh token is valid, the auth middleware transparently rotates the
  session and sets new cookies. The SPA refreshes through `POST /auth/refresh` in `baseQuery`. The
  Bearer header for external clients takes precedence over cookies. One-time tokens (password
  reset, email verification) are 32 random bytes stored as SHA-256.
- **Rationale**: a standard scheme that works for SSR (cookies) and for Postman (Bearer).
- **Alternatives considered**: express-session with a Postgres store (harder for API clients),
  Passport (unnecessary without OAuth).

## R7. CSRF

- **Decision**: double-submit cookie. The server sets a non-httpOnly `csrf_token` cookie; SSR forms
  contain a hidden field, and the SPA sends an `X-CSRF-Token` header (added by `baseQuery`). The
  check applies to every state-changing method except requests whose user was resolved from a
  Bearer header (`req.authVia === 'bearer'`). A request with both Bearer and cookies (Swagger UI) is
  treated as a Bearer request. Anonymous SSR forms (login, registration, locale switch) also require
  the token. Implemented as an own middleware (~40 lines).
- **Rationale**: SameSite=Lax already blocks most attacks; the token covers the remaining cases and
  gives material for lab 5.
- **Alternatives considered**: the `csrf-csrf` library (an extra dependency for simple logic).

## R8. Email

- **Decision**: nodemailer 10 + Mailpit (`axllent/mailpit`) in Docker: SMTP `:1025`, web UI
  `:8025`. One EJS template per email under `views/emails/`, every text through `t` bound to the recipient's
  `users.locale` (no per-locale templates). Emails are sent after the transaction commits; a sending failure is
  logged and never breaks the main action.
- **Rationale**: fully local, no external accounts (constitution, principle II); Mailpit has an API
  that e2e tests use to read emails.
- **Alternatives considered**: logging emails to the console (cannot be demonstrated), Ethereal
  (needs network and an account).

## R9. PostgreSQL in development

- **Decision**: `postgres:18-alpine` in Docker on host port **5433**. Databases `learnly` and
  `learnly_test`. The `db:reset` script = `prisma migrate reset --force` + seed.
- **Rationale**: port 5432 is taken by a locally installed PostgreSQL 18; the container gives a
  reproducible environment.
- **Alternatives considered**: using the local PostgreSQL (needs the user's credentials and manual
  database creation).

## R10. Image upload and processing

- **Decision**: multer (memory storage, limits 1 MB avatar / 2 MB cover), file signature check
  (`file-type`), sharp 0.35: avatar 256×256 WebP, cover 1280×720 WebP (cover crop). Files in
  `apps/server/uploads/{avatars,covers}/<uuid>.webp`, served at `/uploads`.
- **Rationale**: simple local storage, one output format, protection against extension spoofing.
- **Alternatives considered**: S3/MinIO (extra infrastructure for an educational product).

## R11. Markdown

- **Decision**: one unified/remark/rehype pipeline. Server: `remark-parse` → `remark-gfm` →
  `remark-rehype` → `rehype-sanitize` → `rehype-highlight` → `rehype-stringify`. SPA:
  `react-markdown` with the same plugins. The sanitization schema is shared in
  `packages/contracts`.
- **Rationale**: identical output on SSR and in the SPA, sanitization by one schema (principles I,
  IV).
- **Alternatives considered**: markdown-it on the server and react-markdown in the SPA (two
  renderers, risk of divergence).

## R12. Styles and tokens

- **Decision**: Tailwind CSS 4.3. `packages/design-tokens/theme.css` with `@theme` (primitives and
  semantic tokens declared once with CSS `light-dark()`; `data-theme` on `<html>` sets `color-scheme` to light, dark or `light dark` for the system theme). The SPA uses
  `@tailwindcss/vite`; SSR uses `@tailwindcss/cli` scanning `views/**/*.ejs` and `src/public/js`.
  Fonts Inter Variable, Roboto Condensed Variable (Barlow Condensed was rejected: no Cyrillic) and JetBrains Mono from the `@fontsource*` packages (local
  files instead of Google Fonts requests, simpler CSP); all include Cyrillic and Latin subsets.
- **Rationale**: one token source for every part (principle VI); no external font requests.
- **Alternatives considered**: CSS Modules as in the reference (the guideline requires Tailwind),
  Radix Themes (own tokens, harder to reproduce on SSR).
- No theme flashing: the server reads the `theme` cookie and sets `data-theme` on `<html>` in the
  SSR response; the SPA `index.html` contains a small inline script that reads the same cookie or
  localStorage before the bundle loads.

## R13. SPA: state, routing, components

- **Decision**: React 19.3, Vite 8.3 (`base: '/app/'`), React Router 8 (data router,
  `basename: '/app'`, `React.lazy` per route), Redux Toolkit 2.13 + RTK Query (`baseApi` +
  `injectEndpoints` per feature), Radix Primitives, react-hook-form, lucide-react, Recharts 3,
  dnd-kit (core + sortable), toast on `@radix-ui/react-toast`, `@tanstack/react-virtual` 3.14 for
  long lists.
- **Rationale**: matches the guideline and the TZ.
- Long SPA lists (course students, notifications, instructor reviews): RTK Query `infiniteQuery`
  (RTK ≥ 2.6) over the page-based API + virtualization with `VirtualList`/`VirtualTable` in
  `shared/components`. Guideline §4.2 forbids hand-rolled pagination as a substitute for
  virtualization. Server pagination in the API and on SSR pages stays (the guideline covers the
  SPA).
- `baseQuery` wrapper: normalizes errors into `ApiError` (a discriminated union by `code` with a
  `retryable` field: transient for network failures, timeouts, 5xx and `RATE_LIMITED`, terminal for
  other 4xx; `ErrorState` offers "Try again" only for transient ones), adds `X-CSRF-Token` and
  `Accept-Language`, on 401 performs one `POST /auth/refresh` under a mutex (`async-mutex`) and
  retries; on failure dispatches `sessionExpired`.
- localStorage: a dedicated `storageApi` with `queryFn` for reads and mutations; keys and Zod value
  schemas belong to the owning feature; a corrupted value is removed and `null` is returned.
- External APIs (Wikipedia, noembed): separate `createApi` instances in the `wiki` and `videoEmbed`
  features with their own `fetchBaseQuery`, 5-second timeout.

## R14. Notification polling

- **Decision**: `useGetUnreadCountQuery(undefined, { pollingInterval: 60000, refetchOnFocus: true })`;
  on SSR the counter is rendered by the server on every page request.
- **Rationale**: satisfies FR-NOTIFY-3 without WebSockets (out of scope).

## R15. Charts

- **Decision**: SPA: Recharts 3 (bar charts, horizontal funnel). SSR admin dashboard: SVG charts
  built by the server in an EJS partial from an array of points.
- **Rationale**: the admin panel is server-rendered and should not ship a client charting library.

## R16. Slug transliteration

- **Decision**: an own pure `slugify` function in `packages/contracts` using the official Ukrainian
  transliteration (KMU 2010) + normalization (lowercase, `-`, cut to 80). English titles pass
  through unchanged apart from normalization. Uniqueness is ensured by `-2`, `-3` suffixes on the
  server.
- **Rationale**: transliteration packages usually target Russian; the function is small and is
  tested to 100 %.

## R17. Rate limiting and brute-force protection

- **Decision**: `express-rate-limit` with in-memory storage; limits come from configuration
  (`RATE_LIMIT_GLOBAL_PER_MIN=300`, `RATE_LIMIT_AUTH_PER_MIN=10` by default). In `.env.test` the
  limits are raised so integration tests, e2e and newman never hit them; the limiter itself is
  covered by a dedicated test on an app with a low limit. Brute-force protection: a
  `login_attempts` table (email, ip, time), the auth service checks "5 failures within 15 minutes".
- **Rationale**: an educational product with one process; brute-force state lives in the database
  to survive restarts and to be testable with integration tests.

## R18. Testing

- **Decision**: Vitest 5 in every package. Server: Supertest against `createApp()` on the
  `learnly_test` database (migrations once before the run, `TRUNCATE ... CASCADE` before every file,
  data factories). SPA: Testing Library + MSW 2 + jsdom. E2E: Playwright 1.64 (Chromium), the server
  in production build mode, emails read through the Mailpit API.
- **Rationale**: principle V; a real database instead of mocks to verify business rules and
  permissions.

## R19. Server logging and errors

- **Decision**: pino + pino-http (request id in the `X-Request-Id` response header), `pino-pretty`
  in development. `AppError(code, status, messageKey, { params, details, rule, unmet,
  retryAfterSec })`; the single error middleware translates `messageKey` with the request locale and
  returns JSON for `/api` or an HTML error page for SSR.

## R20. Item ordering

- **Decision**: integer `position` on modules, lessons, questions and options.
  `PUT /instructor/courses/:id/structure` receives the full tree `[{ moduleId, lessonIds[] }]`; the
  server checks that the id set equals the current one and rewrites positions in one transaction.
- **Rationale**: simpler than fractional positions or deferrable unique constraints; the volumes are
  small.

## R21. Monorepo structure

- **Decision**: npm workspaces (`apps/*`, `packages/*`), root scripts `dev`, `build`, `check`,
  `check:full`, `check:deps`, `test`, `db:*`, `e2e`, `test:postman`; `concurrently` for parallel
  `dev`. `packages/contracts` and `packages/i18n` are built with `tsc` to ESM and consumed through
  `exports` (one entry per file, no barrel).
- **Rationale**: npm 10 is already installed and enough for two apps and three packages.
- **Alternatives considered**: pnpm/Turborepo (extra installation), separate repositories
  (contradicts principle I).

## R22. Single entry point in development

- **Decision**: in development everything opens on `http://localhost:5173`. Vite serves the SPA under
  `/app/` with HMR and proxies every other path (`^/(?!app(/|$))`: site, admin, `/api`, `/uploads`,
  `/static`) to the server on `:3000`, keeping `Host`. `APP_URL` in development is `:5173`, so links
  in emails and SSR redirects to `/app/...` work. Opening `:3000/app/*` directly redirects to
  `SPA_DEV_URL`. In production everything runs on `:3000`.
- **Rationale**: SSR redirects to `/app/...` and the SPA links to `/`, `/courses`; without a single
  entry point these transitions break in development.
- **Alternatives considered**: proxying `/app` from the server to Vite (needs WebSocket proxying for
  HMR), developing only against the production build (no HMR).

## R23. License and dependency checks

- **Decision**: `check:deps` as part of `npm run check`: `license-checker-rseidelsohn` 5
  `--production --onlyAllow` (MIT, ISC, Apache-2.0, BSD-2/3-Clause, 0BSD, BlueOak-1.0.0, CC0-1.0,
  CC-BY-4.0, Unlicense, Python-2.0, OFL-1.1 for fonts) and `npm audit --omit=dev --audit-level=high`.
- **Rationale**: guideline §5.4 requires license and dependency checks in the standard pipeline.

## R24. Exhaustive switch

- **Decision**: the `@typescript-eslint/switch-exhaustiveness-check: error` rule + an
  `assertUnreachable` function in `shared/utils`.
- **Rationale**: guideline §5.1 requires `default: assertUnreachable(value)`; the lint rule makes it
  enforceable.

## R25. Localization (uk + en)

- **Decision**: an own small package `packages/i18n` instead of i18next:
  - `src/locales.ts`: imports `LOCALES`/`Locale` from `packages/contracts` (single source), adds
    `DEFAULT_LOCALE = 'uk'`, `resolveLocale()` (pure,
    implements the FR-I18N-2 order from explicit inputs) and `negotiateAcceptLanguage()`;
  - `src/messages/uk.ts` and `src/messages/en.ts`, one object per locale with top-level namespaces
    (`common`, `site`, `admin`, `app`, `notifications`, `emails`, `errors`, `validation`, `enums`,
    `readiness`); the Ukrainian dictionary is the source of the `Messages` type, and the English one
    is declared `satisfies Messages`, so a missing key fails type-checking (full contract:
    `contracts/i18n.md`);
  - `src/translator.ts`: `createTranslator(locale, messages)` returning `t(key, params)` with typed
    dotted keys, `{name}` interpolation and ICU-lite plurals `{count, plural, one {...} few {...}
    many {...} other {...}}` resolved with `Intl.PluralRules`; a missing key falls back to `uk` and
    reports through an injected `onMissing` callback;
  - `src/format.ts`: `formatDate`, `formatNumber`, `formatPercent`, `formatDuration` over `Intl`
    with the locale passed in;
  - `src/zod.ts`: `localizeIssues(issues, t)` translating issues whose message is an i18n key
    (`validation.*`) and leaving the rest; generic issues use Zod 4's built-in `z.locales.uk()` /
    `z.locales.en()` error maps (both exist in zod 4.6.7).
- Server: `middlewares/locale.ts` resolves the locale per request (`?lang` → cookie `locale` →
  `req.user.locale` → `Accept-Language` → `uk`), sets `req.locale`, `res.locals.t`, `<html lang>`,
  `Content-Language`; `?lang` also sets the cookie; the cookie is otherwise written only by `POST /locale` and, on
  every successful login, set to the account locale (so another device opens in the account language). `POST /locale` stores the cookie and, for a
  signed-in user, `users.locale`. Validation parses requests with the locale's Zod error map and
  `localizeIssues`. Emails and CSV headers use the recipient's or requester's locale. Static pages have one template each and take their title and Markdown body from
  `site.pages.<page>.*`, so they are covered by the parity test. `AppError`, the mailer, flash messages
  and CSV headers accept only `MessageKey` values.
- SPA: `features/locale/localeSlice.ts` (client state `locale`, selector `selectLocale`, initial value
  from `resolveLocale({ cookie, user: Me.locale, acceptLanguage: navigator.languages })`), a listener
  that persists the choice to `storageApi` (`locale` key) and the `locale` cookie, calls
  `PATCH /me { locale }` for signed-in users, sets `document.documentElement.lang` and switches the
  global Zod error map; `useT()` hook reads the locale from the store and the dictionary from a
  lazily imported module (the inactive locale is a separate chunk); `LocaleSwitcher` in the header
  and settings. `baseQuery` adds `Accept-Language`, and RTK Query tags `Locale` so that
  locale-dependent server data (category names, localized `message`s) refetch after switching.
- Notifications store `type` + `payload`; texts are rendered from dictionaries at display time.
- Category names are stored per language (`name_uk`, `name_en`); course content is not translated,
  a course has `language` (`uk` | `en`).
- Tests: a parity test (same key sets and same `{placeholders}` in both locales), translator and
  plural tests (uk one/few/many/other), a lint rule (`no-restricted-syntax` on JSX text literals
  with letters, plus an EJS check script that fails on Cyrillic or Latin words outside `t(...)` in
  templates).
- **Rationale**: two locales and a typed key space do not justify i18next + react-i18next (two
  runtimes, untyped keys by default, separate server and client setups). One package shared by
  SSR, SPA and emails keeps one source of truth (principle I) and makes gaps a type error
  (principle VIII).
- **Alternatives considered**: i18next / react-i18next (heavier, needs extra typing setup and a
  separate server integration), FormatJS / react-intl (ICU-complete but React-only; the server would
  need another solution), locale prefixes in URLs (`/en/...`) for SEO (out of scope, TZ 15).
