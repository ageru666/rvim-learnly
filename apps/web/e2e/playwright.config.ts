import { defineConfig, devices } from '@playwright/test';

const PORT = 3198;
export const BASE_URL = `http://localhost:${PORT}`;

/**
 * End-to-end tests against the real server on a freshly seeded database (`scripts/e2e-server.mjs`) with the
 * built SPA. The `uk` project runs every scenario; the `en` project repeats the language-sensitive ones with an
 * English-preferring browser. Scenarios share one database, so they run one at a time.
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../playwright-report' }]],
  outputDir: '../test-results',
  use: { baseURL: BASE_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'uk', use: { ...devices['Desktop Chrome'], locale: 'uk-UA' } },
    { name: 'en', use: { ...devices['Desktop Chrome'], locale: 'en-GB' }, grep: /@both/ },
  ],
  webServer: {
    command: 'node ../../../scripts/e2e-server.mjs',
    url: `${BASE_URL}/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
  },
});
