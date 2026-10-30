// The server for the Playwright run (`webServer` in apps/web/e2e/playwright.config.ts): a fresh seed,
// the built SPA from apps/web/dist and the server CSS; Playwright stops the process after the run.
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ROOT, seedDatabase, seededServerEnv, startServer } from './lib/seeded-server.mjs';

const E2E_PORT = 3198;
// Every scenario's users share one IP, so the per-IP limits for a single person would cut the run short;
// the limiters themselves are covered by the server's integration tests.
const E2E_RATE_LIMITS = { RATE_LIMIT_GLOBAL_PER_MIN: '100000', RATE_LIMIT_AUTH_PER_MIN: '10000' };
const env = { ...seededServerEnv('e2e', E2E_PORT).env, ...E2E_RATE_LIMITS };

seedDatabase(env);
execSync('npm run build:css', { cwd: resolve(ROOT, 'apps/server'), env, stdio: 'inherit' });
const server = startServer(env);
server.on('exit', (code) => process.exit(code ?? 0));
