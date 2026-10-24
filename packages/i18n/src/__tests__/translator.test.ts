import { describe, expect, it, vi } from 'vitest';
import type { Messages } from '../keys.js';
import { en } from '../messages/en.js';
import { uk } from '../messages/uk.js';
import { createTranslator, formatMessage } from '../translator.js';

describe('createTranslator', () => {
  it('translates plain and interpolated messages', () => {
    const t = createTranslator('en', en).t;
    expect(t('common.actions.save')).toBe('Save');
    expect(t('common.pagination.page', { page: 2, total: 10 })).toBe('Page 2 of 10');
  });

  it.each([
    [1, '1 урок'],
    [2, '2 уроки'],
    [5, '5 уроків'],
    [11, '11 уроків'],
    [21, '21 урок'],
    [22, '22 уроки'],
    [25, '25 уроків'],
    [1.5, '1,5 уроку'],
  ])('uses Ukrainian plural rules for %s', (count, expected) => {
    expect(createTranslator('uk', uk).t('common.counts.lessons', { count })).toBe(expected);
  });

  it('uses English plural rules', () => {
    const { t } = createTranslator('en', en);
    expect(t('common.counts.lessons', { count: 1 })).toBe('1 lesson');
    expect(t('common.counts.lessons', { count: 1200 })).toBe('1,200 lessons');
  });

  it('falls back and reports missing keys', () => {
    const onMissing = vi.fn();
    const partial = { ...en, common: { ...en.common, actions: {} } } as unknown as Messages;
    const translator = createTranslator('en', partial, { fallback: uk, onMissing });
    expect(translator.t('common.actions.save')).toBe('Зберегти');
    expect(onMissing).toHaveBeenCalledWith('common.actions.save', 'en');
  });

  it('returns the key when no dictionary has it', () => {
    const translator = createTranslator('en', {} as Messages);
    expect(translator.translate('common.actions.save')).toBe('common.actions.save');
  });

  it('checks key existence', () => {
    const translator = createTranslator('uk', uk);
    expect(translator.has('common.actions.save')).toBe(true);
    expect(translator.has('common.actions')).toBe(false);
    expect(translator.has('common.actions.save.extra')).toBe(false);
    expect(translator.has('nope')).toBe(false);
    expect(translator.locale).toBe('uk');
    expect(translator.messages).toBe(uk);
  });
});

describe('formatMessage', () => {
  it('keeps unknown placeholders and unmatched braces', () => {
    expect(formatMessage('Hi {name}', {}, 'en')).toBe('Hi {name}');
    expect(formatMessage('Broken {name', { name: 'x' }, 'en')).toBe('Broken {name');
    expect(formatMessage('No placeholders', {}, 'en')).toBe('No placeholders');
  });

  it('formats numbers and strings', () => {
    expect(formatMessage('{n} / {s}', { n: 12345, s: 'abc' }, 'uk')).toBe('12 345 / abc');
  });

  it('uses "other" when a plural category is missing and tolerates bad branches', () => {
    expect(formatMessage('{c, plural, other {# items}}', { c: 1 }, 'en')).toBe('1 items');
    expect(formatMessage('{c, plural, one {x}}', { c: 5 }, 'en')).toBe('');
    expect(formatMessage('{c, plural, one {# a}}', { c: '1' }, 'en')).toBe('1 a');
    expect(formatMessage('{c, plural, one {#', { c: 1 }, 'en')).toBe('{c, plural, one {#');
    expect(formatMessage('{c, plural, one x}', { c: 1 }, 'en')).toBe('');
  });

  it('formats placeholders inside plural branches', () => {
    expect(formatMessage('{c, plural, other {# by {who}}}', { c: 2, who: 'Ann' }, 'en')).toBe(
      '2 by Ann',
    );
  });
});
