// The server for the Playwright run (`webServer` in apps/web/e2e/playwright.config.ts): a fresh seed,
// the built SPA from apps/web/dist and the server CSS; Playwright stops the process after the run.
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ROOT, seedDatabase, seededServerEnv, startServer } from './lib/seeded-server.mjs';

const E2E_PORT = 3198;
const { env } = seededServerEnv('e2e', E2E_PORT);

seedDatabase(env);
execSync('npm run build:css', { cwd: resolve(ROOT, 'apps/server'), env, stdio: 'inherit' });
const server = startServer(env);
server.on('exit', (code) => process.exit(code ?? 0));
