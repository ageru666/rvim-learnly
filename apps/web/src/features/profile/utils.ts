import { AVATAR_MAX_BYTES } from '@learnly/contracts/limits';
import { updateMeSchema, userNameSchema, type UserLinkKey, type UserLinks } from '@learnly/contracts/me';
import type { MessageKey } from '@learnly/i18n/keys';

const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** The profile form: the name is required here, the other fields follow `PATCH /me`. */
export const profileFormSchema = updateMeSchema.pick({ bio: true, links: true }).extend({ name: userNameSchema });

/** Form fields are flat (`links.github`); the API expects `{ links: { github } }`. */
export function toProfileValues(entries: Iterable<[string, FormDataEntryValue]>): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const links: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (key.startsWith('links.')) links[key.slice('links.'.length)] = value;
    else values[key] = value;
  }
  return { ...values, links };
}

/** Form defaults: every link has a field, an absent link is an empty one. */
export function linkDefaults(links: UserLinks): Record<UserLinkKey, string> {
  return { website: links.website ?? '', github: links.github ?? '', linkedin: links.linkedin ?? '' };
}

/** Checked before uploading so a wrong file gets an answer at once; the server checks again. */
export function avatarFileProblem(file: { size: number; type: string }): MessageKey | null {
  if (!AVATAR_TYPES.has(file.type)) return 'errors.upload.invalidType';
  if (file.size > AVATAR_MAX_BYTES) return 'errors.upload.tooLarge';
  return null;
}
