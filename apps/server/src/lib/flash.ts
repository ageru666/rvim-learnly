import type { MessageKey } from '@learnly/i18n/keys';
import type { LooseParams } from '@learnly/i18n/translator';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { clearFlashCookie, COOKIES, readCookie, setFlashCookie } from './cookies.js';

export type FlashKind = 'success' | 'error' | 'info';

export interface Flash {
  kind: FlashKind;
  key: MessageKey;
  params?: LooseParams;
}

const storedFlashSchema = z.object({
  kind: z.enum(['success', 'error', 'info']),
  key: z.string(),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

/** One-time message shown on the next page (PRG pattern). Stored as a key, rendered in that page's locale. */
export function setFlash(res: Response, flash: Flash): void {
  setFlashCookie(res, JSON.stringify(flash));
}

export function takeFlash(
  req: Request,
  res: Response,
  isKnownKey: (key: string) => key is MessageKey,
): Flash | null {
  const raw = readCookie(req, COOKIES.flash);
  if (!raw) return null;
  clearFlashCookie(res);
  try {
    const parsed = storedFlashSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || !isKnownKey(parsed.data.key)) return null;
    return { kind: parsed.data.kind, key: parsed.data.key, params: parsed.data.params };
  } catch {
    return null;
  }
}
