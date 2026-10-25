import type { StudentSort } from '@learnly/contracts/instructor';
import type { Locale } from '@learnly/contracts/enums';

/** The CSV link keeps the visible filter and asks for the active interface language. */
export function csvHref(apiBaseUrl: string, courseId: string, options: { search: string; sort: StudentSort; locale: Locale }): string {
  const params = new URLSearchParams({ sort: options.sort, lang: options.locale });
  if (options.search.trim()) params.set('search', options.search.trim());
  return `${apiBaseUrl}/instructor/courses/${courseId}/students.csv?${params.toString()}`;
}
