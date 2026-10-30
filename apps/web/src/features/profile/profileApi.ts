import { meSchema, type Me, type UpdateMeInput } from '@learnly/contracts/me';
import { baseApi } from '../../shared/api/baseApi';

const parseMe = (response: unknown): Me => meSchema.parse(response);

/** FR-PROFILE-1–2. Every change refreshes `Me`, so the header and the menus show it at once. */
const profileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    updateProfile: build.mutation<Me, Omit<UpdateMeInput, 'locale'>>({
      query: (body) => ({ url: '/me', method: 'PATCH', body }),
      transformResponse: parseMe,
      invalidatesTags: ['Me'],
    }),
    uploadAvatar: build.mutation<Me, File>({
      query: (file) => {
        const body = new FormData();
        body.append('file', file);
        return { url: '/me/avatar', method: 'POST', body };
      },
      transformResponse: parseMe,
      invalidatesTags: ['Me'],
    }),
    removeAvatar: build.mutation<Me, void>({
      query: () => ({ url: '/me/avatar', method: 'DELETE' }),
      transformResponse: parseMe,
      invalidatesTags: ['Me'],
    }),
  }),
});

export const { useUpdateProfileMutation, useUploadAvatarMutation, useRemoveAvatarMutation } = profileApi;
