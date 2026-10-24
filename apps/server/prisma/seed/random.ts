import { faker } from '@faker-js/faker';

/** Fixed seed: every `db:reset` produces the same demo data. */
faker.seed(20261024);

export { faker };

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(days: number, base: Date = new Date()): Date {
  return new Date(base.getTime() - days * DAY_MS);
}

export function randomDateBetween(fromDaysAgo: number, toDaysAgo: number): Date {
  return faker.date.between({ from: daysAgo(fromDaysAgo), to: daysAgo(toDaysAgo) });
}
