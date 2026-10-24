import type { Express } from 'express';
import request from 'supertest';
import { createApp, type AppOptions } from '../../src/app.js';

export function testApp(options?: AppOptions): Express {
  return createApp(options);
}

const BROWSER_ORIGIN = 'http://localhost:3100';

/** Cookie-keeping agent that behaves like a browser (sends `Origin`) and knows its CSRF token. */
export async function browserAgent(app: Express) {
  const agent = request.agent(app).set('Origin', BROWSER_ORIGIN);
  const response = await agent.get('/health');
  const cookies = response.headers['set-cookie'];
  const list = Array.isArray(cookies) ? cookies : [];
  const csrfCookie = list.find((cookie) => cookie.startsWith('csrf_token='));
  const csrfToken = csrfCookie?.split(';')[0]?.split('=')[1] ?? '';
  return { agent, csrfToken };
}
