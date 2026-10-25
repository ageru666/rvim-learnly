import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common.js';
import { CERTIFICATE_CODE_ALPHABET, CERTIFICATE_CODE_LENGTH } from './limits.js';

/** FR-CERT-1: 10 characters without look-alikes (0/O, 1/I/L). */
export const CERTIFICATE_CODE_PATTERN = new RegExp(`^[${CERTIFICATE_CODE_ALPHABET}]{${CERTIFICATE_CODE_LENGTH}}$`);

export const certificateCodeSchema = z.string().toUpperCase().regex(CERTIFICATE_CODE_PATTERN);

export const certificateSchema = z.object({
  code: z.string(),
  /** Names as they were when the certificate was issued (FR-CERT-3). */
  courseTitle: z.string(),
  studentName: z.string(),
  authorName: z.string(),
  issuedAt: dateTimeSchema,
  revoked: z.boolean(),
  /** The public verification page. */
  url: z.url(),
  courseId: idSchema,
  courseSlug: z.string(),
});
export type CertificateDto = z.infer<typeof certificateSchema>;
