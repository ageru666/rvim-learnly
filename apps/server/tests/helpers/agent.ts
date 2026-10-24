import type { Express } from 'express';
import request from 'supertest';
import { createApp, type AppOptions } from '../../src/app.js';

export function testApp(options?: AppOptions): Express {
  return createApp(options);
}

/** Cookie-keeping agent with a valid CSRF token for state-changing requests. */
export async function browserAgent(app: Express) {
  const agent = request.agent(app);
  const response = await agent.get('/health');
  const cookies = response.headers['set-cookie'];
  const list = Array.isArray(cookies) ? cookies : [];
  const csrfCookie = list.find((cookie) => cookie.startsWith('csrf_token='));
  const csrfToken = csrfCookie?.split(';')[0]?.split('=')[1] ?? '';
  return { agent, csrfToken };
}
