import type { CategorySeed } from '../types.js';

export const CATEGORIES: CategorySeed[] = [
  { key: 'programming', nameUk: 'Програмування', nameEn: 'Programming', accent: 'blue' },
  { key: 'design', nameUk: 'Дизайн', nameEn: 'Design', accent: 'pink' },
  { key: 'data-science', nameUk: 'Аналіз даних', nameEn: 'Data Science', accent: 'indigo' },
  { key: 'marketing', nameUk: 'Маркетинг', nameEn: 'Marketing', accent: 'yellow' },
  { key: 'languages', nameUk: 'Мови', nameEn: 'Languages', accent: 'green' },
  {
    key: 'productivity',
    nameUk: 'Особиста ефективність',
    nameEn: 'Personal productivity',
    accent: 'cyan',
  },
];
