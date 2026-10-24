import { z } from 'zod';
import { LIMITS } from './limits.js';

export const idSchema = z.uuid();
export type Id = z.infer<typeof idSchema>;

export const dateTimeSchema = z.iso.datetime();
export type DateTime = z.infer<typeof dateTimeSchema>;

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSize.max).default(LIMITS.pageSize.default),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
  });
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
