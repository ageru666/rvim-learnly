# Contract: SSR routes (public site and admin panel)

Pages are rendered with EJS from the services directly (no HTTP calls to the own API). When the
access cookie has expired and the refresh cookie is valid, the auth middleware transparently
refreshes the session and sets new cookies, so SSR pages never sign the user out after 15 minutes.
Every POST form contains a hidden `_csrf` field. After a successful POST the server redirects (PRG)
with a one-time flash message in the `flash` cookie (stored as an i18n key + params, rendered in the
locale of the next page). Validation errors re-render the same form with messages next to fields and
status 422.

Every page resolves the locale per request (`?lang` → `locale` cookie → user's locale →
`Accept-Language` → `uk`) and renders all texts through `t()`. The URL never contains the locale.
The `locale` cookie is written only on an explicit choice and on login (set to the account locale).

## Public pages

| Method | Path | Template | Data / action |
|---|---|---|---|
| GET | `/` | `pages/home` | `stats/public`, popular, new, categories |
| GET | `/courses` | `pages/catalog` | query as in `GET /api/v1/courses` incl. `language`; `<form method="get">` |
| GET | `/courses/:slug` | `pages/course` | `CourseDetail`, reviews page 1; old slug → 301 |
| POST | `/courses/:slug/enroll` | — | guest → `/login?returnTo=/courses/:slug&intent=enroll&course=:slug`; otherwise enroll and redirect to `/app/learn/:courseId/:firstLessonId` |
| POST | `/courses/:slug/reviews` | — | create/update own review → redirect `#reviews` |
| POST | `/courses/:slug/reviews/delete` | — | delete own review |
| GET | `/courses/:slug/preview/:lessonId` | `pages/preview` | only `isPreview`; otherwise 302 to `/courses/:slug` with flash `site.preview.enrollToOpen` |
| GET | `/instructors/:id` | `pages/instructor` | author profile |
| GET | `/teach` | `pages/teach` | description + application form/status |
| POST | `/teach/apply` | — | create an application |
| GET | `/certificates/:code` | `pages/certificate` | print styles, viewer's locale |
| GET | `/about`, `/faq`, `/terms`, `/privacy`, `/contacts` | `pages/static/*` | one template per page; title and Markdown body from `site.pages.<page>.*` |
| GET/POST | `/login` | `pages/auth/login` | `returnTo` allowed only for relative paths; hidden fields `intent=enroll`, `course=<slug>`: after a successful login the enrollment is created in the same request and the user is redirected to the first lesson (if the course cannot be joined, redirect to `returnTo` with a flash reason) |
| GET/POST | `/register` | `pages/auth/register` | the same `returnTo` / `intent` / `course`; links between login and register keep them; the new user's locale = request locale; after a successful login or registration the `locale` cookie is set to the account locale |
| POST | `/logout` | — | |
| GET/POST | `/forgot-password` | `pages/auth/forgot` | |
| GET/POST | `/reset-password?token=` | `pages/auth/reset` | |
| GET | `/verify-email?token=` | `pages/auth/verify` | performs the verification and shows the result |
| POST | `/verify-email/resend` | — | |
| POST | `/locale` | — | `{ locale: uk\|en, returnTo }` → `locale` cookie (1 year), `users.locale` for signed-in users, redirect back (works without JS) |
| POST | `/theme` | — | `{ theme: light\|dark\|system }` → cookie, redirect back (works without JS; with JS switching is instant) |
| GET | `/sitemap.xml`, `/robots.txt` | — | |
| GET | `/app/*` | — | production: serves `apps/web/dist/index.html`; development: a direct request to `:3000` redirects to the same path on `SPA_DEV_URL` (normally everything is opened through Vite `:5173`, which proxies everything except `/app` to the server); unauthenticated → `/login?returnTo=` |

## Admin panel (`/admin`, admin role)

| Method | Path | Template / action |
|---|---|---|
| GET | `/admin` | `admin/dashboard` |
| GET | `/admin/users` | `admin/users` (search, role, status, page) |
| GET | `/admin/users/:id` | `admin/user` |
| POST | `/admin/users/:id/role`, `/block`, `/unblock` | actions |
| GET | `/admin/courses` | `admin/courses` (status filter) |
| GET | `/admin/courses/moderation` | `admin/moderation` (queue by `submittedAt`) |
| GET | `/admin/courses/:id` | `admin/course` (full view with answers) |
| POST | `/admin/courses/:id/approve`, `/reject`, `/unpublish` | actions |
| GET | `/admin/applications`, `/admin/applications/:id` | `admin/applications`, `admin/application` |
| POST | `/admin/applications/:id/approve`, `/reject` | actions |
| GET/POST | `/admin/categories` | `admin/categories` (list + create form with `nameUk`, `nameEn`) |
| POST | `/admin/categories/:id`, `/admin/categories/:id/delete` | update, delete |
| GET | `/admin/reviews` | `admin/reviews` |
| POST | `/admin/reviews/:id/hide`, `/unhide` | actions |
| GET | `/admin/certificates` | `admin/certificates` |
| POST | `/admin/certificates/:code/revoke` | action |
| GET | `/admin/audit-log` | `admin/audit` |

## Shared layout elements

- `<html lang="{locale}" data-theme="{theme cookie | system}">`.
- Header (`partials/header`): navigation, search (GET `/courses?search=`), theme switcher, language
  switcher (`partials/locale-switcher`: a POST form per language with `aria-current` on the active
  one), user menu, unread notification counter, unverified email banner.
- Footer (`partials/footer`): links to static pages, language switcher.
- `<title>` = `<page> · Learnly`, `meta description`, Open Graph on the course page, all in the
  active locale.
- Errors: `pages/errors/404`, `pages/errors/500`, `pages/errors/403`.
- Emails: one template per email in `views/emails/*.ejs`, rendered with `t` bound to the recipient's
  `users.locale`.
