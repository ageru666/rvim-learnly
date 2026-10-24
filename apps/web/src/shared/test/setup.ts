import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from 'vitest';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  // A missing translation fails the test (constitution, principle VIII).
  const missingTranslations = vi
    .mocked(console.warn)
    .mock.calls.filter(([message]) => String(message).includes('translation lookup'));
  vi.restoreAllMocks();
  expect(missingTranslations).toEqual([]);
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
  document.cookie.split(';').forEach((cookie) => {
    document.cookie = `${cookie.split('=')[0]?.trim() ?? ''}=; max-age=0; path=/`;
  });
});

afterAll(() => server.close());
