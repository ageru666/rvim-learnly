import type { Locale, Role } from '@learnly/contracts/enums';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { hashPassword } from '../../src/lib/passwords.js';
import type { AuthorKey } from './types.js';
import { daysAgo } from './random.js';

export const DEMO_PASSWORD = 'Learnly2026!';
const STUDENT_COUNT = 15;
const UNVERIFIED_STUDENT = 15;
const ENGLISH_STUDENTS = new Set([2, 3]);

interface UserSeed {
  email: string;
  name: string;
  role: Role;
  locale: Locale;
  verified: boolean;
  bio?: string;
}

const STAFF: (UserSeed & { key: AuthorKey | 'admin' })[] = [
  {
    key: 'admin',
    email: 'admin@learnly.local',
    name: 'Адміністратор Learnly',
    role: 'admin',
    locale: 'uk',
    verified: true,
  },
  {
    key: 'olena',
    email: 'olena.teacher@learnly.local',
    name: 'Олена Коваль',
    role: 'instructor',
    locale: 'uk',
    verified: true,
    bio: 'Frontend-розробниця з 8-річним досвідом. Викладаю JavaScript і продуктивність.',
  },
  {
    key: 'taras',
    email: 'taras.teacher@learnly.local',
    name: 'Тарас Мельник',
    role: 'instructor',
    locale: 'uk',
    verified: true,
    bio: 'Аналітик даних і маркетолог. Люблю, коли цифри пояснюють рішення.',
  },
  {
    key: 'iryna',
    email: 'iryna.teacher@learnly.local',
    name: 'Iryna Bondar',
    role: 'instructor',
    locale: 'en',
    verified: true,
    bio: 'Product designer and English teacher for tech teams.',
  },
];

const STUDENT_NAMES = [
  'Андрій Шевчук',
  'Maria Kowalska',
  'John Carter',
  'Оксана Ткаченко',
  'Дмитро Бойко',
  'Юлія Кравець',
  'Максим Олійник',
  'Софія Лисенко',
  'Богдан Савченко',
  'Анна Руденко',
  'Віктор Мороз',
  'Катерина Павленко',
  'Ігор Гончаренко',
  'Наталія Захарченко',
  'Роман Поліщук',
];

function studentSeed(index: number): UserSeed {
  return {
    email: `student${index}@learnly.local`,
    name: STUDENT_NAMES[index - 1] ?? `Student ${index}`,
    role: 'student',
    locale: ENGLISH_STUDENTS.has(index) ? 'en' : 'uk',
    verified: index !== UNVERIFIED_STUDENT,
  };
}

export interface SeededUsers {
  adminId: string;
  authors: Record<AuthorKey, string>;
  /** Student ids in order student1..student15. */
  students: string[];
  names: Map<string, string>;
}

export async function seedUsers(db: PrismaClient): Promise<SeededUsers> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const names = new Map<string, string>();

  async function create(user: UserSeed, createdDaysAgo: number): Promise<string> {
    const created = await db.user.create({
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        locale: user.locale,
        bio: user.bio,
        passwordHash,
        emailVerifiedAt: user.verified ? daysAgo(createdDaysAgo) : null,
        createdAt: daysAgo(createdDaysAgo),
      },
      select: { id: true },
    });
    names.set(created.id, user.name);
    return created.id;
  }

  const staffIds = new Map<string, string>();
  for (const member of STAFF) staffIds.set(member.key, await create(member, 200));

  const students: string[] = [];
  for (let index = 1; index <= STUDENT_COUNT; index += 1) {
    students.push(await create(studentSeed(index), 120 - index * 5));
  }

  const id = (key: string) => staffIds.get(key) ?? '';
  return {
    adminId: id('admin'),
    authors: { olena: id('olena'), taras: id('taras'), iryna: id('iryna') },
    students,
    names,
  };
}
