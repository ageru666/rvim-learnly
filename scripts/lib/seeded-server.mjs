// A server on its own freshly seeded database and port, for the Postman run and the e2e tests.
// Development data stays untouched: the database is `<dev database>_<name>`.
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..', '..');
const SERVER_DIR = resolve(ROOT, 'apps/server');
const STARTUP_TIMEOUT_MS = 60_000;

/** Environment of the server: the dev `.env` with its own database, port and uploads folder. */
export function seededServerEnv(name, port) {
  const envFile = resolve(ROOT, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (copy .env.example to .env)');
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.pathname = `${databaseUrl.pathname}_${name}`;
  const baseUrl = `http://localhost:${port}`;
  return {
    baseUrl,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DATABASE_URL: databaseUrl.toString(),
      PORT: String(port),
      APP_URL: baseUrl,
      SPA_DEV_URL: '',
      UPLOADS_DIR: `uploads-${name}`,
      LOG_LEVEL: 'warn',
    },
  };
}

/** `migrate deploy` creates the database and applies migrations; the seed itself truncates every table. */
export function seedDatabase(env) {
  console.log(`Seeding ${new URL(env.DATABASE_URL).pathname.slice(1)}…`);
  execSync('npx prisma migrate deploy', { cwd: SERVER_DIR, env, stdio: 'inherit' });
  execSync('npx prisma db seed', { cwd: SERVER_DIR, env, stdio: 'inherit' });
}

export function startServer(env) {
  return spawn('npx', ['tsx', '--conditions=source', 'src/main.ts'], {
    cwd: SERVER_DIR,
    env,
    stdio: 'inherit',
    shell: true,
  });
}

export function stopServer(server) {
  if (process.platform === 'win32') execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
  else server.kill('SIGTERM');
}

export async function waitForHealth(baseUrl) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/health`)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`the server did not start on ${baseUrl}`);
}
