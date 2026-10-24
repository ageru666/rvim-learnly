import { describe, expect, it } from 'vitest';
import { LIMITS } from '../limits.js';
import { slugify } from '../slugify.js';

describe('slugify', () => {
  it.each([
    ['Програмування', 'prohramuvannia'],
    ['Особиста ефективність', 'osobysta-efektyvnist'],
    ['Згорани', 'zghorany'],
    ['Єнакієве', 'yenakiieve'],
    ['Їжакевич', 'yizhakevych'],
    ['Йосипівка', 'yosypivka'],
    ['Юрій', 'yurii'],
    ['Яготин', 'yahotyn'],
    ['Знам’янка', 'znamianka'],
    ['Ґудзик', 'gudzyk'],
    ['Щастя', 'shchastia'],
    ['Intro to SQL', 'intro-to-sql'],
    ['Café crème', 'cafe-creme'],
    ['съёмка эфира', 'siomka-efyra'],
  ])('transliterates %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('collapses separators and trims dashes', () => {
    expect(slugify('  --Hello,   World!!--  ')).toBe('hello-world');
  });

  it('returns an empty string when nothing is left', () => {
    expect(slugify('')).toBe('');
    expect(slugify('🚀✨')).toBe('');
  });

  it('cuts long input without a trailing dash', () => {
    const slug = slugify(`${'a'.repeat(LIMITS.slug.max - 1)} bbb`);
    expect(slug.length).toBeLessThanOrEqual(LIMITS.slug.max);
    expect(slug.endsWith('-')).toBe(false);
  });
});
