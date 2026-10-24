import { db } from '../../lib/db.js';
import type { AuthUser } from './auth.types.js';

/** Loads the user behind a session; blocked or deleted users have no session (BR-E4, FR-AUTH-8). */
export async function findActiveUser(id: string): Promise<AuthUser | null> {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      locale: true,
      status: true,
      emailVerifiedAt: true,
      avatarUrl: true,
    },
  });
  if (!user || user.status !== 'active') return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    locale: user.locale,
    emailVerified: user.emailVerifiedAt !== null,
    avatarUrl: user.avatarUrl,
  };
}
