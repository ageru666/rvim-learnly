import {
  ACCENTS,
  APPLICATION_STATUSES,
  AUDIT_ACTIONS,
  COURSE_LEVELS,
  COURSE_STATUSES,
  ENROLLMENT_STATUSES,
  LESSON_TYPES,
  LOCALES,
  NOTIFICATION_TYPES,
  QUESTION_TYPES,
  READINESS_ITEMS,
  REVEAL_ANSWERS,
  REVIEW_STATUSES,
  ROLES,
  THEMES,
  USER_STATUSES,
} from '@learnly/contracts/enums';
import { ERROR_CODES } from '@learnly/contracts/errors';
import { VALIDATION_MESSAGES } from '@learnly/contracts/validation';
import { describe, expect, it } from 'vitest';
import { en } from '../messages/en.js';
import { uk } from '../messages/uk.js';
import { createTranslator } from '../translator.js';

type Tree = { readonly [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = `${prefix}${key}`;
    if (typeof value === 'string') entries.set(path, value);
    else for (const [nested, text] of flatten(value, `${path}.`)) entries.set(nested, text);
  }
  return entries;
}

const ukMessages = flatten(uk);
const enMessages = flatten(en);

function placeholders(message: string): string[] {
  const names = [...message.matchAll(/\{\s*(\w+)\s*(?:,|\})/g)].map((match) => match[1] ?? '');
  return [...new Set(names)].sort();
}

function pluralCategories(message: string): string[] {
  const plural = /\{\s*\w+\s*,\s*plural\s*,([\s\S]*)\}/.exec(message);
  if (!plural?.[1]) return [];
  return [...plural[1].matchAll(/(\w+)\s*\{/g)].map((match) => match[1] ?? '').sort();
}

describe('dictionary parity', () => {
  it('has the same keys in both locales', () => {
    expect([...enMessages.keys()].sort()).toEqual([...ukMessages.keys()].sort());
  });

  it('has the same placeholders for every key', () => {
    for (const [key, ukText] of ukMessages) {
      expect(placeholders(enMessages.get(key) ?? ''), key).toEqual(placeholders(ukText));
    }
  });

  it('defines the plural categories each language needs', () => {
    for (const [key, ukText] of ukMessages) {
      const ukCategories = pluralCategories(ukText);
      if (ukCategories.length === 0) continue;
      expect(ukCategories, key).toEqual(['few', 'many', 'one', 'other']);
      expect(pluralCategories(enMessages.get(key) ?? ''), key).toEqual(['one', 'other']);
    }
  });

  it('has no empty messages', () => {
    for (const [key, text] of [...ukMessages, ...enMessages]) expect(text.trim(), key).not.toBe('');
  });
});

describe('coverage of domain values', () => {
  const translator = createTranslator('uk', uk);
  const required = [
    ...ERROR_CODES.map((code) => `errors.codes.${code}`),
    ...NOTIFICATION_TYPES.map((type) => `notifications.${type}`),
    ...AUDIT_ACTIONS.map((action) => `admin.audit.${action}`),
    ...READINESS_ITEMS.map((item) => `readiness.${item}`),
    ...Object.values(VALIDATION_MESSAGES),
    ...ROLES.map((value) => `enums.role.${value}`),
    ...USER_STATUSES.map((value) => `enums.userStatus.${value}`),
    ...APPLICATION_STATUSES.map((value) => `enums.applicationStatus.${value}`),
    ...COURSE_LEVELS.map((value) => `enums.courseLevel.${value}`),
    ...COURSE_STATUSES.map((value) => `enums.courseStatus.${value}`),
    ...LESSON_TYPES.map((value) => `enums.lessonType.${value}`),
    ...QUESTION_TYPES.map((value) => `enums.questionType.${value}`),
    ...REVEAL_ANSWERS.map((value) => `enums.revealAnswers.${value}`),
    ...ENROLLMENT_STATUSES.map((value) => `enums.enrollmentStatus.${value}`),
    ...REVIEW_STATUSES.map((value) => `enums.reviewStatus.${value}`),
    ...ACCENTS.map((value) => `enums.accent.${value}`),
    ...LOCALES.map((value) => `enums.locale.${value}`),
    ...THEMES.map((value) => `enums.theme.${value}`),
  ];

  it.each(required)('has a message for %s', (key) => {
    expect(translator.has(key)).toBe(true);
  });
});
