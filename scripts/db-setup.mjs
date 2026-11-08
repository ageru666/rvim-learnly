// Prepares a deployment database (docs/deployment.md): applies the migrations and loads the demo data when the
// database has no users yet. The seed empties every table first, so a database in use is never seeded again
// unless `--reseed` is passed. Usage: DATABASE_URL=… npm run db:setup [-- --reseed]
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';
// Node strips the types of this TypeScript file itself: the same sslmode reading as the server.
import { pgPoolConfig } from '../apps/server/src/lib/pgConfig.ts';
import { ROOT } from './lib/seeded-server.mjs';

const SERVER_DIR = resolve(ROOT, 'apps/server');
const reseed = process.argv.includes('--reseed');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set: pass the connection string of the deployment database.');
  process.exit(1);
}

const run = (command) => execSync(command, { cwd: SERVER_DIR, stdio: 'inherit', env: process.env });

async function userCount() {
  const client = new pg.Client(pgPoolConfig(process.env.DATABASE_URL));
  await client.connect();
  try {
    const { rows } = await client.query('SELECT count(*)::int AS count FROM users');
    return rows[0].count;
  } finally {
    await client.end();
  }
}

console.log(`Database: ${new URL(process.env.DATABASE_URL).host}`);
run('npx prisma migrate deploy');
const users = await userCount();
if (users === 0 || reseed) {
  console.log(users === 0 ? 'No users yet: loading the demo data.' : `Reseeding over ${users} users (--reseed).`);
  run('npx prisma db seed');
} else {
  console.log(`${users} users already exist: the demo data is left as it is (pass --reseed to replace it).`);
}
