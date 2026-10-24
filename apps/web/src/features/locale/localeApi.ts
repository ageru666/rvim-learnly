import type { Locale } from '@learnly/contracts/enums';
import { meSchema, type Me } from '@learnly/contracts/me';
import { baseApi } from '../../shared/api/baseApi';

export const localeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The account language: emails and other devices follow it (FR-I18N-3). */
    saveLocale: build.mutation<Me, Locale>({
      query: (locale) => ({ url: '/me', method: 'PATCH', body: { locale } }),
      transformResponse: (response: unknown) => meSchema.parse(response),
      invalidatesTags: ['Me'],
    }),
  }),
});
