import type { Locale } from '@learnly/contracts/enums';
import { WIKI_CACHE_SIZE } from '@learnly/contracts/limits';

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;
const MAX_WORDS = 5;
const EXTRACT_LENGTH = 600;
const EDGES = /^[\s\p{P}]+|[\s\p{P}]+$/gu;

export interface WikiSummary {
  lang: Locale;
  title: string;
  extract: string;
  thumbnailUrl: string | null;
  pageUrl: string;
  /** A disambiguation page: the article itself would only list meanings. */
  ambiguous: boolean;
}

export interface WikiCacheEntry {
  key: string;
  summary: WikiSummary;
  savedAt: string;
}

/** A lookup term: 2–80 characters, at most 5 words, without spaces or punctuation at the edges. */
export function normalizeSelection(text: string): string | null {
  const term = text.replace(EDGES, '').replace(/\s+/g, ' ');
  if (term.length < MIN_LENGTH || term.length > MAX_LENGTH) return null;
  return term.split(' ').length <= MAX_WORDS ? term : null;
}

/** The interface language first, then the other one (FR-LEARN-7). */
export function wikiLanguageOrder(locale: Locale): [Locale, Locale] {
  return locale === 'uk' ? ['uk', 'en'] : ['en', 'uk'];
}

interface RawSummary {
  type?: string;
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

function cut(text: string): string {
  return text.length > EXTRACT_LENGTH ? `${text.slice(0, EXTRACT_LENGTH - 1).trimEnd()}…` : text;
}

export function toWikiSummary(raw: RawSummary, lang: Locale, term: string): WikiSummary {
  return {
    lang,
    title: raw.title ?? term,
    extract: cut(raw.extract ?? ''),
    thumbnailUrl: raw.thumbnail?.source ?? null,
    pageUrl: raw.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(term)}`,
    ambiguous: raw.type === 'disambiguation',
  };
}

export function cacheKey(lang: Locale, term: string): string {
  return `${lang}:${term.toLocaleLowerCase()}`;
}

/** The newest entry first; a repeated key moves to the front; at most 20 entries are kept. */
export function lruInsert(entries: readonly WikiCacheEntry[], entry: WikiCacheEntry, max = WIKI_CACHE_SIZE): WikiCacheEntry[] {
  return [entry, ...entries.filter((item) => item.key !== entry.key)].slice(0, max);
}
