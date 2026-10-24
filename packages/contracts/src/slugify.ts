import { LIMITS } from './limits.js';

/**
 * Ukrainian transliteration per the 2010 Cabinet of Ministers resolution (KMU No. 55).
 * Letters with two forms use the first one at the start of a word.
 */
const WORD_START: Readonly<Record<string, string>> = {
  є: 'ye',
  ї: 'yi',
  й: 'y',
  ю: 'yu',
  я: 'ya',
};

const LETTERS: Readonly<Record<string, string>> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
  // Letters that do not exist in Ukrainian but appear in mixed input.
  ё: 'io',
  ы: 'y',
  э: 'e',
  ъ: '',
};

const APOSTROPHES = new Set(["'", '’', 'ʼ', '`']);

function isWordStart(previous: string | undefined): boolean {
  if (previous === undefined) return true;
  return !APOSTROPHES.has(previous) && !/\p{L}/u.test(previous);
}

function transliterateChar(char: string, previous: string | undefined): string {
  if (APOSTROPHES.has(char)) return '';
  // "зг" is written "zgh" to keep it distinct from "ж" (zh).
  if (char === 'г' && previous === 'з') return 'gh';
  const atStart = isWordStart(previous) ? WORD_START[char] : undefined;
  return atStart ?? LETTERS[char] ?? char;
}

function transliterate(text: string): string {
  const chars = Array.from(text);
  return chars.map((char, index) => transliterateChar(char, chars[index - 1])).join('');
}

/** Builds a URL slug: transliterated, lowercase, `-` separated, at most `LIMITS.slug.max` characters. */
export function slugify(text: string): string {
  const latin = transliterate(text.toLowerCase())
    .normalize('NFKD')
    .replace(/\p{M}/gu, '');
  return latin
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITS.slug.max)
    .replace(/-+$/, '');
}
