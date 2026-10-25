import type { AdminCategory, CategoryInput } from '@learnly/contracts/admin';
import { slugify } from '@learnly/contracts/slugify';
import { db } from '../../lib/db.js';
import { conflict, notFound, ruleViolation } from '../../lib/errors.js';
import type { AuthUser } from '../auth/auth.types.js';
import { recordAudit } from './audit.service.js';

const FALLBACK_SLUG = 'category';

export async function listAdminCategories(): Promise<AdminCategory[]> {
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    include: { _count: { select: { courses: true } } },
  });
  return categories.map((category) => ({
    id: category.id,
    nameUk: category.nameUk,
    nameEn: category.nameEn,
    slug: category.slug,
    accent: category.accent,
    sortOrder: category.sortOrder,
    courseCount: category._count.courses,
  }));
}

async function uniqueSlug(nameEn: string, exceptId?: string): Promise<string> {
  const base = slugify(nameEn) || FALLBACK_SLUG;
  let candidate = base;
  for (let suffix = 2; ; suffix += 1) {
    const taken = await db.category.findFirst({ where: { slug: candidate, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
    if (!taken) return candidate;
    candidate = `${base}-${suffix}`;
  }
}

async function assertNamesFree(input: CategoryInput, exceptId?: string): Promise<void> {
  const taken = await db.category.findFirst({
    where: { OR: [{ nameUk: input.nameUk }, { nameEn: input.nameEn }], ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (taken) throw conflict('errors.admin.categoryNameTaken');
}

export async function createCategory(admin: AuthUser, input: CategoryInput): Promise<void> {
  await assertNamesFree(input);
  const slug = await uniqueSlug(input.nameEn);
  await db.$transaction(async (tx) => {
    const category = await tx.category.create({ data: { ...input, slug } });
    await recordAudit(tx, admin.id, 'category.create', { type: 'category', id: category.id }, { nameEn: input.nameEn });
  });
}

export async function updateCategory(admin: AuthUser, categoryId: string, input: CategoryInput): Promise<void> {
  const existing = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!existing) throw notFound();
  await assertNamesFree(input, categoryId);
  await db.$transaction(async (tx) => {
    await tx.category.update({ where: { id: categoryId }, data: input });
    await recordAudit(tx, admin.id, 'category.update', { type: 'category', id: categoryId }, { nameEn: input.nameEn });
  });
}

/** FR-ADMIN-5: a category with courses can only be renamed. */
export async function deleteCategory(admin: AuthUser, categoryId: string): Promise<void> {
  const category = await db.category.findUnique({ where: { id: categoryId }, include: { _count: { select: { courses: true } } } });
  if (!category) throw notFound();
  if (category._count.courses > 0) throw ruleViolation('CATEGORY_IN_USE', 'errors.admin.categoryInUse');
  await db.$transaction(async (tx) => {
    await tx.category.delete({ where: { id: categoryId } });
    await recordAudit(tx, admin.id, 'category.delete', { type: 'category', id: categoryId }, { nameEn: category.nameEn });
  });
}
