/**
 * Raw browser storage I/O. Only `queryFn`s of RTK Query endpoints and listener effects call this
 * module (guideline §1.2); components never touch localStorage or cookies directly.
 */
import type { z } from 'zod';

const PREFIX = 'learnly:v1:';
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** Keys that survive logout (theme, language, UI layout); everything else is personal. */
const DEVICE_KEYS = new Set(['theme', 'locale', 'ui', 'last-user']);

export class StorageUnavailableError extends Error {
  constructor() {
    super('localStorage is not available');
    this.name = 'StorageUnavailableError';
  }
}

function storage(): Storage {
  try {
    const { localStorage } = window;
    localStorage.getItem(PREFIX);
    return localStorage;
  } catch {
    throw new StorageUnavailableError();
  }
}

/** Reads and validates a value; a corrupted or outdated value is removed and treated as absent. */
export function readStored<S extends z.ZodType>(key: string, schema: S): z.infer<S> | null {
  const store = storage();
  const raw = store.getItem(PREFIX + key);
  if (raw === null) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // Not JSON: fall through and drop it.
  }
  store.removeItem(PREFIX + key);
  return null;
}

export function writeStored(key: string, value: unknown): void {
  storage().setItem(PREFIX + key, JSON.stringify(value));
}

export function removeStored(key: string): void {
  storage().removeItem(PREFIX + key);
}

/** Removes personal data (notes, drafts, quiz progress, caches) and keeps device preferences. */
export function clearPersonalStorage(): void {
  const store = storage();
  const keys = Array.from({ length: store.length }, (_, index) => store.key(index)).filter(
    (key): key is string => key !== null && key.startsWith(PREFIX),
  );
  for (const key of keys) {
    if (!DEVICE_KEYS.has(key.slice(PREFIX.length))) store.removeItem(key);
  }
}

export function readCookie(name: string): string | null {
  const match = new RegExp(`(?:^|; )${name}=([^;]*)`).exec(document.cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function writePreferenceCookie(name: 'theme' | 'locale', value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
