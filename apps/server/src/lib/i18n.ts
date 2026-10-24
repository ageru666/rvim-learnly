import type { Locale } from '@learnly/contracts/enums';
import { en } from '@learnly/i18n/messages/en';
import { uk } from '@learnly/i18n/messages/uk';
import { createTranslator, type Translator } from '@learnly/i18n/translator';
import { isTest } from '../config/env.js';
import { logger } from './logger.js';

function reportMissing(key: string, locale: Locale): void {
  // In tests a missing key fails the test, so gaps are caught before release (FR-055).
  if (isTest) throw new Error(`Missing translation "${key}" for locale "${locale}"`);
  logger.warn({ key, locale }, 'missing translation');
}

const translators: Record<Locale, Translator> = {
  uk: createTranslator('uk', uk, { onMissing: reportMissing }),
  en: createTranslator('en', en, { fallback: uk, onMissing: reportMissing }),
};

export function translatorFor(locale: Locale): Translator {
  return translators[locale];
}
