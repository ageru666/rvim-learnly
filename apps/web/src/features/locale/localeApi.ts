import type { Locale } from '@learnly/contracts/enums';
import { meSchema, type Me } from '@learnly/contracts/me';
import type { Messages } from '@learnly/i18n/keys';
import { transportError } from '../../shared/api/apiError';
import { baseApi } from '../../shared/api/baseApi';

export const localeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The account language: emails and other devices follow it (FR-I18N-3). */
    saveLocale: build.mutation<Me, Locale>({
      query: (locale) => ({ url: '/me', method: 'PATCH', body: { locale } }),
      transformResponse: (response: unknown) => meSchema.parse(response),
      invalidatesTags: ['Me'],
    }),
    /** The English dictionary is a chunk of its own, downloaded only when English is used. */
    getEnglishDictionary: build.query<Messages, void>({
      queryFn: async () => {
        try {
          return { data: (await import('@learnly/i18n/messages/en')).en };
        } catch {
          return { error: transportError('NETWORK') };
        }
      },
    }),
  }),
});

export const { useGetEnglishDictionaryQuery } = localeApi;
