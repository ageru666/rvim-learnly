import { z } from 'zod';
import { idSchema } from './common.js';
import { localeSchema, roleSchema } from './enums.js';
import { LIMITS } from './limits.js';

export const userNameSchema = z.string().trim().min(LIMITS.userName.min).max(LIMITS.userName.max);

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

export const USER_LINKS = ['website', 'github', 'linkedin'] as const;
export type UserLinkKey = (typeof USER_LINKS)[number];

/** An empty field removes the link; only http(s) addresses are accepted. */
const linkInputSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .url({ protocol: /^https?$/ })
    .trim()
    .max(LIMITS.link.max)
    .optional(),
);

/** FR-PROFILE-1: `PATCH /me`; every field is optional, an empty "About me" clears it. */
export const updateMeSchema = z.object({
  name: userNameSchema.optional(),
  bio: z
    .string()
    .trim()
    .max(LIMITS.bio.max)
    .transform((bio) => (bio === '' ? null : bio))
    .nullable()
    .optional(),
  links: z.object({ website: linkInputSchema, github: linkInputSchema, linkedin: linkInputSchema }).optional(),
  locale: localeSchema.optional(),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
