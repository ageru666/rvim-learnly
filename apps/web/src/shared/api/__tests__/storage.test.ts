import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  clearPersonalStorage,
  readCookie,
  readStored,
  removeStored,
  writePreferenceCookie,
  writeStored,
} from '../browserStorage';
import { storageApi, storageResult } from '../storageApi';

describe('browser storage', () => {
  it('round-trips validated values', () => {
    writeStored('ui', { width: 320 });
    expect(readStored('ui', z.object({ width: z.number() }))).toEqual({ width: 320 });
    removeStored('ui');
    expect(readStored('ui', z.object({ width: z.number() }))).toBeNull();
  });

  it('drops corrupted and outdated values', () => {
    window.localStorage.setItem('learnly:v1:notes:1', '{not json');
    expect(readStored('notes:1', z.object({}))).toBeNull();
    expect(window.localStorage.getItem('learnly:v1:notes:1')).toBeNull();

    writeStored('theme', 42);
    expect(readStored('theme', z.string())).toBeNull();
  });

  it('clears personal data but keeps device preferences', () => {
    writeStored('theme', 'dark');
    writeStored('locale', 'en');
    writeStored('notes:course-1', {});
    writeStored('quiz:quiz-1', {});
    window.localStorage.setItem('other-app', 'keep');
    clearPersonalStorage();
    expect(readStored('theme', z.string())).toBe('dark');
    expect(readStored('locale', z.string())).toBe('en');
    expect(window.localStorage.getItem('learnly:v1:notes:course-1')).toBeNull();
    expect(window.localStorage.getItem('learnly:v1:quiz:quiz-1')).toBeNull();
    expect(window.localStorage.getItem('other-app')).toBe('keep');
  });

  it('reads and writes preference cookies', () => {
    expect(readCookie('locale')).toBeNull();
    writePreferenceCookie('locale', 'en');
    expect(readCookie('locale')).toBe('en');
  });
});

describe('storageApi', () => {
  it('reports unavailable storage as a typed error', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(storageResult(() => readStored('theme', z.string()))).toEqual({ error: { code: 'STORAGE_UNAVAILABLE' } });
    expect(storageResult(() => {
      throw new Error('quota');
    })).toEqual({ error: { code: 'STORAGE_FAILED' } });
  });

  it('clears personal data through a mutation', async () => {
    writeStored('draft:lesson:1', {});
    const store = configureStore({
      reducer: { [storageApi.reducerPath]: storageApi.reducer },
      middleware: (getDefault) => getDefault().concat(storageApi.middleware),
    });
    await store.dispatch(storageApi.endpoints.clearPersonalData.initiate());
    expect(window.localStorage.getItem('learnly:v1:draft:lesson:1')).toBeNull();
  });
});
