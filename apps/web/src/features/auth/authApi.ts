import { meSchema, type Me } from '@learnly/contracts/me';
import { baseApi } from '../../shared/api/baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<Me, void>({
      query: () => '/me',
      transformResponse: (response: unknown) => meSchema.parse(response),
      providesTags: ['Me'],
    }),
    logout: build.mutation<null, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const { useGetMeQuery, useLogoutMutation } = authApi;
