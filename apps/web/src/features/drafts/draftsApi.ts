import { z } from 'zod';
import { readStored, removeStored, writeStored } from '../../shared/api/browserStorage';
import { storageApi, storageResult } from '../../shared/api/storageApi';

/** `draft:lesson:<id>` and `draft:course:<id>` values (contracts/client-storage-and-external.md). */
const storedDraftSchema = z.object({
  fields: z.unknown(),
  savedAt: z.string(),
  /** `updatedAt` of the server version the draft started from, to detect conflicts. */
  baseUpdatedAt: z.string(),
});
type StoredDraft = z.infer<typeof storedDraftSchema>;

const draftsApi = storageApi.injectEndpoints({
  endpoints: (build) => ({
    getDraft: build.query<StoredDraft | null, string>({
      queryFn: (key) => storageResult(() => readStored(key, storedDraftSchema)),
      providesTags: (_result, _error, key) => [{ type: 'Stored', id: key }],
    }),
    saveDraft: build.mutation<StoredDraft, { key: string; draft: StoredDraft }>({
      queryFn: ({ key, draft }) =>
        storageResult(() => {
          writeStored(key, draft);
          return draft;
        }),
    }),
    clearDraft: build.mutation<null, string>({
      queryFn: (key) =>
        storageResult(() => {
          removeStored(key);
          return null;
        }),
      invalidatesTags: (_result, _error, key) => [{ type: 'Stored', id: key }],
    }),
  }),
});

export const { useGetDraftQuery, useSaveDraftMutation, useClearDraftMutation } = draftsApi;
