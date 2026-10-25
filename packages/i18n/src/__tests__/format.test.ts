import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelative,
} from '../format.js';

const DATE = '2026-10-24T09:30:00.000Z';

describe('formatDate', () => {
  it('formats in the display time zone per locale', () => {
    expect(formatDate('en', DATE)).toBe('Oct 24, 2026');
    expect(formatDate('en', DATE, 'long')).toBe('October 24, 2026');
    expect(formatDate('en', DATE, 'dateTime')).toBe('Oct 24, 2026, 12:30 PM');
    expect(formatDate('en', DATE, 'time')).toBe('12:30 PM');
    expect(formatDate('uk', DATE, 'time')).toBe('12:30');
    expect(formatDate('uk', new Date(DATE), 'long')).toBe('24 жовтня 2026 р.');
  });
});

describe('formatNumber and formatPercent', () => {
  it('uses locale separators', () => {
    expect(formatNumber('en', 1234.5)).toBe('1,234.5');
    expect(formatNumber('uk', 1234.5)).toBe('1 234,5');
    expect(formatPercent('en', 42)).toBe('42%');
    expect(formatPercent('uk', 100)).toBe('100%');
  });
});

describe('formatDuration', () => {
  it('formats minutes, hours and both', () => {
    expect(formatDuration('en', 45)).toBe('45 min');
    expect(formatDuration('en', 120)).toBe('2 hr');
    expect(formatDuration('en', 90)).toBe('1 hr 30 min');
    expect(formatDuration('uk', 90)).toBe('1 год 30 хв');
  });
});

describe('formatRelative', () => {
  const now = new Date(DATE);

  it('picks a suitable unit', () => {
    expect(formatRelative('en', new Date(now.getTime() - 30_000), now)).toBe('30 seconds ago');
    expect(formatRelative('en', new Date(now.getTime() - 5 * 60_000), now)).toBe('5 minutes ago');
    expect(formatRelative('en', new Date(now.getTime() + 2 * 86_400_000), now)).toBe('in 2 days');
    expect(formatRelative('uk', new Date(now.getTime() - 3 * 3_600_000), now)).toBe('3 години тому');
  });
});
