import type { Locale } from '@learnly/contracts/enums';
import type { Messages } from '@learnly/i18n/keys';
import { en } from '@learnly/i18n/messages/en';
import { uk } from '@learnly/i18n/messages/uk';
import { createTranslator, type Translator } from '@learnly/i18n/translator';
import { useSelector } from 'react-redux';
import { logFailure } from '../../shared/utils/logger';
import { selectLocale } from './localeSlice';

const DICTIONARIES: Record<Locale, Messages> = { uk, en };

function reportMissing(key: string, locale: Locale): void {
  logFailure('translation lookup', { key, locale });
}

/** Translators are created once per locale; both dictionaries are small and bundled. */
const TRANSLATORS: Record<Locale, Translator> = {
  uk: createTranslator('uk', DICTIONARIES.uk, { onMissing: reportMissing }),
  en: createTranslator('en', DICTIONARIES.en, { fallback: uk, onMissing: reportMissing }),
};

export function translatorFor(locale: Locale): Translator {
  return TRANSLATORS[locale];
}

/** The translator for the active locale; re-renders the component when the language changes. */
export function useT(): Translator {
  return translatorFor(useSelector(selectLocale));
}
