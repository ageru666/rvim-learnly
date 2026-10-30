import { en } from '../../../../packages/i18n/src/messages/en';
import { uk } from '../../../../packages/i18n/src/messages/uk';
import { createTranslator, type Translator } from '../../../../packages/i18n/src/translator';
import type { TestInfo } from '@playwright/test';

const translators = { uk: createTranslator('uk', uk), en: createTranslator('en', en, { fallback: uk }) };

/** The dictionary of the project's browser language, so selectors read like the UI in both languages. */
export function translatorFor(testInfo: TestInfo): Translator {
  return testInfo.project.name === 'en' ? translators.en : translators.uk;
}

/** The dictionary of one language, for scenarios that switch it themselves. */
export const translatorOf = (locale: keyof typeof translators): Translator => translators[locale];

export const DEMO_PASSWORD = 'Learnly2026!';

export const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;
