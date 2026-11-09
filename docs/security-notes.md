# Learnly security notes

The security controls of Learnly and the results of the lab 5 check (2026-11-09, section "Lab 5 results" below).
Requirements are in `docs/tz.md` section 10.1.

How the observations were made: a seeded server (`node scripts/e2e-server.mjs`, port 3198) probed with `curl`
and a headless Chromium; the automated tests named below run in `npm run check`.

## HTTP headers

Every response (SSR pages, `/api/*`, `/app`, `/static`, `/uploads`, errors) carries the same set from helmet,
asserted in `apps/server/tests/integration/foundation.test.ts`:

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://upload.wikimedia.org https://i.ytimg.com https://i.vimeocdn.com; connect-src 'self' https://uk.wikipedia.org https://en.wikipedia.org https://noembed.com; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; font-src 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` (added in this pass) |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `SAMEORIGIN` (`frame-ancestors 'none'` is the effective rule) |
| Referrer-Policy | `no-referrer` |
| Cross-Origin-Opener-Policy / Resource-Policy | `same-origin` |
| Strict-Transport-Security | only with `COOKIE_SECURE=true`, that is over HTTPS (changed in this pass: it used to be sent over plain HTTP too) |
| X-Powered-By | not sent |
| Cache-Control | `private, no-cache` on pages and API responses: they set the CSRF cookie and carry user data, so shared caches must not keep them (added in lab 5). Static files: `public, max-age`. |

- `/app` (the SPA) adds the SHA-256 hash of its one inline script (theme and language before the first paint)
  to `script-src` instead of allowing inline scripts.
- Swagger UI at `/api/docs` works under the same policy: all 97 operations render with no CSP errors in the console.
- With `COOKIE_SECURE=true` the policy also gets `upgrade-insecure-requests`.

## Cookies

| Cookie | Flags | Why |
|---|---|---|
| `access_token` (JWT, 15 min) | HttpOnly, SameSite=Lax, Path=/, session | Never readable by scripts. |
| `refresh_token` (30 days) | HttpOnly, SameSite=Lax, Path=/ | Path `/` because SSR pages renew the session too. |
| `csrf_token` | SameSite=Lax, readable | Double-submit CSRF: the SPA copies it into `X-CSRF-Token`. |
| `locale`, `theme` | SameSite=Lax, readable, 1 year | Preferences the inline script and the SPA read. |
| `flash` | HttpOnly, SameSite=Lax | One-time SSR messages. |

All of them get `Secure` when `COOKIE_SECURE=true`. Locally `.env.example` has `false`, because the site runs over
plain HTTP.

## Authentication and sessions

- Passwords: argon2id (`src/lib/passwords.ts`).
- Access tokens: HS256 JWT, 15 minutes, signed with `JWT_SECRET`; the config refuses a secret shorter than 32 characters.
- Refresh tokens: random, stored only as SHA-256 hashes, rotated on every use. Reusing a revoked token after a
  short grace period revokes the whole token family (`session.service.ts`). A blocked user loses every session.
- Password change ends the sessions on other devices. "Log out everywhere" revokes all of them.
- Brute force: 5 failed logins per email and IP in 15 minutes lock further attempts (FR-AUTH-2). On top of that,
  per-IP rate limits: 300 requests a minute in general and 10 a minute on auth endpoints.
- One-time tokens (verification, password reset) are stored as hashes, expire after 24 h and 1 h, and work once.
- Messages: login says "incorrect email or password"; password recovery answers the same whether the account
  exists or not.

## CSRF

State-changing requests authenticated by cookies need the double-submit token: the `X-CSRF-Token` header from the
SPA, or the `_csrf` field in SSR forms. The comparison is constant-time. Bearer requests and non-browser clients
(no `Origin`/`Sec-Fetch-Site`) carry no ambient credentials and are exempt. `Origin` alone is not trusted.

Verified live: a cross-site form POST and a same-origin JSON PATCH without the token both get 403. Covered by
`foundation.test.ts` ("rejects a cookie request without the token…", "exempts Bearer requests").

## Authorization (for the manual IDOR tests of lab 5)

Every endpoint and SSR route checks the role, plus ownership of the object. Automated evidence:

| Scenario | Test |
|---|---|
| Correct answers and explanations never reach a student before submitting | `quizzes.test.ts` "never sends correct answers or explanations before submitting" |
| Answers to another quiz's questions or options are refused | `quizzes.test.ts` "rejects answers to foreign questions or options (BR-Q4)" |
| Lesson content only for enrolled users; others get preview lessons only | `learning.test.ts` (BR-E3) |
| Quiz attempts only for enrolled users | `quizzes.test.ts` "refuses users who are not enrolled" |
| Only the author edits a course; students cannot create one | `instructor-courses.test.ts` |
| Admin pages and API for administrators only | `admin.test.ts`, `ssr-admin.test.ts`, `api-conventions.test.ts` (401/403) |

## Input, output and files

- Every body, query and form goes through a Zod schema. JSON bodies are limited to 1 MB.
- A NUL character in any query or body string is refused with a validation error before a handler runs
  (`rejectNulInput`), and in route parameters by `parse()`: PostgreSQL text cannot hold it (lab 5).
- A malformed multipart body or a file in an unexpected field is answered as invalid input (lab 5).
- Uploads (covers up to 2 MB, avatars up to 1 MB): the type is checked from the file signature (`file-type`), not
  the name or MIME header. The image is re-encoded by sharp to WebP and stored under a random name.
  `/uploads` is served with `nosniff`.
- Markdown is sanitized with rehype-sanitize and one shared schema in the SPA and for SSR. `server/tests/unit/markdown.test.ts`
  checks that `<script>`, `onerror`, `javascript:` links and `<iframe>` are stripped. EJS escapes output by default
  (`<%=`); unescaped `<%-` is used only for partials, the layout body, the built-in icon SVG paths
  and HTML from `renderMarkdown` (course and lesson texts, author bio, static pages, quiz questions in the admin
  view).
- SQL: Prisma queries, and tagged `$queryRaw` templates (parameterized). The catalog sort is a whitelist of
  `Prisma.sql` fragments, never user text.
- Redirects: `returnTo` accepts only same-site paths. `//host` and backslashes fall back to `/`.

## Dependencies, image and secrets

- `npm audit --omit=dev`: 0 vulnerabilities. `npm run check:deps` also fails on high or critical advisories in
  production dependencies, and on licences outside the allow list.
- The full `npm audit` reports 28 moderate advisories, all in one dev-only chain: license-checker-rseidelsohn pulls
  old glob and minimatch. The fixed versions were less than two weeks old on 2026-11-09 (and glob 14 is a new major),
  so they are not forced through `overrides` yet.
- Two tools are deliberately not dependencies, because their trees contain known-vulnerable packages: newman runs
  through `npx newman@6.2.3`, and the load check uses plain `fetch` instead of autocannon.
- The runtime image is `gcr.io/distroless/nodejs24-debian13`: Node.js and its libraries, no shell, package manager
  or npm. The app files are read-only for the process (user `nonroot`); only `apps/server/uploads` is writable.
- Secrets live only in `.env` (git-ignored) and in the Render dashboard. The repository has `.env.example` with
  development values.

## Lab 5 results (2026-11-09)

The run against a local deployment of the production image (scan containers with raised rate limits on the same
database) and a passive baseline against https://rvim-learnly.onrender.com.

| Tool | Result |
|---|---|
| Gitleaks 8.30.1, whole git history (80 commits) | no secrets |
| npm audit | production 0; with dev tooling 28 moderate (see above) |
| Trivy 0.76.2, the image | node:24-bookworm-slim: 1 critical, 40 high, 107 medium, 86 low, none in the app's code; distroless: 0 critical, 0 high, 34 medium, 12 low (libc6, libstdc++) |
| Trivy, Dockerfile | no misconfigurations |
| Semgrep 1.183.0 (OWASP Top 10, Node.js, Express, TS, JS, secrets, Dockerfile), 520 files | no findings; a canary file confirms the rules fire |
| OWASP ZAP 2.17.0: baseline, full scan, API scan from the OpenAPI document with a Bearer token | no FAIL; findings below |
| `npm run security:probe` (the manual checks as a script) | 44 of 44 pass |

Fixed, each with a test (`foundation.test.ts`, `profile.test.ts`):

1. **Vulnerable base image** (Trivy): the runtime stage moved to distroless.
2. **Cacheable personal responses** (ZAP 10049): pages and API responses had no `Cache-Control`, although they set
   the CSRF cookie and carry user data. Now `private, no-cache`.
3. **A NUL character gave 500** (ZAP API and full scan, server log): a string with `\0` passed Zod, and PostgreSQL
   rejected it (22021) in `/api/v1/me`, `/api/v1/me/enrollments` and the site catalog search. Now it is refused as
   invalid input (`rejectNulInput` for the query and body, `parse()` for route parameters).
4. **A malformed multipart body gave 500** (ZAP API scan): busboy and multer errors other than the size limit. Now 400.
5. **A regression of fix 3** (ZAP rescan): the guard ran before the template locals, so an SSR request it refused
   could not render its error page. It runs after them now, and the test checks the rendered page.

ZAP warnings reviewed and kept:

- SQL Injection on the login password: every payload got the same 401, and the password is only compared by argon2.
  The difference ZAP saw was the lockout (401 against 429).
- Cookie No HttpOnly: `csrf_token` (double-submit, the SPA reads it), `locale` and `theme` (read before first paint).
- Cookie Poisoning on `/locale` and `/theme`: the values are enums.
- Anti-CSRF Tokens Check: the header search form, which is a GET.
- User Controllable HTML Element Attribute: filter values echoed, escaped, into form fields.
- Re-examine Cache-control Directives: `private, no-cache` is deliberate (ETag revalidation, no shared caching).
- CSP `style-src 'unsafe-inline'` and the missing Cross-Origin-Embedder-Policy: open items 1 and 8 below.

## Open items and accepted risks

1. **`style-src 'unsafe-inline'`.** Radix UI and dnd-kit position elements with inline `style` attributes.
   Scripts stay strict, so the remaining risk is CSS injection, which sanitized Markdown already blocks.
   Accepted for now.
2. **Images by URL in lessons (decision needed).** The Markdown toolbar inserts an image by URL (tz.md, lesson
   editor), and the sanitizer keeps it. But `img-src` allows only Wikimedia, YouTube and Vimeo hosts, so an image
   from any other site is blocked by the browser. The two documents disagree. Either allow `https:` images in
   `img-src` (simple; the third party then sees the reader's IP, softened by `Referrer-Policy: no-referrer`), or
   keep the list and say in the editor which hosts work. A proxy for images is a third, heavier option.
3. **`COOKIE_SECURE=true` is a deployment requirement.** It adds `Secure` to every cookie, HSTS and
   `upgrade-insecure-requests`. It is not enforced at start-up, so `npm start` keeps working over plain HTTP on a
   local machine. `render.yaml` sets it.
4. **Reverse proxy.** `TRUST_PROXY` (default 0) must match the hosting proxy, or every client shares one IP for the
   rate limits and the login lockout. `render.yaml` sets 1.
5. **Rate limits are in memory.** That is enough for one server process; several instances would need a shared
   store such as Redis.
6. **Account enumeration at sign-up.** Registering an existing email says the email is taken. That is a
   usability trade-off; login and password recovery do not reveal it.
7. **HSTS without `preload`.** Opt-in once the production domain is final.
8. **No Cross-Origin-Embedder-Policy.** `require-corp` would block the YouTube and Vimeo players in lessons.
9. **The image carries the dashboard's dependencies**, since `npm prune` keeps every workspace's packages. They are
   never loaded at run time and Trivy finds nothing in them, but a smaller image would leave them out.

## Repeating the check

- Manual checks: `npm run security:probe -- --url <seeded deployment> --limits-url <one with the normal limits>`.
  It creates an account per run and edits the author bio for a moment, so use a local or disposable database.
- ZAP: `zap-baseline.py -t <url>` anywhere; `zap-full-scan.py -t <url>` and
  `zap-api-scan.py -t <url>/api/openapi.json -f openapi` (with `ZAP_AUTH_HEADER_VALUE=Bearer …`) only against a
  local deployment, from `ghcr.io/zaproxy/zaproxy:stable`. Watch the server log during the scan: a 500 there is an
  input the app does not handle.
- Trivy: `trivy image learnly:local`. Semgrep: `semgrep scan --config p/owasp-top-ten --config p/nodejs …`.
