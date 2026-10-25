import { EXTERNAL_API_TIMEOUT_MS } from '@learnly/contracts/limits';
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { Mutex } from 'async-mutex';
import { config } from '../config';
import { assertUnreachable } from '../utils/assertUnreachable';
import { logFailure } from '../utils/logger';
import { fromHttpResponse, transportError, type ApiError } from './apiError';
import { readCookie } from './browserStorage';
import { sessionExpired } from './session';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';
const UNAUTHORIZED = 401;
const REFRESH_URL = '/auth/refresh';
const REQUEST_TIMEOUT_MS = 3 * EXTERNAL_API_TIMEOUT_MS;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: config.apiBaseUrl,
  credentials: 'include',
  timeout: REQUEST_TIMEOUT_MS,
  prepareHeaders: (headers) => {
    const csrfToken = readCookie(CSRF_COOKIE);
    if (csrfToken) headers.set(CSRF_HEADER, csrfToken);
    // <html lang> mirrors the active locale (kept in sync by the locale feature).
    headers.set('Accept-Language', document.documentElement.lang);
    return headers;
  },
});

function normalizeError(error: FetchBaseQueryError): ApiError {
  if (typeof error.status === 'number') return fromHttpResponse(error.status, error.data);
  switch (error.status) {
    case 'FETCH_ERROR':
      return transportError('NETWORK');
    case 'TIMEOUT_ERROR':
      return transportError('TIMEOUT');
    case 'PARSING_ERROR':
      return transportError('PARSE', error.originalStatus);
    case 'CUSTOM_ERROR':
      return transportError('PARSE');
    default:
      return assertUnreachable(error);
  }
}

/** One refresh at a time: parallel 401s wait for the same refresh instead of racing. */
const refreshMutex = new Mutex();

async function refreshSession(api: Parameters<BaseQueryFn>[1]): Promise<boolean> {
  if (refreshMutex.isLocked()) {
    await refreshMutex.waitForUnlock();
    return true;
  }
  const release = await refreshMutex.acquire();
  try {
    const result = await rawBaseQuery({ url: REFRESH_URL, method: 'POST' }, api, {});
    return !result.error;
  } finally {
    release();
  }
}

/**
 * Normalizes every failure to `ApiError`, adds CSRF and language headers, and retries once after
 * refreshing an expired session (guideline §3.5).
 */
export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (
  args,
  api,
  extraOptions: object,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const isRefreshCall = typeof args !== 'string' && args.url === REFRESH_URL;
  if (result.error?.status === UNAUTHORIZED && !isRefreshCall) {
    if (await refreshSession(api)) result = await rawBaseQuery(args, api, extraOptions);
    if (result.error?.status === UNAUTHORIZED) api.dispatch(sessionExpired());
  }
  if (!result.error) return { data: result.data, meta: result.meta };

  const error = normalizeError(result.error);
  if (error.code !== 'UNAUTHORIZED') {
    logFailure(`api ${api.endpoint}`, { code: error.code, status: error.status });
  }
  return { error, meta: result.meta };
};

/** Shared API instance; every feature injects its endpoints (`baseApi.injectEndpoints`). */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'Locale', 'Dashboard', 'Enrollments', 'LearnCourse', 'Lesson', 'Quiz', 'QuizAttempts', 'Certificates', 'InstructorReviews', 'TeachCourses', 'CourseEditor', 'Readiness', 'LessonEditor', 'CourseStudents', 'CourseStats', 'Notifications'],
  endpoints: () => ({}),
});
