import { DRAFT_AUTOSAVE_MS } from '@learnly/contracts/limits';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { z } from 'zod';
import { useClearDraftMutation, useGetDraftQuery, useSaveDraftMutation } from './draftsApi';
import { draftResolved, selectDraftResolved } from './draftsSlice';

interface DraftOptions<T> {
  /** Storage key, e.g. `draft:lesson:<id>`. */
  key: string;
  /** `updatedAt` of the loaded server version. */
  baseUpdatedAt: string;
  values: T;
  isDirty: boolean;
  /** Validates stored fields, so an outdated draft shape is ignored. */
  schema: z.ZodType<T>;
}

export interface DraftState<T> {
  /** A local draft newer than the server version, waiting for "Restore" or "Discard". */
  pending: { fields: T; savedAt: string } | null;
  /** The server version changed after the draft was started. */
  conflict: boolean;
  /** When the current changes were last written to this device. */
  savedAt: string | null;
  restore: () => T | null;
  discard: () => void;
  /** After a successful server save the draft is no longer needed. */
  clear: () => void;
}

/**
 * FR-TEACH-4: unsaved editor changes are written to localStorage 5 s after the last change, and a
 * newer local draft is offered for restoring when the editor opens.
 */
export function useDraft<T>({ key, baseUpdatedAt, values, isDirty, schema }: DraftOptions<T>): DraftState<T> {
  const dispatch = useDispatch();
  const resolved = useSelector(selectDraftResolved(key));
  const { data: stored } = useGetDraftQuery(key);
  const [saveDraft, { data: lastSave }] = useSaveDraftMutation();
  const [clearDraft] = useClearDraftMutation();

  const parsed = stored ? schema.safeParse(stored.fields) : null;
  const newer = stored !== undefined && stored !== null && Date.parse(stored.savedAt) > Date.parse(baseUpdatedAt);
  const pending = !resolved && newer && parsed?.success ? { fields: parsed.data, savedAt: stored.savedAt } : null;

  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (!isDirty) return undefined;
    const timer = window.setTimeout(() => {
      void saveDraft({ key, draft: { fields: JSON.parse(serialized) as unknown, savedAt: new Date().toISOString(), baseUpdatedAt } });
    }, DRAFT_AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [serialized, isDirty, key, baseUpdatedAt, saveDraft]);

  const restore = () => {
    dispatch(draftResolved(key));
    return pending?.fields ?? null;
  };

  const discard = () => {
    dispatch(draftResolved(key));
    void clearDraft(key);
  };

  const clear = () => {
    void clearDraft(key);
  };

  return {
    pending,
    conflict: pending !== null && stored?.baseUpdatedAt !== baseUpdatedAt,
    savedAt: lastSave?.savedAt ?? null,
    restore,
    discard,
    clear,
  };
}
