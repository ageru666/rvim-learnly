import type { Locale } from '@learnly/contracts/enums';
import type { MessageArgs, MessageKey, Messages, ParamValue } from './keys.js';

export type LooseParams = Readonly<Record<string, ParamValue>>;

export interface Translator {
  readonly locale: Locale;
  readonly messages: Messages;
  /** Strictly typed: the key must exist and every placeholder must be provided. */
  readonly t: <K extends MessageKey>(key: K, ...args: MessageArgs<K>) => string;
  /** For keys computed at runtime (e.g. `notifications.${type}`); params are not checked. */
  readonly translate: (key: MessageKey, params?: LooseParams) => string;
  readonly has: (key: string) => key is MessageKey;
}

export interface TranslatorOptions {
  /** Dictionary used when a key is missing (normally Ukrainian). */
  fallback?: Messages;
  onMissing?: (key: string, locale: Locale) => void;
}

type Tree = Readonly<{ [key: string]: string | Tree }>;

function lookup(tree: Tree, key: string): string | undefined {
  let node: string | Tree | undefined = tree;
  for (const segment of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

function findClosingBrace(text: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

const PLURAL_PATTERN = /^\s*(\w+)\s*,\s*plural\s*,([\s\S]*)$/;
const BRANCH_START = /^\s*\w+\s*\{/;

/** Parses `one {...} few {...} other {...}`; the source is already brace-balanced. */
function parseBranches(source: string): Map<string, string> {
  const branches = new Map<string, string>();
  let rest = source;
  let start = BRANCH_START.exec(rest);
  while (start) {
    const open = start[0].length - 1;
    const close = findClosingBrace(rest, open);
    branches.set(start[0].slice(0, -1).trim(), rest.slice(open + 1, close));
    rest = rest.slice(close + 1);
    start = BRANCH_START.exec(rest);
  }
  return branches;
}

function formatNumberValue(value: ParamValue, locale: Locale): string {
  return typeof value === 'number' ? new Intl.NumberFormat(locale).format(value) : value;
}

function renderPlural(name: string, branchSource: string, params: LooseParams, locale: Locale) {
  const raw = params[name];
  const count = typeof raw === 'number' ? raw : Number(raw);
  const branches = parseBranches(branchSource);
  const category = new Intl.PluralRules(locale).select(count);
  const branch = branches.get(category) ?? branches.get('other') ?? '';
  const withCount = branch.replaceAll('#', new Intl.NumberFormat(locale).format(count));
  return formatMessage(withCount, params, locale);
}

function renderPlaceholder(body: string, params: LooseParams, locale: Locale): string {
  const plural = PLURAL_PATTERN.exec(body);
  if (plural?.[1] && plural[2] !== undefined) {
    return renderPlural(plural[1], plural[2], params, locale);
  }
  const name = body.trim();
  const value = params[name];
  return value === undefined ? `{${name}}` : formatNumberValue(value, locale);
}

/** Interpolates `{name}` and ICU-lite `{count, plural, one {...} other {...}}` messages. */
export function formatMessage(template: string, params: LooseParams, locale: Locale): string {
  let output = '';
  let index = 0;
  while (index < template.length) {
    const open = template.indexOf('{', index);
    if (open === -1) return output + template.slice(index);
    const close = findClosingBrace(template, open);
    if (close === -1) return output + template.slice(index);
    output += template.slice(index, open) + renderPlaceholder(template.slice(open + 1, close), params, locale);
    index = close + 1;
  }
  return output;
}

export function createTranslator(
  locale: Locale,
  messages: Messages,
  options: TranslatorOptions = {},
): Translator {
  const resolve = (key: string): string => {
    const own = lookup(messages, key);
    if (own !== undefined) return own;
    options.onMissing?.(key, locale);
    return (options.fallback && lookup(options.fallback, key)) ?? key;
  };

  const translate = (key: MessageKey, params: LooseParams = {}): string =>
    formatMessage(resolve(key), params, locale);

  return {
    locale,
    messages,
    t: (key, ...args) => translate(key, args[0]),
    translate,
    has: (key: string): key is MessageKey => lookup(messages, key) !== undefined,
  };
}
