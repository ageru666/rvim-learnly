import {
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelative,
  type DateStyle,
} from '@learnly/i18n/format';
import { useSelector } from 'react-redux';
import { selectLocale } from './localeSlice';

/** Locale-bound `Intl` formatters for dates, numbers, percentages and durations. */
export function useFormat() {
  const locale = useSelector(selectLocale);
  return {
    date: (value: Date | string, style?: DateStyle) => formatDate(locale, value, style),
    number: (value: number) => formatNumber(locale, value),
    percent: (value: number) => formatPercent(locale, value),
    duration: (minutes: number) => formatDuration(locale, minutes),
    relative: (value: Date | string, now: Date) => formatRelative(locale, value, now),
  };
}
