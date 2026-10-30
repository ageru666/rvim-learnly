import type { Locale } from '@learnly/contracts/enums';
import type { Messages } from '@learnly/i18n/keys';
import { uk } from '@learnly/i18n/messages/uk';
import { createTranslator, type Translator } from '@learnly/i18n/translator';
import { useSelector } from 'react-redux';
import { logFailure } from '../../shared/utils/logger';
import { useGetEnglishDictionaryQuery } from './localeApi';
import { selectLocale } from './localeSlice';

function reportMissing(key: string, locale: Locale): void {
  logFailure('translation lookup', { key, locale });
}

/** Ukrainian is bundled: it is the source dictionary and the fallback for missing English keys. */
const UKRAINIAN = createTranslator('uk', uk, { onMissing: reportMissing });
const english = new WeakMap<Messages, Translator>();

function englishTranslator(messages: Messages): Translator {
  const cached = english.get(messages);
  if (cached) return cached;
  const translator = createTranslator('en', messages, { fallback: uk, onMissing: reportMissing });
  english.set(messages, translator);
  return translator;
}

/**
 * The translator for the active locale; re-renders the component when the language changes. English arrives as
 * its own chunk: until it has loaded, the text stays Ukrainian (index.tsx loads it before the first render).
 */
export function useT(): Translator {
  const locale = useSelector(selectLocale);
  const { data: messages } = useGetEnglishDictionaryQuery(undefined, { skip: locale !== 'en' });
  return locale === 'en' && messages ? englishTranslator(messages) : UKRAINIAN;
}
