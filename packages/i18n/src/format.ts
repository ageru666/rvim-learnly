import type { Locale } from '@learnly/contracts/enums';

/** One display time zone for SSR and the SPA, so the same timestamp renders identically everywhere. */
export const DISPLAY_TIME_ZONE = 'Europe/Kyiv';

export type DateStyle = 'date' | 'long' | 'dateTime' | 'time';

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  date: { dateStyle: 'medium' },
  long: { dateStyle: 'long' },
  dateTime: { dateStyle: 'medium', timeStyle: 'short' },
  time: { timeStyle: 'short' },
};

export function formatDate(locale: Locale, value: Date | string | number, style: DateStyle = 'date') {
  return new Intl.DateTimeFormat(locale, { ...DATE_OPTIONS[style], timeZone: DISPLAY_TIME_ZONE }).format(
    new Date(value),
  );
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** `value` is a percentage (0–100), e.g. course progress. */
export function formatPercent(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
    value / 100,
  );
}

const MINUTES_PER_HOUR = 60;

function formatUnit(locale: Locale, value: number, unit: 'hour' | 'minute'): string {
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short' }).format(value);
}

/** Course and lesson durations, e.g. "1 год 30 хв" / "1 hr 30 min". */
export function formatDuration(locale: Locale, totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return formatUnit(locale, minutes, 'minute');
  if (minutes === 0) return formatUnit(locale, hours, 'hour');
  return `${formatUnit(locale, hours, 'hour')} ${formatUnit(locale, minutes, 'minute')}`;
}

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "5 хвилин тому" / "in 2 days"; `now` is injected to keep the function pure. */
export function formatRelative(locale: Locale, value: Date | string | number, now: Date): string {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const match = RELATIVE_UNITS.find(([, size]) => Math.abs(seconds) >= size);
  if (!match) return formatter.format(seconds, 'second');
  const [unit, size] = match;
  return formatter.format(Math.round(seconds / size), unit);
}
