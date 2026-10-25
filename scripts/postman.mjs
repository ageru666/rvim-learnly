// Runs the Postman collection with Newman against a freshly seeded server (lab 3, FR-API-3).
// The run uses its own database (`<dev database>_postman`) and port, so development data stays untouched.
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SERVER_DIR = resolve(ROOT, 'apps/server');
const PORT = '3199';
const BASE_URL = `http://localhost:${PORT}`;
const NEWMAN = 'newman@6.2.3';
const STARTUP_TIMEOUT_MS = 60_000;

const envFile = resolve(ROOT, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (copy .env.example to .env)');

const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.pathname = `${databaseUrl.pathname}_postman`;

const env = {
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_URL: databaseUrl.toString(),
  PORT,
  APP_URL: BASE_URL,
  SPA_DEV_URL: '',
  UPLOADS_DIR: 'uploads-postman',
  LOG_LEVEL: 'warn',
};

const run = (command, cwd = ROOT) => execSync(command, { cwd, env, stdio: 'inherit' });

async function waitForHealth() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE_URL}/health`)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`the server did not start on ${BASE_URL}`);
}

console.log(`Seeding ${databaseUrl.pathname.slice(1)}…`);
// `migrate deploy` creates the database and applies migrations; the seed itself truncates every table.
run('npx prisma migrate deploy', SERVER_DIR);
run('npx prisma db seed', SERVER_DIR);

const server = spawn('npx', ['tsx', '--conditions=source', 'src/main.ts'], {
  cwd: SERVER_DIR,
  env,
  stdio: 'inherit',
  shell: true,
});

let exitCode = 1;
try {
  await waitForHealth();
  run(
    `npx --yes ${NEWMAN} run docs/api/learnly.postman_collection.json ` +
      `-e docs/api/learnly.postman_environment.json --env-var baseUrl=${BASE_URL}`,
  );
  exitCode = 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  if (process.platform === 'win32') execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
  else server.kill('SIGTERM');
}
process.exit(exitCode);
