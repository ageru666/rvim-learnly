import { localeSchema, type Locale } from '@learnly/contracts/enums';

export const DEFAULT_LOCALE: Locale = 'uk';

export function isLocale(value: unknown): value is Locale {
  return localeSchema.safeParse(value).success;
}

interface WeightedTag {
  tag: string;
  quality: number;
}

function parseWeightedTag(part: string): WeightedTag {
  const [tag = '', ...params] = part.trim().split(';');
  const qualityParam = params.find((param) => param.trim().startsWith('q='));
  const quality = qualityParam ? Number(qualityParam.trim().slice(2)) : 1;
  return { tag: tag.trim(), quality: Number.isFinite(quality) ? quality : 0 };
}

function primarySubtag(tag: string): string {
  return tag.toLowerCase().replace(/-.*$/, '');
}

/**
 * Picks the first supported locale from an `Accept-Language` header or a `navigator.languages` list,
 * respecting q-values. Returns null when nothing is supported.
 */
export function negotiateAcceptLanguage(
  input: string | readonly string[] | null | undefined,
): Locale | null {
  if (!input) return null;
  const tags =
    typeof input === 'string'
      ? input
          .split(',')
          .map(parseWeightedTag)
          .filter((entry) => entry.quality > 0)
          .sort((a, b) => b.quality - a.quality)
          .map((entry) => entry.tag)
      : input;
  const supported = tags.map(primarySubtag).find(isLocale);
  return supported ?? null;
}

export interface LocaleSources {
  /** `?lang=` query parameter: an explicit choice for this request. */
  query?: unknown;
  /** `locale` cookie: an explicit choice remembered on this device. */
  cookie?: unknown;
  /** The signed-in user's saved locale. */
  user?: unknown;
  /** `Accept-Language` header or `navigator.languages`. */
  acceptLanguage?: string | readonly string[] | null;
}

/** FR-I18N-2 resolution order, shared by the server and the SPA. */
export function resolveLocale(sources: LocaleSources): Locale {
  const explicit = [sources.query, sources.cookie, sources.user].find(isLocale);
  return explicit ?? negotiateAcceptLanguage(sources.acceptLanguage) ?? DEFAULT_LOCALE;
}
