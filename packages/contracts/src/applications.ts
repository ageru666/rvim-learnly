import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common.js';
import { applicationStatusSchema } from './enums.js';
import { LIMITS } from './limits.js';

/** Empty strings from forms mean "no value". */
const optionalText = (max: number) =>
  z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().max(max).optional());

export const applySchema = z.object({
  motivation: z.string().trim().min(LIMITS.motivation.min).max(LIMITS.motivation.max),
  experience: optionalText(LIMITS.experience.max),
});
export type ApplyInput = z.infer<typeof applySchema>;

export const applicationSchema = z.object({
  id: idSchema,
  motivation: z.string(),
  experience: z.string().nullable(),
  status: applicationStatusSchema,
  reviewComment: z.string().nullable(),
  createdAt: dateTimeSchema,
  reviewedAt: dateTimeSchema.nullable(),
});
export type ApplicationDto = z.infer<typeof applicationSchema>;

/** `GET /me/instructor-application`: the latest application and when a new one may be sent (BR-U1). */
export const myApplicationSchema = z.object({
  application: applicationSchema.nullable(),
  /** null: an application can be sent now (or the user is already an instructor). */
  canApplyAt: dateTimeSchema.nullable(),
  canApply: z.boolean(),
});
export type MyApplication = z.infer<typeof myApplicationSchema>;
