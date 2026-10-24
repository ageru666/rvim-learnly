import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { clearPersonalStorage, StorageUnavailableError } from './browserStorage';

export type StorageError = { code: 'STORAGE_UNAVAILABLE' } | { code: 'STORAGE_FAILED' };

/** Wraps a synchronous storage operation into a `queryFn` result. */
export function storageResult<T>(operation: () => T): { data: T } | { error: StorageError } {
  try {
    return { data: operation() };
  } catch (error) {
    return {
      error: { code: error instanceof StorageUnavailableError ? 'STORAGE_UNAVAILABLE' : 'STORAGE_FAILED' },
    };
  }
}

/**
 * localStorage behind RTK Query (guideline §1.1). Features inject their own endpoints with their
 * value schemas (notes, drafts, quiz progress, wiki cache) through `storageApi.injectEndpoints`.
 */
export const storageApi = createApi({
  reducerPath: 'storageApi',
  baseQuery: fakeBaseQuery<StorageError>(),
  tagTypes: ['Stored'],
  endpoints: (build) => ({
    clearPersonalData: build.mutation<null, void>({
      queryFn: () => storageResult(() => {
        clearPersonalStorage();
        return null;
      }),
      invalidatesTags: ['Stored'],
    }),
  }),
});
