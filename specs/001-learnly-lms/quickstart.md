# Quickstart: running and validating Learnly

A guide to verify that the product works end to end. Contract details: `contracts/`, data model:
`data-model.md`.

## Prerequisites

- Node.js 24 LTS (verified on 24.22.1, see `.nvmrc`), npm ≥ 11.
- Docker Desktop (PostgreSQL 18 and Mailpit in containers).
- Free ports: 3000 (server), 5173 (Vite), 5433 (Postgres), 1025 and 8025 (Mailpit).

## Start (≤ 5 commands, SC-008)

```bash
cp .env.example .env          # defaults work for a local run
npm install
docker compose up -d          # postgres:5433, mailpit:1025/8025
npm run db:reset              # migrations + demo data
npm run dev                   # server :3000 + Vite :5173 (single entry point)
```

In development everything opens on `http://localhost:5173`: Vite serves the dashboard under `/app`
with HMR and proxies every other path (site, admin panel, API, uploads) to the server. Production
mode: `npm run build && npm start`, everything on `http://localhost:3000`.

## Addresses (development; in production the same path on `:3000`)

| What | Address |
|---|---|
| Site | http://localhost:5173 (add `?lang=en` for English) |
| Dashboard | http://localhost:5173/app |
| Admin panel | http://localhost:5173/admin |
| Swagger UI | http://localhost:5173/api/docs |
| Mail (Mailpit) | http://localhost:8025 |

Demo accounts (password `Learnly2026!`): `admin@learnly.local`, `olena.teacher@learnly.local`,
`iryna.teacher@learnly.local` (English), `student1@learnly.local`, `student2@learnly.local`
(English), `student15@learnly.local` (unverified email).

## Automated checks

```bash
npm run check        # lint + typecheck + unit/integration tests with coverage (incl. i18n parity) + EJS strings + licenses and audit
npm run check:full   # check + knip + e2e + the Postman collection through newman + perf
npm run test:server  # API integration tests on learnly_test
npm run e2e          # SPA build + bundle budget + Playwright in uk and en (needs docker compose)
npm run test:postman # the Postman collection through newman on a seeded server
npm run perf         # p95 of the catalog, a course page and the catalog API (budgets 300/300/200 ms)
```

Expected result: every command exits with code 0.

## Manual validation scenarios

Each scenario matches a user story in `spec.md`.

1. **Catalog (US1)**: open `/`, then `/courses?category=programming&language=uk&sort=rating`.
   Expected: only published courses, the URL reproduces the filter, the page works with JavaScript
   disabled.
2. **Registration (US2)**: `/register` → new account → verification email in Mailpit → link → the
   banner disappears. `/forgot-password` → email → new password → login.
3. **Languages (US4)**: on `/` switch to English in the header → home, catalog and course pages are in
   English; register a new user → the welcome email is in English; open `/app` → the dashboard is in
   English; in `/app/settings` switch to Ukrainian → texts, dates and plurals change without a reload;
   submit an invalid form → messages in Ukrainian; filter the catalog by English-language courses.
4. **Learning (US3, US5, US6)**: `student1` → course → "Enroll" → player → mark lessons → quiz: answer,
   reload the page (answers kept), submit → complete the course → certificate → open
   `/certificates/<code>` in a private window (in Ukrainian), then with `?lang=en` (in English).
5. **Review (US7)**: leave a review on the completed course; the rating on the course card updates.
6. **Instructor (US8)**: a new user → `/teach` → application → `admin` approves in
   `/admin/applications` → the user creates a course in `/app/teach` with content language English,
   drags lessons, closes the tab in the middle of editing a lesson, opens it again (offer to restore
   the draft), submits for moderation (first sees the unmet checklist items).
7. **Moderation (US9)**: `admin` rejects the course with a reason → the author sees a notification in
   their language → fixes and resubmits → `admin` approves → the course is in the catalog; the actions
   are visible in `/admin/audit-log`.
8. **Analytics (US10)**: `olena.teacher` → `/app/teach` → course → statistics and students → the CSV
   export opens in Excel with Cyrillic text and localized headers.
9. **Tools (US12)**: in a lesson select "алгоритм" → "What is this?" → Wikipedia summary; write a note,
   reload, export `.md`.
10. **API (US13)**: import `docs/api/learnly.postman_collection.json` and run the "Demo flow" folder
    with the Collection Runner: every test passes; the "Localized error" request returns the same
    `code` with Ukrainian and English `message`.
11. **Appearance (US14)**: switch to the dark theme on the site → go to the dashboard and the admin
    panel: the theme is the same, no flashing; check a 360 px width in DevTools in both languages.
