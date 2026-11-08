import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/** apps/server, both when running from src/ (tsx) and from dist/ (node). */
export const SERVER_ROOT = resolve(import.meta.dirname, '..', '..');

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url(),
  /** Hosting providers set their own (Render: 10000). */
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.url(),
  SPA_DEV_URL: z
    .union([z.literal(''), z.url()])
    .default('')
    .transform((value) => value || undefined),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECURE: z.stringbool().default(false),
  /** Empty on a public demo server without a mail service: emails are logged as not sent (docs/deployment.md). */
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_FROM: z.string().min(1),
  UPLOADS_DIR: z.string().min(1).default('uploads'),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  RATE_LIMIT_GLOBAL_PER_MIN: z.coerce.number().int().positive(),
  RATE_LIMIT_AUTH_PER_MIN: z.coerce.number().int().positive(),
  /** Reverse proxies in front of the app (Express `trust proxy`), so rate limits see the client IP; 0 locally. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

export type Config = z.infer<typeof envSchema>;

function loadEnvFile(): void {
  const file = resolve(SERVER_ROOT, process.env.NODE_ENV === 'test' ? '.env.test' : '../../.env');
  if (existsSync(file)) process.loadEnvFile(file);
}

/** The public address a hosting provider gives the service, when APP_URL is not set explicitly. */
function hostingUrl(): string | undefined {
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : undefined;
}

/** Reads and validates the environment once; a missing or invalid variable stops the server. */
function loadConfig(): Config {
  loadEnvFile();
  const result = envSchema.safeParse({ ...process.env, APP_URL: process.env.APP_URL || hostingUrl() });
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
