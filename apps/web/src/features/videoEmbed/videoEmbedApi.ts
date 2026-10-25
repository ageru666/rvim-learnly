import type { Locale } from '@learnly/contracts/enums';
import { EXTERNAL_API_TIMEOUT_MS } from '@learnly/contracts/limits';
import { createApi, fakeBaseQuery, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { toVideoMeta, type VideoMeta } from './utils';

export type VideoMetaError = { kind: 'not_found' } | { kind: 'unavailable' };

const noembed = fetchBaseQuery({ baseUrl: 'https://noembed.com', timeout: EXTERNAL_API_TIMEOUT_MS });

/** FR-EXT-2: video title, author and thumbnail from noembed. */
export const videoEmbedApi = createApi({
  reducerPath: 'videoEmbedApi',
  baseQuery: fakeBaseQuery<VideoMetaError>(),
  endpoints: (build) => ({
    getVideoMeta: build.query<VideoMeta, { url: string; locale: Locale }>({
      async queryFn({ url, locale }, api, extraOptions) {
        const result = await noembed({ url: '/embed', params: { url } }, api, extraOptions);
        if (result.error) return { error: { kind: 'unavailable' } };
        const meta = toVideoMeta(result.data as Parameters<typeof toVideoMeta>[0], url, locale);
        return meta ? { data: meta } : { error: { kind: 'not_found' } };
      },
    }),
  }),
});

export const { useGetVideoMetaQuery } = videoEmbedApi;
