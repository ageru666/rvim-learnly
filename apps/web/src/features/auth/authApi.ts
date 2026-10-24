import { VERIFY_RESEND_MS } from '@learnly/contracts/limits';
import { meSchema, type Me } from '@learnly/contracts/me';
import { isApiError } from '../../shared/api/apiError';
import { baseApi } from '../../shared/api/baseApi';
import { resendCooldownStarted } from './authSlice';

/** The server tells how long to wait when the email was sent less than a minute ago. */
function retryAfterMs(failure: unknown): number | null {
  const error = typeof failure === 'object' && failure !== null && 'error' in failure ? failure.error : null;
  return isApiError(error) && error.retryAfterSec ? error.retryAfterSec * 1000 : null;
}

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
    logoutAll: build.mutation<null, void>({
      query: () => ({ url: '/auth/logout-all', method: 'POST' }),
      invalidatesTags: ['Me'],
    }),
    resendVerification: build.mutation<null, void>({
      query: () => ({ url: '/auth/email/resend', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(resendCooldownStarted(Date.now() + VERIFY_RESEND_MS));
        } catch (failure) {
          const wait = retryAfterMs(failure);
          if (wait) dispatch(resendCooldownStarted(Date.now() + wait));
        }
      },
    }),
  }),
});

export const { useGetMeQuery, useLogoutMutation, useLogoutAllMutation, useResendVerificationMutation } = authApi;
