import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/** apps/server, both when running from src/ (tsx) and from dist/ (node). */
export const SERVER_ROOT = resolve(import.meta.dirname, '..', '..');

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive(),
  APP_URL: z.url(),
  SPA_DEV_URL: z
    .union([z.literal(''), z.url()])
    .default('')
    .transform((value) => value || undefined),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECURE: z.stringbool().default(false),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  MAIL_FROM: z.string().min(1),
  UPLOADS_DIR: z.string().min(1),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  RATE_LIMIT_GLOBAL_PER_MIN: z.coerce.number().int().positive(),
  RATE_LIMIT_AUTH_PER_MIN: z.coerce.number().int().positive(),
});

export type Config = z.infer<typeof envSchema>;

function loadEnvFile(): void {
  const file = resolve(SERVER_ROOT, process.env.NODE_ENV === 'test' ? '.env.test' : '../../.env');
  if (existsSync(file)) process.loadEnvFile(file);
}

/** Reads and validates the environment once; a missing or invalid variable stops the server. */
function loadConfig(): Config {
  loadEnvFile();
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid server configuration:\n${problems.join('\n')}`);
  }
  return result.data;
}

export const config = loadConfig();

export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';
export const UPLOADS_PATH = resolve(SERVER_ROOT, config.UPLOADS_DIR);
