# syntax=docker/dockerfile:1
# Production image of Learnly: one Node process serves the SSR site, the admin panel, the REST API and the built
# SPA (docs/deployment.md). Build: `docker build -t learnly .`; the `build` stage also prepares a database
# (`npm run db:setup`), since it has the Prisma CLI and the seed.

FROM node:24-bookworm-slim AS build
# The Prisma CLI (migrations) needs OpenSSL; the runtime image does not, as the client talks to Postgres through pg.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Dependencies first, so a code change does not reinstall them.
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY packages/i18n/package.json packages/i18n/
COPY packages/design-tokens/package.json packages/design-tokens/
# Retries and a cache mount make the large install survive flaky networks and repeat builds.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000

COPY . .
# prisma.config.ts reads DATABASE_URL even to generate the client; no database is contacted at build time.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run db:generate -w @learnly/server \
  && npm run build

FROM build AS prune
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
  PORT=3000 \
  UPLOADS_DIR=uploads
WORKDIR /app

COPY --from=prune --chown=node:node /app/package.json ./
COPY --from=prune --chown=node:node /app/node_modules ./node_modules
COPY --from=prune --chown=node:node /app/packages ./packages
COPY --from=prune --chown=node:node /app/apps/server/package.json ./apps/server/
COPY --from=prune --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=prune --chown=node:node /app/apps/server/src/views ./apps/server/src/views
COPY --from=prune --chown=node:node /app/apps/server/src/public ./apps/server/src/public
COPY --from=prune --chown=node:node /app/apps/web/package.json ./apps/web/
COPY --from=prune --chown=node:node /app/apps/web/dist ./apps/web/dist
RUN mkdir -p apps/server/uploads && chown node:node apps/server/uploads

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "apps/server/dist/main.js"]
