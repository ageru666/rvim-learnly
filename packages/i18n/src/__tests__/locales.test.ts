import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, isLocale, negotiateAcceptLanguage, resolveLocale } from '../locales.js';

describe('isLocale', () => {
  it('accepts only supported locales', () => {
    expect(isLocale('uk')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe('negotiateAcceptLanguage', () => {
  it('respects q-values', () => {
    expect(negotiateAcceptLanguage('de-DE,de;q=0.9,en;q=0.5')).toBe('en');
    expect(negotiateAcceptLanguage('en;q=0.4, uk-UA;q=0.8')).toBe('uk');
  });

  it('ignores zero and malformed weights', () => {
    expect(negotiateAcceptLanguage('en;q=0, uk;q=abc')).toBeNull();
    expect(negotiateAcceptLanguage('uk;level=1')).toBe('uk');
  });

  it('accepts a navigator.languages list', () => {
    expect(negotiateAcceptLanguage(['fr-FR', 'EN-us'])).toBe('en');
  });

  it('returns null when nothing is supported', () => {
    expect(negotiateAcceptLanguage('de,fr')).toBeNull();
    expect(negotiateAcceptLanguage('')).toBeNull();
    expect(negotiateAcceptLanguage(null)).toBeNull();
    expect(negotiateAcceptLanguage(undefined)).toBeNull();
    expect(negotiateAcceptLanguage([''])).toBeNull();
  });
});

describe('resolveLocale', () => {
  it('prefers the query, then the cookie, then the user', () => {
    expect(resolveLocale({ query: 'en', cookie: 'uk', user: 'uk' })).toBe('en');
    expect(resolveLocale({ query: 'xx', cookie: 'en', user: 'uk' })).toBe('en');
    expect(resolveLocale({ cookie: 'zz', user: 'en', acceptLanguage: 'uk' })).toBe('en');
  });

  it('falls back to Accept-Language and then to the default', () => {
    expect(resolveLocale({ acceptLanguage: 'en-GB' })).toBe('en');
    expect(resolveLocale({ acceptLanguage: 'de' })).toBe(DEFAULT_LOCALE);
    expect(resolveLocale({})).toBe('uk');
  });
});
