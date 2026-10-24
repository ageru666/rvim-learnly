import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, env } from 'prisma/config';

const envFile = resolve(import.meta.dirname, process.env.NODE_ENV === 'test' ? '.env.test' : '../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx --conditions=source prisma/seed/index.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
