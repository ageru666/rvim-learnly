# Technical Specification: Learnly, a mini-LMS

Version 2.0, 2026-10-24
Working product name: **Learnly** (may change).

---

## 1. Overview

### 1.1 Purpose

Learnly is an online course platform. Instructors build courses from modules, lessons and quizzes; students enroll, go through lessons, take quizzes, track their progress and receive a certificate of completion. The administrator manages users and moderates courses and reviews.

### 1.2 Goals

1. Deliver labs 1–3 of the course as one coherent product.
2. Build a product that looks and behaves like a real small LMS: one design, one authentication system, connected flows from registration to certificate.
3. Prepare the ground for lab 4 (deployment and performance) and lab 5 (security).
4. The whole scope is implemented and runs locally without external accounts, keys or manual third-party setup: one command starts Postgres and Mailpit in Docker, and the external APIs (Wikipedia, noembed) are public and keyless.
5. The interface is bilingual: Ukrainian (default) and English.

### 1.3 Mapping to the labs

| Lab | Product part |
|---|---|
| Lab 1, backend | Node.js server: PostgreSQL, server-side rendering of the public site and the admin panel (EJS), static pages, registration and login (email and password, email verification), user actions persisted in the database, administrator role |
| Lab 2, frontend | React SPA "Dashboard" (`/app`): learning, quizzes, course editor, work with the own REST API and with public external APIs, local data storage |
| Lab 3, web API | REST API `/api/v1`: read and action endpoints, JWT authentication and roles, OpenAPI documentation (Swagger UI), Postman collection, the client is the SPA from lab 2 |

### 1.4 Separation of product parts

Every feature lives in exactly one place so the parts never duplicate each other:

- **Public site (SSR)**: everything a guest sees and everything that matters for search indexing: home, catalog, course page, instructor page, static pages, login and registration, certificate verification.
- **Admin panel (SSR)**: a classic server-rendered management panel.
- **Dashboard (SPA)**: everything interactive: taking a course, quizzes, notes, course editor, instructor analytics, profile and settings.
- **REST API**: one business-logic layer. SSR pages call the same services directly (in-process); the SPA and external clients use HTTP.

### 1.5 Interface languages

The product UI is available in **Ukrainian (default) and English**. Every part is localized: public site, admin panel, SPA, emails, API error and validation messages. All strings live in shared typed dictionaries (`packages/i18n`); a missing translation is a type error and fails a parity test. User-generated content (course texts, reviews) is not translated; every course declares its content language. Details: section 5.14.

---

## 2. Glossary

- **Course**: a learning product made of ordered modules.
- **Module**: a section of a course made of ordered lessons.
- **Lesson**: a unit of content of one type: `text` (Markdown), `video` (YouTube/Vimeo link + Markdown description), `quiz`.
- **Quiz**: a set of questions with answer options, attached to a lesson of type `quiz`.
- **Attempt**: one submission of answers to a quiz.
- **Enrollment**: the link between a student and a course; stores completion status.
- **Progress**: the share of completed lessons in a course.
- **Certificate**: a document confirming course completion with a unique verification code.
- **Moderation**: an administrator's review of a course before publication.
- **Preview lesson**: a lesson available to guests without enrollment.
- **Locale**: the active interface language, `uk` or `en`.

---

## 3. Roles and permissions

### 3.1 Roles

- **Guest**: not authenticated.
- **Student** (`student`): default role after registration.
- **Instructor** (`instructor`): granted after an administrator approves an application. Keeps all student capabilities (can learn on other courses).
- **Administrator** (`admin`): full access. Created by the seed or appointed by another administrator.

### 3.2 Permission matrix

| Action | Guest | Student | Instructor | Admin |
|---|---|---|---|---|
| View home, catalog, course page, static pages | yes | yes | yes | yes |
| View preview lessons | yes | yes | yes | yes |
| Switch interface language | yes | yes | yes | yes |
| Register, log in | yes | no | no | no |
| Enroll in a published course | no | yes | yes (not own) | yes |
| Take lessons and quizzes of an enrolled course | no | yes | yes | yes |
| Review a course | no | yes* | yes* | yes* |
| Apply for the instructor role | no | yes | no | no |
| Create and edit own courses | no | no | yes | yes |
| Submit a course for moderation | no | no | yes | yes |
| View students and statistics of own course | no | no | yes | yes |
| Moderate courses, applications, reviews | no | no | no | yes |
| Manage users, roles, categories | no | no | no | yes |
| View the administrators' audit log | no | no | no | yes |

\* only when rule BR-R1 is satisfied (section 6).

---

## 4. Architecture and stack

### 4.1 Overview

```
Browser
  ├── Public site and admin panel (server HTML, EJS)
  └── SPA "Dashboard" /app (React)
            │  HTTP + JSON, cookie / Bearer JWT, Accept-Language
            ▼
Node.js server (Express)
  ├── web routes (SSR)  ─┐
  ├── api routes (REST) ─┼──► services (business logic) ──► Prisma ──► PostgreSQL
  └── static, /uploads  ┘
            │
            └──► SMTP (Mailpit in development)

SPA directly ──► Wikipedia REST API, noembed.com (public external APIs)
Shared packages: contracts (Zod), i18n (dictionaries uk/en), design-tokens (theme.css)
```

### 4.2 Backend

- Node.js 24 LTS (`>=24`), TypeScript (`strict: true`).
- Express 5.
- PostgreSQL 18, Prisma ORM (schema, migrations, seeds).
- Input validation: Zod. Request and response schemas live in the shared `packages/contracts` and are used by both the server and the SPA. Validation messages are localized per request.
- SSR templates: EJS (layouts, partials), every string through the `t()` translator.
- Authentication: argon2 password hashing, JWT (access + refresh).
- File uploads: multer, local `uploads/` folder.
- Email: nodemailer, Mailpit (Docker) in development; emails rendered in the recipient's locale.
- API documentation: OpenAPI 3.1 generated from Zod schemas (`@asteasolutions/zod-to-openapi`), Swagger UI at `/api/docs`.
- Security: helmet, express-rate-limit, CSRF protection (section 10.1), Markdown sanitization on render.
- Logging: pino (JSON logs, request id).
- Tests: Vitest + Supertest, separate test database.

### 4.3 Frontend (SPA)

Code strictly follows `docs/architecture-and-guidelines.md`.

- React 19, TypeScript strict, Vite.
- Redux Toolkit + RTK Query (all server and external I/O, including localStorage, only through `createApi`/`queryFn`), `createSlice` for client state (including the active locale).
- React Router.
- Tailwind CSS v4 (tokens in one place), Radix UI Primitives (Dialog, DropdownMenu, Tabs, Accordion, Tooltip, Toast, Select, Checkbox, RadioGroup, Progress, AlertDialog).
- Forms: react-hook-form + Zod (schemas from `packages/contracts`, messages from `packages/i18n`).
- Localization: dictionaries and translator from `packages/i18n`, `useT()` hook, `Intl` formatting; the inactive locale's dictionary is loaded lazily.
- Markdown: react-markdown + rehype-sanitize + code highlighting (rehype-highlight).
- Drag and drop in the curriculum editor: dnd-kit.
- Charts: Recharts.
- Icons: lucide-react.
- Long lists: `@tanstack/react-virtual` + RTK Query `infiniteQuery` (hand-rolled pagination in the SPA is forbidden by the guideline).
- Tests: Vitest + Testing Library + MSW; e2e: Playwright (key flows).
- Lint and quality: ESLint (`@typescript-eslint/no-explicit-any`, `switch-exhaustiveness-check`, `eslint-plugin-boundaries`), knip, dependency license check and `npm audit`.

### 4.4 Repository structure

```
learnly/
  docker-compose.yml          # postgres, mailpit
  package.json                # npm workspaces
  .env.example
  packages/
    contracts/                # Zod DTO schemas, enums, business-rule constants
    i18n/                     # uk/en dictionaries, translator, plural rules, Zod error maps
    design-tokens/            # theme.css: Tailwind v4 tokens for SSR and SPA
  apps/
    server/
      prisma/                 # schema.prisma, migrations/, seed/
      src/
        config/               # env reading and validation (fail fast)
        lib/                  # db, logger, mailer, errors, auth helpers
        middlewares/          # auth, roles, csrf, locale, errors, rate limit, upload
        modules/
          <domain>/           # auth, users, catalog, courses, curriculum, learning,
                              # quizzes, reviews, certificates, notifications,
                              # applications, stats, admin, pages, spa
            <domain>.service.ts
            <domain>.api.ts   # REST routes
            <domain>.web.ts   # SSR routes (if any)
        openapi/
        views/                # EJS: layouts/, partials/, pages/, admin/, emails/
        public/               # small JS scripts for SSR
      tests/
    web/                      # SPA, src/ structured per the guideline (features/, shared/, ...)
  docs/
    labs-ukr.docx
    architecture-and-guidelines.md
    tz.md
    api/learnly.postman_collection.json
```

### 4.5 Run modes

- **Development**: `docker compose up` (Postgres on `:5433`, Mailpit), server on `:3000`, Vite on `:5173`. Single entry point `http://localhost:5173`: Vite serves the SPA under `/app` and proxies every other path (site, admin, `/api`, `/uploads`) to the server, so cookies and navigation between the site and the dashboard work as in production.
- **Production build**: the server serves the built SPA at `/app/*` (fallback to `index.html`), everything on one origin.

---

## 5. Functional requirements

Requirement identifiers: `FR-<module>-<number>`. UI labels below are given in English; every label exists in both dictionaries.

### 5.1 Authentication and account (AUTH)

- **FR-AUTH-1. Email registration.** Fields: name (2–60 characters), email (unique, case-insensitive), password (at least 8 characters, at least one letter and one digit), password confirmation, terms acceptance. After registration the user is signed in with role `student`; the current locale is saved as the user's locale. A welcome email is sent.
- **FR-AUTH-2. Login with email and password.** Wrong credentials produce one generic message ("Invalid email or password") without saying which part is wrong. Limit: 5 failed attempts within 15 minutes per IP and email.
- **FR-AUTH-3. Email verification.** After registration an email with a verification link is sent (single-use token, valid 24 hours). Until the email is verified, the header and the dashboard show a "Verify your email" banner with a "Send again" button (at most once every 60 seconds). Restrictions for unverified users: BR-U4.
- **FR-AUTH-4. Email change** in settings: requires the current password; the new address becomes primary only after following the link sent to the new address.
- **FR-AUTH-5. Logout** from the current session and **logout from all devices** (revokes all refresh tokens).
- **FR-AUTH-6. Password recovery.** The user enters an email and receives a link (single-use token, valid 1 hour). The response never reveals whether the email exists.
- **FR-AUTH-7. Password change** in settings (requires the current password). All other sessions are revoked afterwards.
- **FR-AUTH-8. A blocked user** cannot log in; their active sessions are revoked at the moment of blocking.
- **FR-AUTH-9. Sessions.** The access JWT lives 15 minutes, the refresh token 30 days with rotation on every refresh. Refresh tokens are stored in the database as hashes. In the browser both tokens are httpOnly cookies with path `/`; when the access token has expired, the server transparently refreshes the session from the refresh cookie on SSR requests. External clients send the access token in `Authorization: Bearer` and the refresh token in the body of `/auth/refresh`.

### 5.2 Profile (PROFILE)

- **FR-PROFILE-1.** Edit name, a short "About me" text (up to 500 characters), links (website, GitHub, LinkedIn) and preferred interface language.
- **FR-PROFILE-2.** Avatar upload (JPG/PNG/WebP, up to 1 MB, the server crops it to a 256×256 square). Avatar removal (falls back to initials).
- **FR-PROFILE-3.** An instructor has a public author page: avatar, name, "About me", links, list of published courses, total students and average rating.

### 5.3 Public site (SITE, SSR)

- **FR-SITE-1. Home**: hero block with a call to action, counters from the database (published courses, students, instructors), popular courses (top 6 by enrollments), new courses (6 most recently published), categories with course counts, a "How it works" block (3 steps), a "Become an instructor" block, footer.
- **FR-SITE-2. Course catalog** `/courses`:
  - search by title and short description;
  - filters: category, level (beginner, intermediate, advanced), content language (uk, en), minimum rating, tag;
  - sorting: popular, newest, by rating, by title;
  - pagination by 12 courses;
  - filters are query parameters (a plain GET form), so the catalog works without JavaScript and results can be shared by link;
  - course card: cover, category (coloured tag), title, author, level, content language, lesson count, total duration, rating and review count, student count.
- **FR-SITE-3. Course page** `/courses/:slug`:
  - cover, title, short description, category, level, content language, author (link to the author page), last update date;
  - "What you will learn" block (list set by the instructor);
  - "Requirements" block (list);
  - full description (Markdown);
  - curriculum: modules and lessons with type and duration, preview lessons have a "Preview" link;
  - rating: average, distribution by stars (1–5), paginated review list;
  - sidebar: "Enroll" button (a guest is sent to login or registration, after which the enrollment is created automatically and the first lesson opens), "Continue learning" and current progress for an enrolled user, "Edit course" for the author;
  - review form for eligible users (BR-R1) and editing of the user's own review.
- **FR-SITE-4. Preview lesson page** `/courses/:slug/preview/:lessonId` for guests and non-enrolled users. A non-preview lesson redirects to the course page with a message offering to log in and enroll.
- **FR-SITE-5. Author page** `/instructors/:id` (FR-PROFILE-3).
- **FR-SITE-6. Static pages**: "About" `/about`, "FAQ" `/faq` (accordion), "Terms of use" `/terms`, "Privacy policy" `/privacy`, "Contacts" `/contacts`. Page texts (Markdown) live in the shared dictionaries for both languages, not in the database.
- **FR-SITE-7. "Become an instructor"** `/teach`: benefits and an application form (for a signed-in student): motivation (50–2000 characters), experience or portfolio links. The status of an existing application is shown.
- **FR-SITE-8. Certificate verification** `/certificates/:code`: student name, course title, author, issue date, a "Certificate is valid" mark. An unknown code leads to a "Certificate not found" page. The page has print styles.
- **FR-SITE-9. Login, registration, password recovery and reset pages** with server-side validation and errors shown next to fields.
- **FR-SITE-10. Shared header**: logo, catalog link, search, theme switcher, language switcher (UA / EN), "Log in" and "Sign up" buttons for a guest; for a signed-in user a user menu (Dashboard, My courses, Teaching (instructors), Admin panel (admins), Log out) and a notifications icon with the unread count.
- **FR-SITE-11. Error pages** 403, 404 and 500 in the shared design.
- **FR-SITE-12. SEO basics**: unique `<title>` and `meta description` in the active locale, Open Graph for the course page, `sitemap.xml` (home, catalog, published courses, author pages), `robots.txt` (disallows `/app` and `/admin`), `<html lang>` matching the locale.

### 5.4 Catalog and categories (CATALOG)

- **FR-CATALOG-1.** A category has a name in both languages (`name_uk`, `name_en`), a slug, an accent colour (from the palette, section 9) and a sort order. Managed by the administrator.
- **FR-CATALOG-2.** A course can have up to 5 tags (free input, normalized to lowercase). Tags on cards and the course page link to the catalog filtered by that tag.

### 5.5 Learning (LEARN, SPA)

- **FR-LEARN-1. Enrollment** from the course page (SSR form) or from the SPA. Enrolling twice is impossible. A student can leave a course: the enrollment and progress are deleted after confirmation in a dialog. A course with an issued certificate cannot be left.
- **FR-LEARN-2. Dashboard** `/app`: greeting, "Continue learning" (last opened course and lesson), active courses with progress bars, earned certificates, recent notifications, recommendations (up to 4 popular courses from the categories the student learns in, not yet enrolled).
- **FR-LEARN-3. My courses** `/app/courses`: "Active" and "Completed" tabs, sorting by last activity, search by title.
- **FR-LEARN-4. Course player** `/app/learn/:courseId/:lessonId`:
  - curriculum on the left (collapsible modules), every lesson with a type icon and a completion mark, the current lesson highlighted;
  - lesson content in the centre: Markdown with code highlighting; for a video lesson an embedded YouTube/Vimeo player and a description;
  - "Previous" and "Next lesson" buttons, a "Mark as completed" button (and un-marking);
  - course title, overall progress in percent and an exit to the dashboard at the top;
  - on mobile the curriculum opens in a drawer (Radix Dialog styled as a drawer);
  - opening a lesson makes the server remember it as the last opened (`last_lesson_id` on the enrollment).
- **FR-LEARN-5. Automatic course completion** by rule BR-C1: a congratulations screen with a link to the certificate and an invitation to leave a review.
- **FR-LEARN-6. Lesson notes**: a side panel with a text field, autosaved to localStorage (section 5.12), a list of all notes of the course, export of the course notes to a `.md` file.
- **FR-LEARN-7. Wikipedia lookup**: the student selects a word or phrase in the lesson text, a "What is this?" button appears, and a popover shows the summary of the Wikipedia article (title, text, thumbnail, link). The Wikipedia language follows the interface locale first and falls back to the other one (uk UI: uk → en; en UI: en → uk). The last 20 lookups are cached locally.
- **FR-LEARN-8. Author preview mode**: the instructor opens their own course in the player without enrolling (a "Preview mode" banner); progress is not saved.

### 5.6 Quizzes (QUIZ)

- **FR-QUIZ-1. Question types**: single correct answer (radio) and multiple correct answers (checkbox). A question has a text (Markdown), 2–8 options, points (1–10, default 1) and an optional explanation shown after grading.
- **FR-QUIZ-2. Quiz settings**: passing score in percent (default 70), attempt limit (unlimited or 1–10), shuffling of questions and options (yes/no), when correct answers are revealed (always / only after passing or after attempts run out).
- **FR-QUIZ-3. Taking a quiz**: a start screen (number of questions, passing score, attempts left, best result), then questions one by one with navigation and an "answered / not answered" indicator, then a confirmation screen if some questions are unanswered.
- **FR-QUIZ-4. An unfinished attempt** (selected answers and the current question index) is saved to localStorage and restored after a page reload.
- **FR-QUIZ-5. Grading happens only on the server** (BR-Q1). The client never receives correct answers before submitting.
- **FR-QUIZ-6. Result**: percent, points, "Passed / Not passed" status, per-question review (correct/incorrect, explanation, correct answers per FR-QUIZ-2), "Try again" if attempts remain.
- **FR-QUIZ-7. Attempt history** per quiz: date, result, status.

### 5.7 Reviews (REVIEW)

- **FR-REVIEW-1.** Rating of 1–5 stars and a text (10–2000 characters). One review per user per course; it can be edited and deleted.
- **FR-REVIEW-2.** Course rating: average of visible reviews (rounded to 0.1) and review count.
- **FR-REVIEW-3.** The course author can reply to a review once (up to 1000 characters); the reply can be edited.
- **FR-REVIEW-4.** An administrator can hide a review with a reason; a hidden review is excluded from the rating, and its author sees a "Hidden by a moderator" mark.

### 5.8 Certificates (CERT)

- **FR-CERT-1.** A certificate is issued automatically on course completion (BR-C1). Code: 10 characters, letters and digits without look-alike characters (0/O, 1/I/L), unique.
- **FR-CERT-2.** The dashboard has a certificate list `/app/certificates`. Buttons: "View" (opens the public page FR-SITE-8), "Copy link", "Print / save as PDF" (browser printing).
- **FR-CERT-3.** The certificate page is rendered in the viewer's locale; the stored student name and course title are shown as issued.

### 5.9 Notifications (NOTIFY)

- **FR-NOTIFY-1.** In-app notifications stored in the database as a type plus payload. Events:
  - to a student: course completed and certificate issued; the author replied to their review; their review was hidden by a moderator;
  - to a user: instructor application approved or rejected (with a comment);
  - to an instructor: course approved, rejected (with a reason) or unpublished; new review on a course;
  - to administrators: new course awaiting moderation; new instructor application.
- **FR-NOTIFY-2.** Notification list `/app/notifications` with infinite scrolling, "read" marking one by one and for all, unread counter in the header (SSR and SPA). Every notification links to the related object. Notification texts are rendered at display time in the viewer's locale.
- **FR-NOTIFY-3.** The SPA counter refreshes by polling every 60 seconds and on tab focus (RTK Query `pollingInterval`, `refetchOnFocus`).
- **FR-NOTIFY-4.** Email notifications only for: registration and email verification, password reset, instructor application decision, course moderation decision. Emails are sent in the recipient's locale.

### 5.10 Teaching (TEACH, SPA)

- **FR-TEACH-1. Instructor dashboard** `/app/teach`: summary (courses by status, total students, average rating, enrollments in the last 30 days), list of own courses with a status filter, a "Create course" button.
- **FR-TEACH-2. Course creation**: a one-step wizard (title, category, level, content language) creates a draft and opens the editor.
- **FR-TEACH-3. Course editor** `/app/teach/courses/:id`, tabs:
  - **Basics**: title, slug (generated from the title by transliteration, editable), short description (up to 200 characters), full description (Markdown with preview), category, level, content language, tags, "What you will learn" and "Requirements" (dynamic lists up to 10 items), cover (JPG/PNG/WebP, up to 2 MB, 16:9);
  - **Curriculum**: modules and lessons as a tree, add, rename, delete (with confirmation), drag and drop to reorder lessons within a module and between modules, module order, "preview" flag;
  - **Publishing**: current status, readiness checklist (BR-P1) with completed items marked, "Submit for review", reason of the last rejection, "Archive".
- **FR-TEACH-4. Lesson editor** `/app/teach/lessons/:id`:
  - common fields: title, type, duration in minutes, preview flag;
  - text lesson: Markdown editor with "Edit / Preview" tabs, a quick-insert toolbar (heading, bold, list, code, link, image by URL);
  - video lesson: YouTube/Vimeo URL field, preview (title and thumbnail via noembed, section 5.11), Markdown description;
  - quiz: quiz settings (FR-QUIZ-2), a question list with add, delete, duplicate and reorder, answer options with correct marks, points, explanation;
  - draft autosave to localStorage every 5 seconds after changes; when opening a lesson whose local draft is newer than the server version, the editor offers "Restore draft" or "Discard";
  - a warning when leaving the page with unsaved changes.
- **FR-TEACH-5. Course students** `/app/teach/courses/:id/students`: a table (name, enrollment date, progress, last activity, best quiz results, status) with infinite scrolling, search, sorting, CSV export (column headers in the requester's locale).
- **FR-TEACH-6. Course statistics** `/app/teach/courses/:id/stats`:
  - enrollments per week (bar chart, last 12 weeks);
  - completion funnel: share of students who completed each lesson (horizontal bars in curriculum order);
  - quizzes: average result and first-attempt pass rate for each quiz;
  - review rating distribution;
  - number cards: total students, completed, average progress, rating.
- **FR-TEACH-7.** Replying to reviews from the dashboard (FR-REVIEW-3), list of reviews on own courses.

### 5.11 Public external APIs (EXT, for lab 2)

- **FR-EXT-1. Wikipedia REST API**: `GET https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}` with language order per FR-LEARN-7. Requests go from the browser (CORS allowed) through a dedicated `createApi` in the `wiki` feature.
- **FR-EXT-2. noembed**: `GET https://noembed.com/embed?url={videoUrl}`: video title, author and thumbnail. Used in the video lesson editor (preview and link check) and in the player curriculum (video thumbnail).
- **FR-EXT-3.** Errors and timeouts of external APIs never break the interface: a clear message is shown ("Could not load the summary") and the rest of the page keeps working.

### 5.12 Local storage (LOCAL, for lab 2)

All localStorage access goes through RTK Query `queryFn` or `listenerMiddleware` per the guideline; keys are prefixed with `learnly:` and a schema version; reads are protected against corrupted data and unavailable storage.

| Data | Key | Cleared |
|---|---|---|
| Theme (light / dark / system) | `learnly:v1:theme` | never (also a cookie for SSR to avoid flashing) |
| Interface locale (uk / en) | `learnly:v1:locale` | never (also a `locale` cookie for SSR) |
| Lesson notes | `learnly:v1:notes:<courseId>` | manually by the user |
| Unfinished quiz attempt | `learnly:v1:quiz:<quizId>` | after submitting the attempt |
| Lesson draft in the editor | `learnly:v1:draft:lesson:<lessonId>` | after a successful save or "Discard" |
| Course basics draft | `learnly:v1:draft:course:<courseId>` | after a successful save |
| Wikipedia lookup cache (last 20) | `learnly:v1:wiki-cache` | oldest entries evicted |
| Last signed-in user | `learnly:v1:last-user` | never (when another user signs in, personal keys are cleared) |
| UI state (collapsed modules, notes panel width) | `learnly:v1:ui` | never |

On logout every key except theme, locale and UI state is removed.

### 5.13 Admin panel (ADMIN, SSR)

Available at `/admin` to the `admin` role only. Every state-changing action is a POST form with a CSRF token and is written to the audit log (FR-ADMIN-8).

- **FR-ADMIN-1. Dashboard**: cards (users, new in 7 days, published courses, courses awaiting review, instructor applications, enrollments in 7 days), a chart of registrations and enrollments per day for 30 days (server-rendered SVG), top 5 courses by enrollments, latest audit entries.
- **FR-ADMIN-2. Users**: a table with search by name and email, role and status filters, pagination. User card: profile data, whether the email is verified, preferred locale, enrollments, authored courses, reviews. Actions: change role, block / unblock (with a reason). An administrator cannot block or demote themselves.
- **FR-ADMIN-3. Course moderation**: a queue of courses in `pending_review` (by submission date), a full course view (all lessons and quizzes, correct answers visible), "Approve" and "Reject" actions (reason required, 10–1000 characters). Also a list of all courses with a status filter and an "Unpublish" action (with a reason).
- **FR-ADMIN-4. Instructor applications**: a list with a status filter, application and profile view, "Approve" (role becomes `instructor`) or "Reject" (comment required).
- **FR-ADMIN-5. Categories**: CRUD with names in both languages, accent colour from the palette, order. A category with courses cannot be deleted (only renamed).
- **FR-ADMIN-6. Reviews**: list of recent reviews with rating and status filters, hide and restore.
- **FR-ADMIN-7. Certificates**: search by code or name, view, revocation with a reason (the verification page then shows "Certificate revoked").
- **FR-ADMIN-8. Audit log**: who, when, which action, on which object, details. Filters by administrator, action type and date.

### 5.14 Localization (I18N)

- **FR-I18N-1. Supported locales**: `uk` (default) and `en`.
- **FR-I18N-2. Locale resolution order** for every request: `?lang=uk|en` query parameter (also stores the choice in the `locale` cookie), the `locale` cookie, the signed-in user's saved locale, the `Accept-Language` header, then `uk`. The `locale` cookie stores only an explicit choice; on every successful login it is set to the account's language, so any device opens in that language after login.
- **FR-I18N-3. Switching**: the language switcher in the SSR header, the SPA header and the SPA settings sets the `locale` cookie (and localStorage) and, for a signed-in user, saves the user's locale. SSR pages reload in the new language; the SPA switches without a page reload.
- **FR-I18N-4. Coverage**: all UI strings of the site, admin panel and SPA; page titles and meta descriptions; validation messages (forms and API); API error messages (`message` follows the request locale, `code` stays stable); emails (recipient's locale); notifications (viewer's locale at display time); CSV export headers; static pages (Markdown texts in the dictionaries); certificate page.
- **FR-I18N-5. Formatting**: dates, numbers, percentages and durations are formatted with `Intl` for the active locale; plural forms use `Intl.PluralRules` (Ukrainian one/few/many/other, English one/other).
- **FR-I18N-6. Course content language**: every course has a content language (`uk` or `en`), shown as a badge on cards and the course page and usable as a catalog filter. The catalog shows courses in all languages by default.
- **FR-I18N-7. Dictionaries**: one source of truth in `packages/i18n`, namespaces `common`, `site`, `admin`, `app`, `notifications`, `emails`, `errors`, `validation`, `enums`, `readiness`. Server APIs that produce user-facing text (errors, emails, flash messages, CSV headers) accept only typed message keys. The English dictionary is typed against the Ukrainian one (a missing key is a type error); a parity test fails on missing or extra keys and on mismatched interpolation placeholders. At runtime a missing key falls back to Ukrainian and logs a warning.
- **FR-I18N-8. No locale in URLs**: pages keep the same URL in both languages (the locale comes from FR-I18N-2), so `hreflang` alternates are not generated.

---

## 6. Business rules

Each rule is implemented in one place: the service of the corresponding server module. Constants (limits, default passing score, etc.) live in `packages/contracts`.

### 6.1 Course lifecycle

```
draft ──submit──► pending_review ──approve──► published ──archive──► archived
  ▲                    │                         │
  └──────reject────────┘                         └──unpublish (admin)──► draft
```

- **BR-P1. Submission for moderation** is possible when: title, short and full description, category, level, content language and cover are filled, there are at least 2 "What you will learn" items; at least 1 module; at least 1 lesson in every module; at least 3 lessons in total; every quiz has at least 1 question and every question has at least 1 correct option; video lessons have a valid YouTube/Vimeo link.
- **BR-P2.** In `pending_review` the course cannot be edited (view only); the author can withdraw it back to `draft`.
- **BR-P3.** The author can edit a published course; changes are visible to students immediately. Re-moderation is not required. An admin can unpublish a course (status `draft`, the reason is sent to the author); enrolled students keep access.
- **BR-P4.** `archived`: the course is hidden from the catalog and search, new enrollments are impossible, enrolled students keep access to materials and certificates. The author can restore an archived course to `published` without moderation if it was published before archiving.
- **BR-P5.** A course can be deleted only in `draft` and only if it never had enrollments. Otherwise only archiving is allowed.
- **BR-P6.** Slugs are unique. When the slug of a published course changes, the old slug is kept in history and redirects (301) to the new one.

### 6.2 Enrollment and access

- **BR-E1.** Only courses with status `published` accept enrollments.
- **BR-E2.** The author cannot enroll in their own course (only preview mode FR-LEARN-8).
- **BR-E3.** Full lesson content is available to the course author, administrators and enrolled users; others see preview lessons only.
- **BR-E4.** A blocked user loses access to everything except public pages.

### 6.3 Progress and completion

- **BR-L1.** A `text` or `video` lesson is completed after an explicit "Mark as completed".
- **BR-L2.** A `quiz` lesson is completed automatically after the first passing attempt. This mark cannot be removed manually.
- **BR-L3.** Progress = completed lessons / total lessons of the course × 100 %, rounded down to an integer.
- **BR-C1.** When all lessons of a course are completed, the enrollment gets status `completed`, the completion date is set, a certificate is issued and a notification is created. This happens exactly once (idempotent).
- **BR-C2.** If the author later adds lessons, the `completed` status and the certificate are kept; progress is recalculated and may drop below 100 %.
- **BR-C3.** When a lesson is deleted, its completion marks and quiz attempts are deleted and progress is recalculated. If all remaining lessons are then completed, BR-C1 applies.

### 6.4 Quizzes

- **BR-Q1.** Grading: a single-answer question counts if the correct option is selected; a multiple-answer question counts only if the selected set exactly equals the set of correct options. No partial points. Result = earned points / maximum points × 100 %, rounded to an integer.
- **BR-Q2.** An attempt passes if the result ≥ the passing score.
- **BR-Q3.** When the attempt limit is used up without passing, no new attempts are possible; the course author can reset attempts for a specific student on the course students page.
- **BR-Q4.** Answers to questions that are not in the quiz and options that do not belong to the question are rejected with a validation error.
- **BR-Q5.** Editing quiz questions does not change results of past attempts (answers and result are stored in the attempt).

### 6.5 Reviews

- **BR-R1.** A user can review a course if enrolled and at least 30 % of the lessons are completed (or the course is completed).
- **BR-R2.** One review per user and course. The course author cannot review their own course.

### 6.6 Roles

- **BR-U1.** A user can have only one application in `pending` at a time. After a rejection a new one can be submitted after 7 days.
- **BR-U2.** If an instructor loses the role (demoted to `student`), their published courses stay published but they can no longer edit them until the role is restored.
- **BR-U3.** There must always be at least one active administrator.
- **BR-U4.** A user with an unverified email can enroll and learn but cannot write reviews, apply for the instructor role or submit a course for moderation.

---

## 7. Data model

PostgreSQL, UUID primary keys (`gen_random_uuid()`), all timestamps `timestamptz` in UTC, no soft deletion (unless stated). Main fields are listed; technical `created_at` and `updated_at` exist on every table unless stated otherwise. Full details: `specs/001-learnly-lms/data-model.md`.

### 7.1 Tables

**users**: `id`, `email` (unique, citext), `password_hash`, `email_verified_at` (nullable), `name`, `bio`, `avatar_url`, `links` (jsonb: website, github, linkedin), `locale` (enum: uk, en; default uk), `role` (enum: student, instructor, admin), `status` (enum: active, blocked), `blocked_reason`, `last_login_at`.

**refresh_tokens**: `id`, `user_id`, `token_hash`, `family_id` (rotation chain; reuse of a revoked token revokes the whole family), `user_agent`, `ip`, `expires_at`, `revoked_at`, `replaced_by_id`.

**one_time_tokens**: `id`, `user_id`, `purpose` (password_reset, email_verify), `email` (for email_verify: the address being verified), `token_hash`, `expires_at`, `used_at`.

**login_attempts**: `id`, `email`, `ip`, `succeeded`, `created_at` (brute-force limit FR-AUTH-2).

**instructor_applications**: `id`, `user_id`, `motivation`, `experience`, `status` (pending, approved, rejected), `reviewed_by` → users, `review_comment`, `reviewed_at`.

**categories**: `id`, `name_uk`, `name_en`, `slug` (unique), `accent` (palette colour enum), `sort_order`.

**courses**: `id`, `author_id` → users, `category_id` → categories, `slug` (unique), `title`, `short_description`, `description` (Markdown), `cover_url`, `level` (beginner, intermediate, advanced), `language` (uk, en), `outcomes` (text[]), `requirements` (text[]), `status` (draft, pending_review, published, archived), `was_published` (bool), `submitted_at`, `published_at`, `moderation_comment`.

**course_slug_history**: `old_slug` (PK), `course_id`.

**tags**: `id`, `name` (unique). **course_tags**: `course_id`, `tag_id` (composite PK).

**modules**: `id`, `course_id`, `title`, `position`.

**lessons**: `id`, `module_id`, `title`, `type` (text, video, quiz), `content` (Markdown), `video_url`, `duration_minutes`, `is_preview`, `position`.

**quizzes**: `id`, `lesson_id` (unique), `pass_score` (default 70), `max_attempts` (nullable), `shuffle` (bool), `reveal_answers` (always, after_pass_or_exhausted).

**questions**: `id`, `quiz_id`, `type` (single, multiple), `text`, `explanation`, `points`, `position`.

**answer_options**: `id`, `question_id`, `text`, `is_correct`, `position`.

**enrollments**: `id`, `user_id`, `course_id`, `status` (active, completed), `last_lesson_id`, `last_activity_at`, `enrolled_at`, `completed_at`; unique (`user_id`, `course_id`).

**lesson_completions**: `enrollment_id`, `lesson_id`, `completed_at`; PK (`enrollment_id`, `lesson_id`).

**quiz_attempts**: `id`, `enrollment_id`, `quiz_id`, `answers` (jsonb: questionId → optionIds[]), `result` (jsonb snapshot), `score_points`, `max_points`, `score_percent`, `passed`, `submitted_at`.

**reviews**: `id`, `user_id`, `course_id`, `rating` (1–5), `text`, `status` (visible, hidden), `hidden_reason`, `author_reply`, `author_replied_at`; unique (`user_id`, `course_id`).

**certificates**: `id`, `enrollment_id` (unique), `code` (unique), `issued_at`, `revoked_at`, `revoked_reason`. Student name, course title and author name are frozen in `student_name`, `course_title`, `author_name` at issue time.

**notifications**: `id`, `user_id`, `type` (FR-NOTIFY-1 event enum), `payload` (jsonb: ids and titles of related objects; texts are rendered from dictionaries at display time), `read_at`, `created_at`.

**audit_log**: `id`, `actor_id`, `action` (`AuditAction` enum, e.g. `course.approve`, `user.block`), `entity_type`, `entity_id`, `meta` (jsonb), `created_at`.

### 7.2 Indexes

- `courses(status, published_at desc)`, `courses(category_id)`, `courses(author_id)`, `courses(language)`;
- search: GIN `pg_trgm` indexes on `courses.title` and `courses.short_description`;
- `enrollments(course_id, enrolled_at)`, `enrollments(user_id, last_activity_at desc)`;
- `reviews(course_id, status)`;
- `notifications(user_id, read_at, created_at desc)`;
- `quiz_attempts(enrollment_id, quiz_id)`;
- `audit_log(created_at desc)`.

### 7.3 Derived values

Course rating, student count, lesson count and total duration are computed by queries (indexed aggregates) or through the `course_stats` view. No denormalized counters until a measured performance problem exists.

### 7.4 Seed data

- 1 administrator, 3 instructors, 15 students; all emails verified except one student (to demo the banner); some users with locale `en`; credentials in the README;
- 6 categories with Ukrainian and English names (Programming, Design, Data Science, Marketing, Languages, Personal productivity);
- 10 courses in different statuses: 7 published (5 in Ukrainian, 2 in English), 1 awaiting review, 1 draft, 1 archived; every published course has 3–5 modules with text, video and quiz lessons;
- enrollments with different progress, quiz attempts, 30+ reviews, 3 issued certificates, 2 instructor applications (pending and rejected), notifications.

---

## 8. REST API

### 8.1 Conventions

- Base path `/api/v1`, JSON, UTF-8.
- Authentication: cookie `access_token` (httpOnly, Secure in production, SameSite=Lax) or header `Authorization: Bearer <jwt>`. When both are present, Bearer wins.
- Locale: `Accept-Language` (`uk` or `en`) or the `locale` cookie selects the language of `message` texts; the response carries `Content-Language`.
- Pagination: `?page=1&limit=20` (max 100), response `{ "items": [...], "page": 1, "limit": 20, "total": 134 }`.
- Sorting: `?sort=popular|newest|rating|title`.
- Errors in one format:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Invalid data", "details": [{ "path": "title", "message": "At least 5 characters" }] } }
  ```
  Codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `BUSINESS_RULE_VIOLATION` (422, with `rule`, e.g. `BR-P1`, and a list of unmet items), `RATE_LIMITED` (429), `INTERNAL` (500).
- Statuses: 200 for reads and updates, 201 for creation, 204 for deletion and actions without a body.
- All input is validated by Zod schemas from `packages/contracts`; responses are described by schemas and appear in OpenAPI.
- Rate limit: 300 requests per minute per IP overall, 10 per minute for `/auth/*` (configurable; raised in the test environment).

### 8.2 Endpoints

Access legend: **G** guest, **A** any signed-in user, **S** enrolled in the course, **I** instructor (author of the object), **Ad** administrator.

**System**

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/health` | G | server and database status |
| GET | `/api/docs` | G | Swagger UI |
| GET | `/api/openapi.json` | G | OpenAPI document |

**Authentication**

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | G | registration (stores the request locale on the user) |
| POST | `/auth/login` | G | login, sets cookies and returns `{ user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | G | token refresh (cookie or body) |
| POST | `/auth/logout` | A | logout from the current session |
| POST | `/auth/logout-all` | A | logout from all devices |
| POST | `/auth/email/verify` | G | email verification by token |
| POST | `/auth/email/resend` | A | resend the verification email |
| POST | `/auth/password/forgot` | G | request a reset email |
| POST | `/auth/password/reset` | G | set a new password by token |

**Current user**

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/me` | A | profile, role, email verification status, locale |
| PATCH | `/me` | A | update profile and preferred locale |
| PUT | `/me/password` | A | change password |
| POST | `/me/email` | A | request an email change (current password + new address) |
| POST | `/me/avatar` | A | upload avatar (multipart) |
| DELETE | `/me/avatar` | A | remove avatar |
| GET | `/me/dashboard` | A | dashboard data (continue, active courses, certificates, recommendations) |
| GET | `/me/enrollments` | A | my courses, `?status=active|completed&search=` |
| GET | `/me/certificates` | A | my certificates |
| GET | `/me/notifications` | A | notifications, paginated |
| GET | `/me/notifications/unread-count` | A | unread counter |
| POST | `/me/notifications/:id/read` | A | mark as read |
| POST | `/me/notifications/read-all` | A | mark all as read |
| GET | `/me/instructor-application` | A | my latest application |
| POST | `/me/instructor-application` | A (student) | submit an application |

**Catalog (public)**

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/categories` | G | categories with course counts (name in the request locale) |
| GET | `/courses` | G | catalog: `search, category, level, language, tag, minRating, sort, page, limit` |
| GET | `/courses/:slug` | G | course details, curriculum (no lesson content), rating aggregates; for a signed-in user also enrollment status and progress |
| GET | `/courses/:slug/reviews` | G | reviews, `?rating=&page=` |
| GET | `/courses/:slug/preview/:lessonId` | G | preview lesson content (403 for non-preview lessons) |
| GET | `/instructors/:id` | G | public author profile and courses |
| GET | `/certificates/:code` | G | certificate verification |
| GET | `/stats/public` | G | home page counters |

**Learning**

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/courses/:id/enrollment` | A | enroll |
| DELETE | `/courses/:id/enrollment` | S | leave the course (not after a certificate) |
| GET | `/learn/courses/:courseId` | S, I, Ad | curriculum with completion marks, progress, last lesson |
| GET | `/learn/lessons/:lessonId` | S, I, Ad | full lesson content, updates `last_lesson_id` |
| PUT | `/learn/lessons/:lessonId/completion` | S | mark completed (returns new progress and the course-completed flag) |
| DELETE | `/learn/lessons/:lessonId/completion` | S | remove the mark (not for quizzes) |
| GET | `/learn/quizzes/:quizId` | S, I, Ad | questions and options without correct answers, settings, attempts left, best result |
| POST | `/learn/quizzes/:quizId/attempts` | S | submit answers; response: result and review |
| GET | `/learn/quizzes/:quizId/attempts` | S | attempt history |

**Reviews**

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/courses/:id/reviews` | S | create a review |
| PATCH | `/reviews/:id` | review author | edit |
| DELETE | `/reviews/:id` | review author | delete |
| PUT | `/reviews/:id/reply` | I | course author's reply |

**Teaching**

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/instructor/overview` | I | dashboard summary |
| GET | `/instructor/courses` | I | own courses, `?status=` |
| POST | `/instructor/courses` | I | create a draft |
| GET | `/instructor/courses/:id` | I | full course for the editor (with correct answers) |
| PATCH | `/instructor/courses/:id` | I | basic fields |
| DELETE | `/instructor/courses/:id` | I | delete (BR-P5) |
| POST | `/instructor/courses/:id/cover` | I | upload a cover |
| GET | `/instructor/courses/:id/readiness` | I | BR-P1 checklist |
| POST | `/instructor/courses/:id/submit` | I | submit for moderation |
| POST | `/instructor/courses/:id/withdraw` | I | withdraw from moderation |
| POST | `/instructor/courses/:id/archive` | I | archive |
| POST | `/instructor/courses/:id/restore` | I | restore from archive |
| POST | `/instructor/courses/:id/modules` | I | create a module |
| PATCH | `/instructor/modules/:id` | I | rename |
| DELETE | `/instructor/modules/:id` | I | delete with lessons |
| PUT | `/instructor/courses/:id/structure` | I | new order of modules and lessons in one request: `[{ moduleId, lessonIds[] }]` |
| POST | `/instructor/modules/:id/lessons` | I | create a lesson |
| GET | `/instructor/lessons/:id` | I | lesson for the editor |
| PATCH | `/instructor/lessons/:id` | I | update a lesson |
| DELETE | `/instructor/lessons/:id` | I | delete a lesson |
| PUT | `/instructor/lessons/:id/quiz` | I | save the whole quiz (settings, questions, options) |
| GET | `/instructor/courses/:id/students` | I | students, search, sorting, pagination |
| GET | `/instructor/courses/:id/students.csv` | I | CSV export |
| DELETE | `/instructor/courses/:id/students/:userId/attempts/:quizId` | I | reset attempts (BR-Q3) |
| GET | `/instructor/courses/:id/stats` | I | data for the FR-TEACH-6 charts |
| GET | `/instructor/reviews` | I | reviews on own courses |

**Administration** (API equivalents of the admin panel actions; the panel calls the same services)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/admin/stats` | Ad | dashboard data |
| GET | `/admin/users` | Ad | users, `search, role, status` |
| GET | `/admin/users/:id` | Ad | user card |
| PATCH | `/admin/users/:id/role` | Ad | change role |
| POST | `/admin/users/:id/block` | Ad | block (reason) |
| POST | `/admin/users/:id/unblock` | Ad | unblock |
| GET | `/admin/courses` | Ad | courses, `?status=` |
| GET | `/admin/courses/:id` | Ad | full course |
| POST | `/admin/courses/:id/approve` | Ad | approve |
| POST | `/admin/courses/:id/reject` | Ad | reject (reason) |
| POST | `/admin/courses/:id/unpublish` | Ad | unpublish (reason) |
| GET | `/admin/instructor-applications` | Ad | applications |
| POST | `/admin/instructor-applications/:id/approve` | Ad | approve |
| POST | `/admin/instructor-applications/:id/reject` | Ad | reject |
| GET, POST | `/admin/categories` | Ad | list, create |
| PATCH, DELETE | `/admin/categories/:id` | Ad | update, delete |
| GET | `/admin/reviews` | Ad | reviews |
| POST | `/admin/reviews/:id/hide`, `/unhide` | Ad | hide, show |
| GET | `/admin/certificates` | Ad | certificates |
| POST | `/admin/certificates/:code/revoke` | Ad | revoke |
| GET | `/admin/audit-log` | Ad | audit log |

Paths are relative to `/api/v1` except the system ones.

### 8.3 Documentation and demo (lab 3)

- Swagger UI documenting all endpoints, schemas and examples, with an Authorize button for the Bearer token.
- Postman collection `docs/api/learnly.postman_collection.json` with an environment (baseUrl, tokens, locale); the login script stores the token in a variable; folders per area; status tests on key requests.
- Postman demo flow: student login, catalog, enrollment, lesson completion, quiz submission, review; instructor login, course creation, module and lesson, submission for moderation; admin login, approval; check that the course appears in the catalog. One request repeats an error case with `Accept-Language: en` and `uk` to show localized messages.

---

## 9. Design and interface

### 9.1 Style

Colour reference: the design system in `ch-design-system`. Only the palette and the general character are taken; no logos, copy, illustrations or company-specific components.

- **Monochrome base**: light theme (white background, near-black text), dark theme (near-black background, white text). The primary button is "ink": black on light, white on dark.
- **Accent colours** (only for category tags, statuses, charts, progress, illustrations): yellow `#ffb411`, green `#10d690`, cyan `#1abbe5`, blue `#357cff`, indigo `#4123e8`, red `#f94128`, pink `#d81879`, magenta `#b20c6f`. Text on coloured backgrounds uses variants with at least WCAG AA contrast in both themes.
- **Semantics**: success (green), warning (yellow), error (red), info (blue). Status is always duplicated by text or an icon, never colour alone.
- **Fonts**: Inter (body) and Roboto Condensed (large headings, numbers in statistics; chosen over Barlow Condensed because Barlow has no Cyrillic), JetBrains Mono (code); local font files from the `@fontsource` packages (no external CDN requests), `font-display: swap`. All three cover Cyrillic and Latin.
- **Radii and shadows**: small radii (4–8 px for inputs and buttons, 16 px for cards), minimal shadows, separation by borders and surfaces.
- **Learnly logo**: a simple wordmark and a square icon (SVG) made from scratch.
- **Text length**: layouts tolerate both languages (Ukrainian strings are often 20–30 % longer); no fixed-width buttons for text labels.

### 9.2 Tokens

- One file `packages/design-tokens/theme.css` in Tailwind v4 format (`@theme`): primitives (neutral 0–950, accents), semantic tokens (`--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-primary`, `--color-success`, etc.), fonts, font sizes, radii, spacing, breakpoints.
- Dark theme via `[data-theme="dark"]` on `<html>`, system theme via `prefers-color-scheme`.
- The SPA and SSR use the same token file, so the site, admin panel and dashboard look the same. SSR CSS is built by the Tailwind CLI from the EJS templates.

### 9.3 Shared components

SPA (`shared/components`, Radix-based): Button, IconButton, Input, Textarea, Select, Checkbox, RadioGroup, Switch, FormField, Card, Badge/Tag, Avatar, ProgressBar, Tabs, Accordion, Dialog, Drawer, AlertDialog, DropdownMenu, Tooltip, Popover, Toast, Skeleton, Spinner, EmptyState, VirtualList, VirtualTable, Table, StarRating, MarkdownView, LocaleSwitcher, ErrorBoundary fallback.

SSR (`views/partials`): the same visual components as EJS partials with the same classes: header, footer, locale-switcher, course-card, pagination, form-field, alert, star-rating, tag, empty-state, admin-table, admin-sidebar.

### 9.4 Responsiveness and accessibility

- Mobile-first, verified at 360, 768, 1024, 1440 px. No horizontal page scrolling.
- Keyboard navigation, visible focus, a "Skip to content" link, semantic headings and landmarks.
- Every icon-only button has an `aria-label`; loading states use `aria-busy`; forms have linked labels and errors (`aria-describedby`); all of these texts are localized.
- Text contrast at least WCAG AA.
- `prefers-reduced-motion` disables animations.

### 9.5 Interface states

Every SPA screen has: loading (skeletons), empty state (with a hint about what to do next), error (message through the single `describeError`; "Try again" for transient failures, navigation to a safe place for terminal ones), success (toast for actions). Submit buttons are disabled while a request is in flight. Quick actions (lesson completion, reading a notification) use optimistic updates with rollback on error.

---

## 10. Non-functional requirements

### 10.1 Security

- Passwords: argon2id. Reset, verification and refresh tokens are stored only as hashes.
- JWTs are signed with a secret from env; access lifetime 15 minutes.
- Cookies: httpOnly, SameSite=Lax, Secure in production.
- CSRF: state-changing requests authenticated by cookie use a double-submit token (cookie `csrf_token` + `X-CSRF-Token` header from the SPA or a hidden field in SSR forms). Requests authenticated by a Bearer token skip the CSRF check.
- Permission checks on every endpoint and SSR route (role + object ownership); correct quiz answers never reach a student before submission.
- Validation of all input, request size limit (1 MB JSON), file type check by signature, random names for uploaded files.
- Markdown is sanitized in the SPA (rehype-sanitize) and on the server for SSR (the same rehype-sanitize with a shared schema); EJS escapes output by default.
- helmet with a Content Security Policy (YouTube/Vimeo in `frame-src`, Wikipedia and noembed in `connect-src`).
- Rate limiting (section 8.1), brute-force protection (FR-AUTH-2).
- Secrets only in `.env`; the repository contains `.env.example`.
- Audit log of administrator actions.

### 10.2 Performance

- On seed data, the catalog and course page respond in under 300 ms on localhost (p95); read API endpoints in under 200 ms.
- Pagination on every server list, indexes on filter fields.
- SPA: route-level code splitting (`React.lazy`), initial bundle at most 250 KB gzip; the dictionary of the inactive locale is loaded on demand.
- Static assets with long-term caching (hashed names), gzip/brotli compression.
- Covers and avatars are compressed on the server (sharp); images use `loading="lazy"`.

### 10.3 Reliability and code quality

- Transactions for composite operations (saving a whole quiz, changing the course structure, completing a course with certificate issuing).
- One server error handler, logging with request id, no stack traces in production responses.
- Graceful shutdown (database connections closed).
- Configuration is read and validated at startup (fail fast).
- ESLint, TypeScript strict, Prettier, knip, dependency license check and `npm audit` in the common `npm run check` script.

### 10.4 Testing

- Server: unit tests of business rules (BR-*), integration API tests on a test database (Supertest) for auth, enrollment, learning, quizzes, moderation, access control and localized responses.
- i18n: dictionary parity test (keys and placeholders), translator and plural rules unit tests.
- SPA: `utils` with 100 % coverage, slice tests, endpoint tests through MSW, tests of key components (player, quiz, quiz editor, locale switching).
- E2E (Playwright): registration and enrollment; completing a course to the certificate; course creation, moderation and appearance in the catalog; switching the language on the site and in the dashboard.

### 10.5 Compatibility

Latest 2 versions of Chrome, Firefox, Safari, Edge; mobile Safari and Chrome.

---

## 11. Page map

### 11.1 SSR

| Path | Page | Access |
|---|---|---|
| `/` | Home | everyone |
| `/courses` | Catalog | everyone |
| `/courses/:slug` | Course | everyone |
| `/courses/:slug/preview/:lessonId` | Preview lesson | everyone |
| `/instructors/:id` | Author | everyone |
| `/teach` | Become an instructor | everyone (form for students) |
| `/certificates/:code` | Certificate verification | everyone |
| `/about`, `/faq`, `/terms`, `/privacy`, `/contacts` | Static | everyone |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Authentication | guest |
| `/verify-email` | Result of email verification from the email link | everyone |
| `POST /locale`, `POST /theme` | Language and theme switching (work without JS) | everyone |
| `/admin` | Dashboard | admin |
| `/admin/users`, `/admin/users/:id` | Users | admin |
| `/admin/courses`, `/admin/courses/moderation`, `/admin/courses/:id` | Courses and moderation | admin |
| `/admin/applications`, `/admin/applications/:id` | Applications | admin |
| `/admin/categories` | Categories | admin |
| `/admin/reviews` | Reviews | admin |
| `/admin/certificates` | Certificates | admin |
| `/admin/audit-log` | Audit log | admin |

### 11.2 SPA (`/app`)

| Path | Screen | Access |
|---|---|---|
| `/app` | Dashboard | signed in |
| `/app/courses` | My courses | signed in |
| `/app/learn/:courseId/:lessonId` | Course player (lesson or quiz) | enrolled, author, admin |
| `/app/learn/:courseId/completed` | Course completion screen | enrolled |
| `/app/certificates` | Certificates | signed in |
| `/app/notifications` | Notifications | signed in |
| `/app/profile` | Profile | signed in |
| `/app/settings` | Settings: language, theme, password, email, logout everywhere | signed in |
| `/app/teach` | Instructor dashboard | instructor |
| `/app/teach/courses/:id` | Course editor (tabs) | author |
| `/app/teach/lessons/:id` | Lesson editor | author |
| `/app/teach/courses/:id/students` | Course students | author |
| `/app/teach/courses/:id/stats` | Course statistics | author |
| `/app/teach/reviews` | Reviews of my courses | instructor |
| `*` | 404 inside the SPA | everyone |

An unauthenticated user opening `/app/*` is redirected to `/login?returnTo=...`.

### 11.3 SPA features (guideline structure)

`auth`, `navigation`, `theme`, `locale`, `dashboard`, `enrollments`, `player`, `quizzes`, `notes`, `wiki`, `videoEmbed`, `certificates`, `notifications`, `profile`, `settings`, `teachCourses`, `teachCurriculum`, `teachLessons`, `teachQuizzes`, `teachStudents`, `teachStats`, `reviews`. A shared `shared/api/baseApi.ts` with a `baseQuery` that normalizes errors, adds the CSRF and `Accept-Language` headers and retries `/auth/refresh` once on 401.

---

## 12. Key user flows

1. **New student.** A guest finds a course in the catalog, reads the curriculum and a preview lesson, clicks "Enroll", signs up with email, is enrolled automatically right after registration and lands on the first lesson in the dashboard, then verifies the email from the link.
2. **Taking a course.** The student goes through text and video lessons, writes notes, looks up a term with "What is this?", takes a quiz (reloading the page in the middle keeps the answers), fails the first attempt, reads the explanations, passes the second, completes the course, receives a certificate and leaves a review.
3. **New instructor.** A student applies on `/teach`, an admin approves in the admin panel, the user receives a notification and an email, and "Teaching" appears in the menu.
4. **Course creation.** The instructor creates a course, fills in the basics, builds the curriculum with drag and drop, writes lessons (the draft survives closing the tab), creates a quiz, sees the readiness checklist and submits for moderation.
5. **Moderation.** The admin rejects the course with a reason, the instructor fixes it and resubmits, the admin approves, and the course appears in the catalog and in "New courses" on the home page.
6. **Analytics.** The instructor opens the course statistics, finds the lesson where students drop off, replies to a review and resets quiz attempts for a student.
7. **Content moderation.** The admin hides an abusive review, blocks the user and sees their own actions in the audit log.
8. **English-speaking learner.** A visitor switches the site to English, filters the catalog by English-language courses, registers (the account stores `en`), receives English emails, and the dashboard, notifications and certificate page are in English.

---

## 13. Lab acceptance criteria

### Lab 1, backend

- [ ] Node.js + Express server, data in PostgreSQL, migrations and seeds run with one command.
- [ ] Dynamic HTML pages generated on the server from the database: home, catalog with filters and pagination, course page, author page, certificate verification, admin panel.
- [ ] Static content: About, FAQ, terms, privacy policy, contacts.
- [ ] Registration and login with email and password, email verification, logout, password recovery (emails in the local Mailpit).
- [ ] Actions of registered users persisted on the server: enrollment, review, instructor application (through SSR forms), plus taking lessons and quizzes.
- [ ] Administrative users: an admin panel with user management, moderation of courses, applications and reviews, categories, audit log.
- [ ] Server-side access control for all roles.
- [ ] The site and the admin panel are available in Ukrainian and English.

### Lab 2, frontend

- [ ] SPA on React + Vite + TypeScript + Tailwind + Radix + Redux Toolkit/RTK Query; code follows `architecture-and-guidelines.md`.
- [ ] Various user actions with UI updates without reloads: lessons, quizzes with results, notes, course editor with drag and drop, quiz editor, notifications, statistics charts, optimistic updates, instant language switching.
- [ ] Work with the own web API (the whole dashboard through the lab 3 REST API).
- [ ] Work with public external APIs: Wikipedia REST (term lookup), noembed (video data).
- [ ] Local storage: theme, locale, notes, unfinished quiz, lesson and course drafts, lookup cache, UI state.
- [ ] Responsive (mobile, tablet, desktop), light and dark themes, accessibility, Ukrainian and English.

### Lab 3, web API

- [ ] REST API `/api/v1` with read methods (catalog, course, curriculum, progress, statistics) and action methods persisted in the database (enrollment, completion, quiz attempts, reviews, course CRUD, moderation).
- [ ] Authentication: JWT (cookie and Bearer), refresh tokens, role and ownership checks.
- [ ] One error format, validation, pagination, rate limiting, localized messages by `Accept-Language`.
- [ ] Demo with developer tools: Swagger UI and a Postman collection with a scenario.
- [ ] Demo on a client: the lab 2 SPA works entirely through this API.
- [ ] Integration tests of key endpoints.

---

## 14. Implementation stages

1. **Skeleton**: monorepo, Docker (Postgres, Mailpit), configuration, design tokens, i18n package, shared SSR layout, SPA skeleton with the store, linters.
2. **Data and auth**: Prisma schema, migrations, seeds, registration, login, JWT, email verification, password reset.
3. **Public site (lab 1)**: home, catalog, course, author, static pages, enrollment, reviews, instructor application.
4. **Learning and teaching API (lab 3)**: endpoints, OpenAPI, Swagger, integration tests.
5. **Student dashboard (lab 2)**: dashboard, my courses, player, quizzes, notes, Wikipedia, certificates, notifications, profile, settings.
6. **Instructor dashboard (lab 2)**: course, curriculum, lesson and quiz editors, students, statistics.
7. **Admin panel (lab 1)**: everything in section 5.13.
8. **Polish**: responsiveness, accessibility, dark theme, translation review, empty states, e2e tests, Postman collection, README with setup and demo accounts.

---

## 15. Out of scope (possible extensions)

Not part of the current scope to keep the product manageable; may be added later:

- paid courses and payments;
- live sessions, chat, WebSockets;
- assignments with manual grading by the instructor (student file uploads);
- lesson discussions and comments;
- server-side PDF certificate generation (currently browser printing);
- languages other than Ukrainian and English; translation of user-generated content; locale prefixes in URLs;
- a mobile app (the API is ready for it);
- self-hosted video uploads (currently YouTube/Vimeo only).

---

## 16. Groundwork for labs 4 and 5

- **Lab 4**: a server Dockerfile (multi-stage build with the SPA inside), `docker-compose.prod.yml`, health check, environment variables; deployment on localhost and a free hosting provider (e.g. Render or Railway + managed Postgres); measurements with Lighthouse, k6 or autocannon for the catalog, course page and key APIs.
- **Lab 5**: OWASP ZAP scan, npm audit, security header analysis, manual access-control testing (IDOR on lesson and quiz endpoints, access to correct answers, CSRF on SSR forms, XSS through Markdown, file uploads).
