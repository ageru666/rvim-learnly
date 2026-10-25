import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'vitest';
import { sessionExpired } from '../../../shared/api/session';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { authApi } from '../authApi';

const PERSONAL = ['notes:c1', 'quiz:q1', 'draft:lesson:l1', 'draft:course:c1', 'wiki-cache'];
const DEVICE = ['theme', 'locale', 'ui'];

function fillStorage(): void {
  for (const key of PERSONAL) window.localStorage.setItem(`learnly:v1:${key}`, '"x"');
  window.localStorage.setItem('learnly:v1:theme', '"dark"');
  window.localStorage.setItem('learnly:v1:locale', '"uk"');
  window.localStorage.setItem('learnly:v1:ui', '{}');
}

function storedKeys(): string[] {
  return Object.keys(window.localStorage).map((key) => key.replace('learnly:v1:', '')).sort();
}

const ME = {
  name: 'Олена',
  avatarUrl: null,
  email: 'olena@learnly.local',
  emailVerified: true,
  role: 'student' as const,
  locale: 'uk' as const,
  bio: null,
  links: {},
};

type Store = ReturnType<typeof renderWithStore>['store'];

function createStore(): Store {
  return renderWithStore(createElement(Fragment)).store;
}

function meLoaded(store: Store, id: string): void {
  void store.dispatch(authApi.util.upsertQueryData('getMe', undefined, { ...ME, id }));
}

describe('personal data cleanup', () => {
  it('clears personal keys when the session expires and keeps device preferences', () => {
    const store = createStore();
    fillStorage();
    store.dispatch(sessionExpired());
    expect(storedKeys()).toEqual([...DEVICE].sort());
  });

  it('clears personal keys when a different user signs in on this device', async () => {
    const store = createStore();
    meLoaded(store, '01970000-0000-7000-8000-000000000001');
    await new Promise((resolve) => setTimeout(resolve, 0));
    fillStorage();
    window.localStorage.setItem('learnly:v1:last-user', '"01970000-0000-7000-8000-000000000001"');

    meLoaded(store, '01970000-0000-7000-8000-000000000001');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(storedKeys()).toContain('notes:c1');

    meLoaded(store, '01970000-0000-7000-8000-000000000002');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(storedKeys()).toEqual([...DEVICE, 'last-user'].sort());
    expect(window.localStorage.getItem('learnly:v1:last-user')).toBe('"01970000-0000-7000-8000-000000000002"');
  });
});
