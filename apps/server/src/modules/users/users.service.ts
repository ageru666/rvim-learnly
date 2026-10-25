import type { Locale } from '@learnly/contracts/enums';
import { userLinksSchema, type Me, type UpdateMeInput } from '@learnly/contracts/me';
import { db } from '../../lib/db.js';
import { conflict, notFound } from '../../lib/errors.js';
import { deleteUpload, saveAvatar } from '../../lib/images.js';
import { hashPassword } from '../../lib/passwords.js';
import { checkPassword, sendVerificationEmail } from '../auth/auth.service.js';
import { revokeAllSessions } from '../auth/session.service.js';

export async function getMe(userId: string): Promise<Me> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound();
  const links = userLinksSchema.safeParse(user.links);
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    role: user.role,
    locale: user.locale,
    bio: user.bio,
    links: links.success ? links.data : {},
  };
}

export async function updateLocale(userId: string, locale: Locale): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { locale } });
}

type ProfileInput = Omit<UpdateMeInput, 'locale'>;

/** FR-PROFILE-1: only the fields present in the request change; `links` replaces all three links. */
export async function updateProfile(userId: string, input: ProfileInput): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.bio === undefined ? {} : { bio: input.bio }),
      ...(input.links === undefined ? {} : { links: userLinksSchema.parse(input.links) }),
    },
  });
}

/** FR-PROFILE-2: the image is checked by its signature, cropped to 256×256 WebP; the old file is removed. */
export async function setAvatar(userId: string, image: Buffer): Promise<Me> {
  const avatarUrl = await saveAvatar(image);
  const previous = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { avatarUrl: true } });
  await db.user.update({ where: { id: userId }, data: { avatarUrl } });
  await deleteUpload(previous.avatarUrl);
  return getMe(userId);
}

/** Without an avatar the initials are shown. */
export async function removeAvatar(userId: string): Promise<Me> {
  const previous = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { avatarUrl: true } });
  await db.user.update({ where: { id: userId }, data: { avatarUrl: null } });
  await deleteUpload(previous.avatarUrl);
  return getMe(userId);
}

/** FR-AUTH-6: other sessions end; the session identified by `keepRefreshToken` stays. */
export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
  keepRefreshToken: string | undefined,
): Promise<void> {
  await checkPassword(userId, input.currentPassword);
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(input.newPassword) } });
  await revokeAllSessions(userId, keepRefreshToken);
}

/** FR-AUTH-7: the address changes only after the link sent to the new address is opened. */
export async function requestEmailChange(
  userId: string,
  input: { currentPassword: string; newEmail: string },
): Promise<void> {
  await checkPassword(userId, input.currentPassword);
  const taken = await db.user.findUnique({ where: { email: input.newEmail }, select: { id: true } });
  if (taken) throw conflict('errors.auth.emailTaken');
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await sendVerificationEmail(user, input.newEmail, 'newEmail');
}
