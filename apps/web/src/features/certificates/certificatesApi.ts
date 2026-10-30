import { certificateSchema, type CertificateDto } from '@learnly/contracts/certificates';
import { z } from 'zod';
import { transportError } from '../../shared/api/apiError';
import { baseApi } from '../../shared/api/baseApi';

const certificatesSchema = z.array(certificateSchema);

const certificatesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyCertificates: build.query<CertificateDto[], void>({
      query: () => '/me/certificates',
      transformResponse: (response: unknown) => certificatesSchema.parse(response),
      providesTags: ['Certificates'],
    }),
    /** The clipboard is a browser API, so it goes through the API layer like other I/O. */
    copyLink: build.mutation<null, string>({
      queryFn: async (text) => {
        try {
          await navigator.clipboard.writeText(text);
          return { data: null };
        } catch {
          return { error: transportError('CLIPBOARD') };
        }
      },
    }),
  }),
});

export const { useGetMyCertificatesQuery, useCopyLinkMutation } = certificatesApi;
