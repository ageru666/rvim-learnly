import type { Locale, Role } from '@learnly/contracts/enums';

/** The signed-in user as seen by middleware, services and templates. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: Locale;
  emailVerified: boolean;
  avatarUrl: string | null;
}
