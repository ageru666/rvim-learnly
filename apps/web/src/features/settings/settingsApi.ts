import { baseApi } from '../../shared/api/baseApi';

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface ChangeEmailRequest {
  currentPassword: string;
  newEmail: string;
}

const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    changePassword: build.mutation<null, ChangePasswordRequest>({
      query: (body) => ({ url: '/me/password', method: 'PUT', body }),
    }),
    requestEmailChange: build.mutation<null, ChangeEmailRequest>({
      query: (body) => ({ url: '/me/email', method: 'POST', body }),
    }),
  }),
});

export const { useChangePasswordMutation, useRequestEmailChangeMutation } = settingsApi;
