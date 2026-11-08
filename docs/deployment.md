# Deploying Learnly

Lab 4 asks for deployment on localhost and on public servers, and for measurements of each. One Node process
serves everything:

- the SSR site and the admin panel;
- `/api/v1` and Swagger;
- the built dashboard at `/app`.

So each deployment is a single service plus a PostgreSQL database.

| Deployment | How | Database |
|---|---|---|
| Localhost | `docker-compose.prod.yml`, the production image | its own PostgreSQL container |
| Render | `render.yaml` Blueprint, the same Docker image | Supabase |

## Localhost (production image)

```bash
npm run prod:build   # docker build: the app image and the setup image
npm run prod:up      # PostgreSQL, Mailpit, one-off setup (migrations + demo data), the app
```

- The site is at http://localhost:8080 and its mail at http://localhost:8026. Demo accounts are as in the README
  (password `Learnly2026!`).
- `npm run prod:down` stops the stack. The data stays in the `learnly-prod_pgdata` volume.
- The images are built with `docker build`, not by Compose: Compose cannot build from a folder path with non-ASCII
  characters, such as this repository's.

## Supabase (the database for the public deployments)

1. Create a project in the **Central EU (Frankfurt)** region and keep the database password.
2. Copy the **session pooler** connection string: Connect → Session pooler.
   - It looks like `postgresql://postgres.<project>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`.
   - Use the session pooler, not the direct connection: the direct host is IPv6-only on the free plan, and Render
     connects over IPv4.
   - Append `?sslmode=require`. The connection is encrypted; the certificate is not checked against a CA, as with
     libpq's `require` (`apps/server/src/lib/pgConfig.ts`).
3. Prepare the database once. Put the string into `.env.supabase` in the repository root. The file is
   git-ignored, and it is a separate file so that the development `.env` keeps pointing at the local database.

   ```
   DATABASE_URL=postgresql://postgres.<project>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```

   Then run `npm run db:setup:supabase`. It reads only that file and prints the host, never the password. It
   applies the migrations, which create the `citext` and `pg_trgm` extensions, and loads the demo data while the
   database is empty. Running it again only applies new migrations.
   `npm run db:setup:supabase -- --reseed` replaces all data with the demo set.

   Without the file, the same works with the variable set in the shell: `DATABASE_URL=… npm run db:setup`.

## Render

1. In Render: New → Blueprint, then choose the GitHub repository. Render reads `render.yaml` and creates the
   `rvim-learnly` web service: Frankfurt, free plan, Docker.
2. When asked for `DATABASE_URL`, paste the Supabase string from above, with `?sslmode=require`. Render generates
   `JWT_SECRET`.
3. The first build takes a few minutes. The service is at `https://rvim-learnly.onrender.com` (or the name Render
   shows), and `/health` reports `"db":"ok"`.

Every push to `main` deploys again. The settings in `render.yaml`:

- `APP_URL` comes from `RENDER_EXTERNAL_URL`.
- `COOKIE_SECURE=true` (HTTPS, so Secure cookies and HSTS).
- `TRUST_PROXY=1` (the client IP behind Render's proxy).
- No `SMTP_HOST`.

What a free service means for the results:

- It sleeps after about 15 minutes without traffic, and the next request wakes it, which takes tens of seconds.
  `npm run perf` reports this first request separately.
- Its disk is temporary. Covers and avatars uploaded on Render disappear on a restart. The demo covers are static
  files in the image, so they always load.
- It sends no email. Registration works, but the verification email is only logged as not sent. Use the demo
  accounts, whose emails are verified, for reviews and instructor applications.

## Measuring (lab 4)

```bash
npm run perf -- --url http://localhost:8080
npm run perf -- --url https://rvim-learnly.onrender.com
```

- Each run measures the catalog, a course page and the catalog API. It first prints the first, possibly cold,
  request, then p50, p95 and the maximum latency per URL.
- By default it runs 4 connections at most 4 requests a second for 20 s per URL. That stays under the deployed rate
  limit of 300 requests a minute per IP.
- For a throughput test, raise `RATE_LIMIT_GLOBAL_PER_MIN` on the deployment for the duration, then run
  `npm run perf -- --url … --rate 0 --connections 10`.
- Without `--url`, `npm run perf` is the local budget check on a freshly seeded server; it is part of `check:full`.
