import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { baseApi } from '../baseApi';
import { sessionExpired } from '../session';

const testApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    probe: build.query<{ ok: boolean }, void>({ query: () => '/probe' }),
  }),
});

function makeStore() {
  const actions: string[] = [];
  const recordActions: Middleware = () => (next) => (action) => {
    actions.push((action as { type: string }).type);
    return next(action);
  };
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) =>
      getDefault()
        .concat(baseApi.middleware)
        .concat(recordActions),
  });
  return { store, actions };
}

async function probe() {
  const { store, actions } = makeStore();
  const result = await store.dispatch(testApi.endpoints.probe.initiate());
  return { result, actions };
}

describe('baseQuery', () => {
  it('sends CSRF and language headers', async () => {
    document.cookie = 'csrf_token=abc; path=/';
    document.documentElement.lang = 'en';
    let headers: Headers | undefined;
    server.use(
      http.get('/api/v1/probe', ({ request }) => {
        headers = request.headers;
        return HttpResponse.json({ ok: true });
      }),
    );
    const { result } = await probe();
    expect(result.data).toEqual({ ok: true });
    expect(headers?.get('x-csrf-token')).toBe('abc');
    expect(headers?.get('accept-language')).toBe('en');
  });

  it('normalizes server errors', async () => {
    server.use(
      http.get('/api/v1/probe', () =>
        HttpResponse.json({ error: { code: 'FORBIDDEN', message: 'Заборонено' } }, { status: 403 }),
      ),
    );
    const { result } = await probe();
    expect(result.error).toMatchObject({ code: 'FORBIDDEN', message: 'Заборонено', retryable: false });
  });

  it('normalizes network failures as transient', async () => {
    server.use(http.get('/api/v1/probe', () => HttpResponse.error()));
    const { result } = await probe();
    expect(result.error).toMatchObject({ code: 'NETWORK', retryable: true });
  });

  it('refreshes the session once and retries', async () => {
    let calls = 0;
    server.use(
      http.get('/api/v1/probe', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'x' } }, { status: 401 })
          : HttpResponse.json({ ok: true });
      }),
      http.post('/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: 'a', refreshToken: 'b' })),
    );
    const { result } = await probe();
    expect(result.data).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('reports an expired session when refreshing fails', async () => {
    const unauthorized = () => HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'x' } }, { status: 401 });
    server.use(http.get('/api/v1/probe', unauthorized), http.post('/api/v1/auth/refresh', unauthorized));
    const { result, actions } = await probe();
    expect(result.error).toMatchObject({ code: 'UNAUTHORIZED' });
    expect(actions).toContain(sessionExpired.type);
  });
});
