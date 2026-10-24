/** Field limits and business-rule constants. Every validator and service reads them from here. */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MEGABYTE = 1024 * 1024;

export const LIMITS = {
  email: { max: 254 },
  userName: { min: 2, max: 60 },
  password: { min: 8, max: 128 },
  bio: { max: 500 },
  link: { max: 200 },
  categoryName: { min: 2, max: 40 },
  courseTitle: { min: 5, max: 120 },
  courseShortDescription: { max: 200 },
  courseDescription: { max: 10_000 },
  courseListItem: { max: 160 },
  courseListItems: { max: 10 },
  slug: { max: 80 },
  tag: { min: 2, max: 30 },
  tagsPerCourse: { max: 5 },
  moduleTitle: { min: 2, max: 120 },
  lessonTitle: { min: 2, max: 120 },
  lessonContent: { max: 50_000 },
  lessonDuration: { min: 1, max: 600, default: 5 },
  questionText: { min: 1, max: 2000 },
  questionExplanation: { max: 2000 },
  questionPoints: { min: 1, max: 10, default: 1 },
  optionText: { min: 1, max: 500 },
  optionsPerQuestion: { min: 2, max: 8 },
  passScore: { min: 1, max: 100, default: 70 },
  maxAttempts: { min: 1, max: 10 },
  reviewText: { min: 10, max: 2000 },
  reviewReply: { max: 1000 },
  reason: { min: 10, max: 1000 },
  motivation: { min: 50, max: 2000 },
  experience: { max: 2000 },
  noteText: { max: 20_000 },
  pageSize: { default: 20, max: 100 },
} as const;

export const CATALOG_PAGE_SIZE = 12;
export const HOME_BLOCK_SIZE = 6;
export const DASHBOARD_ACTIVE_COURSES = 6;
export const DASHBOARD_NOTIFICATIONS = 5;
export const RECOMMENDATIONS_LIMIT = 4;
export const INSTRUCTOR_TOP_COURSES = 5;
export const WIKI_CACHE_SIZE = 20;
export const NOTIFICATIONS_POLL_MS = MINUTE_MS;
export const DRAFT_AUTOSAVE_MS = 5000;
export const EXTERNAL_API_TIMEOUT_MS = 5000;

/** BR-R1: minimum progress (percent) required to review a course. */
export const REVIEW_MIN_PROGRESS = 30;
/** BR-U1: days to wait after a rejected instructor application. */
export const APPLICATION_RETRY_DAYS = 7;
/** BR-P1: minimum lessons and outcomes for submission. */
export const MIN_COURSE_LESSONS = 3;
export const MIN_COURSE_OUTCOMES = 2;

/** FR-AUTH-2: brute-force protection window. */
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_WINDOW_MS = 15 * MINUTE_MS;
export const LOGIN_ATTEMPTS_RETENTION_MS = DAY_MS;
/** FR-AUTH-3: resend throttle for verification emails. */
export const VERIFY_RESEND_MS = MINUTE_MS;

export const ACCESS_TOKEN_TTL_MS = 15 * MINUTE_MS;
export const REFRESH_TOKEN_TTL_MS = 30 * DAY_MS;
export const PASSWORD_RESET_TTL_MS = HOUR_MS;
export const EMAIL_VERIFY_TTL_MS = DAY_MS;
export const LOCALE_COOKIE_MAX_AGE_MS = 365 * DAY_MS;

export const AVATAR_MAX_BYTES = MEGABYTE;
export const COVER_MAX_BYTES = 2 * MEGABYTE;
export const JSON_BODY_LIMIT = '1mb';

export const CERTIFICATE_CODE_LENGTH = 10;
/** Certificate code alphabet without look-alike characters (0/O, 1/I/L). */
export const CERTIFICATE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
