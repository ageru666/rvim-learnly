import type { Locale } from '@learnly/contracts/enums';
import { EXTERNAL_API_TIMEOUT_MS } from '@learnly/contracts/limits';
import { createApi, fakeBaseQuery, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { z } from 'zod';
import { readStored, writeStored } from '../../shared/api/browserStorage';
import { cacheKey, lruInsert, toWikiSummary, wikiLanguageOrder, type WikiCacheEntry, type WikiSummary } from './utils';

export type WikiError = { kind: 'not_found' } | { kind: 'unavailable' };

const CACHE_KEY = 'wiki-cache';
const NOT_FOUND = 404;

const cacheSchema = z.object({
  entries: z.array(
    z.object({
      key: z.string(),
      savedAt: z.string(),
      summary: z.object({
        lang: z.enum(['uk', 'en']),
        title: z.string(),
        extract: z.string(),
        thumbnailUrl: z.string().nullable(),
        pageUrl: z.string(),
        ambiguous: z.boolean(),
      }),
    }),
  ),
});

/** The cache is a convenience: unavailable or corrupted storage only means a network request. */
function readCache(): WikiCacheEntry[] {
  try {
    return readStored(CACHE_KEY, cacheSchema)?.entries ?? [];
  } catch {
    return [];
  }
}

function writeCache(entries: WikiCacheEntry[]): void {
  try {
    writeStored(CACHE_KEY, { entries });
  } catch {
    // Storage is optional for lookups.
  }
}

const wikipedia = fetchBaseQuery({ timeout: EXTERNAL_API_TIMEOUT_MS });

/** FR-EXT-1: Wikipedia REST, called from the browser (CORS allowed) through its own `createApi`. */
export const wikiApi = createApi({
  reducerPath: 'wikiApi',
  baseQuery: fakeBaseQuery<WikiError>(),
  endpoints: (build) => ({
    getWikiSummary: build.query<WikiSummary, { term: string; locale: Locale }>({
      async queryFn({ term, locale }, api, extraOptions) {
        const languages = wikiLanguageOrder(locale);
        const cached = readCache();
        for (const lang of languages) {
          const hit = cached.find((entry) => entry.key === cacheKey(lang, term));
          if (hit) return { data: hit.summary };
        }
        for (const lang of languages) {
          const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
          const result = await wikipedia(url, api, extraOptions);
          if (result.error?.status === NOT_FOUND) continue;
          if (result.error) return { error: { kind: 'unavailable' } };
          const summary = toWikiSummary(result.data as Parameters<typeof toWikiSummary>[0], lang, term);
          writeCache(lruInsert(cached, { key: cacheKey(lang, term), summary, savedAt: new Date().toISOString() }));
          return { data: summary };
        }
        return { error: { kind: 'not_found' } };
      },
    }),
  }),
});

export const { useGetWikiSummaryQuery } = wikiApi;
