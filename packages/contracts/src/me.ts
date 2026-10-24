import { z } from 'zod';
import { idSchema } from './common.js';
import { localeSchema, roleSchema } from './enums.js';
import { LIMITS } from './limits.js';

export const userLinksSchema = z.object({
  website: z.url().max(LIMITS.link.max).optional(),
  github: z.url().max(LIMITS.link.max).optional(),
  linkedin: z.url().max(LIMITS.link.max).optional(),
});
export type UserLinks = z.infer<typeof userLinksSchema>;

export const userSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  avatarUrl: z.string().nullable(),
});
export type UserSummary = z.infer<typeof userSummarySchema>;

export const meSchema = userSummarySchema.extend({
  email: z.email(),
  emailVerified: z.boolean(),
  role: roleSchema,
  locale: localeSchema,
  bio: z.string().nullable(),
  links: userLinksSchema,
});
export type Me = z.infer<typeof meSchema>;

/** `PATCH /me`. The profile fields (name, bio, links) join with the profile story. */
export const updateMeSchema = z.object({ locale: localeSchema.optional() });
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
