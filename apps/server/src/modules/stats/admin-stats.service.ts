import type { AdminStats } from '@learnly/contracts/admin';
import type { Locale } from '@learnly/contracts/enums';
import { db } from '../../lib/db.js';
import { loadCourseCards } from '../catalog/course-card.js';
import { recentAudit } from '../admin/audit-log.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_DAYS = 30;
const RECENT_DAYS = 7;
const TOP_COURSES = 5;
const RECENT_AUDIT = 8;

interface DailyRow {
  day: string;
  count: number;
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Counts per UTC day for the last 30 days, with missing days filled with zeros. */
async function dailyCounts(table: 'users' | 'enrollments', column: 'created_at' | 'enrolled_at', since: Date): Promise<Map<string, number>> {
  const rows = await db.$queryRawUnsafe<DailyRow[]>(
    `SELECT to_char(date_trunc('day', ${column} AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
     FROM ${table} WHERE ${column} >= $1 GROUP BY 1`,
    since,
  );
  return new Map(rows.map((row) => [row.day, row.count]));
}

/** FR-ADMIN-1. */
export async function getAdminStats(locale: Locale): Promise<AdminStats> {
  const now = Date.now();
  const since = startOfDayUtc(new Date(now - (DAILY_DAYS - 1) * DAY_MS));
  const recent = new Date(now - RECENT_DAYS * DAY_MS);
  const [users, users7d, published, pending, applications, enrollments7d, registrations, enrollments, top, audit] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: recent } } }),
    db.course.count({ where: { status: 'published' } }),
    db.course.count({ where: { status: 'pending_review' } }),
    db.instructorApplication.count({ where: { status: 'pending' } }),
    db.enrollment.count({ where: { enrolledAt: { gte: recent } } }),
    dailyCounts('users', 'created_at', since),
    dailyCounts('enrollments', 'enrolled_at', since),
    db.enrollment.groupBy({ by: ['courseId'], _count: { _all: true }, orderBy: { _count: { courseId: 'desc' } }, take: TOP_COURSES }),
    recentAudit(RECENT_AUDIT),
  ]);
  const daily = Array.from({ length: DAILY_DAYS }, (_, index) => {
    const date = new Date(since.getTime() + index * DAY_MS).toISOString().slice(0, 10);
    return { date, registrations: registrations.get(date) ?? 0, enrollments: enrollments.get(date) ?? 0 };
  });
  return {
    cards: { users, users7d, published, pending, applications, enrollments7d },
    daily,
    topCourses: await loadCourseCards(top.map((row) => row.courseId), locale),
    recentAudit: audit,
  };
}
