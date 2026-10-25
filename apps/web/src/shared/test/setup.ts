import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from 'vitest';
import { server } from './server';

/** jsdom has no layout: give elements a viewport-sized box so virtualized lists render their rows. */
const LAYOUT_SIZE = 800;
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { configurable: true, get: () => LAYOUT_SIZE },
  offsetWidth: { configurable: true, get: () => LAYOUT_SIZE },
  clientHeight: { configurable: true, get: () => LAYOUT_SIZE },
  clientWidth: { configurable: true, get: () => LAYOUT_SIZE },
});
HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return DOMRect.fromRect({ width: LAYOUT_SIZE, height: LAYOUT_SIZE });
};

/** Pointer capture and scrolling are missing in jsdom; Radix Select needs them to open. */
Element.prototype.hasPointerCapture = () => false;
Element.prototype.releasePointerCapture = () => undefined;
Element.prototype.scrollIntoView = () => undefined;

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
