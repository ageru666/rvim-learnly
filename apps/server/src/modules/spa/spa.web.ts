import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import express, { Router, type Request, type Response } from 'express';
import { config, SERVER_ROOT } from '../../config/env.js';

const SPA_BASE = '/app';
const WEB_DIST = join(SERVER_ROOT, '..', 'web', 'dist');
const INDEX_FILE = join(WEB_DIST, 'index.html');
const ASSETS_MAX_AGE = '1y';

/** The SPA's index.html has one inline script (theme and language before first paint). */
function inlineScriptHashes(html: string): string[] {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  return scripts.map((match) => `'sha256-${createHash('sha256').update(match[1] ?? '').digest('base64')}'`);
}

function withScriptHashes(policy: string, hashes: string[]): string {
  return policy.replace("script-src 'self'", `script-src 'self' ${hashes.join(' ')}`);
}

function loginRedirect(req: Request, res: Response): void {
  res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
}

function productionRouter(): Router {
  const router = Router();
  if (!existsSync(INDEX_FILE)) return router;

  const indexHtml = readFileSync(INDEX_FILE, 'utf8');
  const hashes = inlineScriptHashes(indexHtml);

  router.use(
    `${SPA_BASE}/assets`,
    express.static(join(WEB_DIST, 'assets'), { maxAge: ASSETS_MAX_AGE, immutable: true }),
  );
  router.get([SPA_BASE, `${SPA_BASE}/{*path}`], (req, res) => {
    if (!req.user) {
      loginRedirect(req, res);
      return;
    }
    const policy = res.getHeader('Content-Security-Policy');
    if (typeof policy === 'string') res.setHeader('Content-Security-Policy', withScriptHashes(policy, hashes));
    res.setHeader('Cache-Control', 'private, no-cache');
    res.type('html').send(indexHtml);
  });
  return router;
}

/** In development the SPA is served by Vite; a direct visit to the server is sent there. */
function developmentRouter(devUrl: string): Router {
  const router = Router();
  router.get([SPA_BASE, `${SPA_BASE}/{*path}`], (req, res) => {
    res.redirect(new URL(req.originalUrl, devUrl).toString());
  });
  return router;
}

export const spaRouter = config.SPA_DEV_URL ? developmentRouter(config.SPA_DEV_URL) : productionRouter();
