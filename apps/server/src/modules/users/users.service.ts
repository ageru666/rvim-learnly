import type { Locale } from '@learnly/contracts/enums';
import { db } from '../../lib/db.js';

export async function updateLocale(userId: string, locale: Locale): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { locale } });
}
