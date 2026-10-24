import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const SERVER_ROOT = resolve(import.meta.dirname, '..', '..');

/** Applies migrations to learnly_test once per run (non-destructive `migrate deploy`). */
export default function setup(): void {
  execSync('npx prisma migrate deploy', {
    cwd: SERVER_ROOT,
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'ignore',
  });
}
