import type { Page, PageQuery } from '@learnly/contracts/common';

export function toSkipTake({ page, limit }: PageQuery): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function toPage<T>(items: T[], total: number, { page, limit }: PageQuery): Page<T> {
  return { items, page, limit, total };
}
