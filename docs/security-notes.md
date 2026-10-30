# Learnly security notes

The state of security controls after the T198 pass (2026-10-30), as the starting point for lab 5 (OWASP ZAP
scan, npm audit, header analysis, manual access-control testing). Requirements are in `docs/tz.md` section 10.1.

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

## Dependencies and secrets

- `npm audit --omit=dev` and the full `npm audit`: 0 vulnerabilities. `npm run check:deps` also fails on high or
  critical advisories in production dependencies, and on licences outside the allow list.
- Two tools are deliberately not dependencies, because their trees contain known-vulnerable packages: newman runs
  through `npx newman@6.2.3`, and the load check uses plain `fetch` instead of autocannon.
- Secrets live only in `.env` (git-ignored). The repository has `.env.example` with development values.

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
   local machine. The lab 4 deployment must set it.
4. **Reverse proxy.** `trust proxy` is not set. Behind a proxy every client would share one IP for the rate limits
   and the login lockout. The lab 4 deployment needs `app.set('trust proxy', …)` matching its proxy.
5. **Rate limits are in memory.** That is enough for one server process; several instances would need a shared
   store such as Redis.
6. **Account enumeration at sign-up.** Registering an existing email says the email is taken. That is a
   usability trade-off; login and password recovery do not reveal it.
7. **HSTS without `preload`.** Opt-in once the production domain is final.

## Suggested lab 5 run

- ZAP baseline against a seeded server:
  `docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:3198`
  (start it with `node scripts/e2e-server.mjs`). Then an authenticated scan with a demo account from the README.
- Manual checks:
  - Swap ids of other users' lessons, quiz attempts, notes and courses in API calls and in `/app` URLs.
  - Replay a submit with someone else's option ids.
  - Upload an HTML or SVG file renamed to `.png`.
  - Post Markdown payloads (`<svg onload>`, `data:` links) in lessons and reviews.
  - Submit SSR forms from another origin without `_csrf`.
