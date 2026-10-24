# Contract: REST API `/api/v1`

Endpoint list and access rules: `docs/tz.md` 8.2. This file fixes request and response shapes.
Notation is TypeScript-like; every schema is implemented with Zod in `packages/contracts` and
appears in OpenAPI (`/api/openapi.json`). `?` = optional field.

## Common types

```ts
type Id = string            // uuid
type DateTime = string      // ISO 8601, UTC
type Locale = 'uk' | 'en'

type Page<T> = { items: T[]; page: number; limit: number; total: number }
type PageQuery = { page?: number /* >=1, default 1 */; limit?: number /* 1..100, default 20 */ }

type ApiError = {
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT'
        | 'BUSINESS_RULE_VIOLATION' | 'RATE_LIMITED' | 'INTERNAL'
    message: string                                   // user-facing text in the request locale
    details?: { path: string; message: string }[]     // for VALIDATION_ERROR, request locale
    rule?: string                                     // for BUSINESS_RULE_VIOLATION, e.g. 'BR-P1'
    unmet?: string[]                                  // unmet readiness checklist item keys
    retryAfterSec?: number                            // for RATE_LIMITED
  }
}

type UserSummary = { id: Id; name: string; avatarUrl: string | null }
type Me = UserSummary & {
  email: string; emailVerified: boolean; role: Role; locale: Locale; bio: string | null
  links: { website?: string; github?: string; linkedin?: string }
}
type CategoryDto = { id: Id; name: string /* in request locale */; slug: string; accent: Accent
                     courseCount: number }
type CourseCard = {
  id: Id; slug: string; title: string; shortDescription: string; coverUrl: string | null
  level: CourseLevel; language: Locale; category: { name: string; slug: string; accent: Accent }
  author: UserSummary; lessonCount: number; totalMinutes: number
  rating: { avg: number | null; count: number }; studentCount: number
}
```

### Headers and conventions

- Authentication: `Authorization: Bearer <access>` or cookies. When both are present, Bearer wins
  and the CSRF check is skipped. State-changing browser requests (they carry `Origin` or
  `Sec-Fetch-Site`) require `X-CSRF-Token`; non-browser clients such as Postman are not checked. Cookies `access_token` and `refresh_token`: httpOnly, SameSite=Lax, path `/`.
- Locale: the request locale is resolved as `?lang` → `locale` cookie → user's `locale` →
  `Accept-Language` → `uk`. It selects the language of `message`, `details[].message`, category
  names and CSV headers. Responses carry `Content-Language`. Error `code`s, `rule`s and `unmet` keys
  never change with the locale.
- Every response carries `X-Request-Id`.
- The SPA reads list endpoints (course students, notifications, instructor reviews) through RTK
  Query `infiniteQuery` over the same page-based pagination and renders them as virtualized lists
  (guideline §4.2). The page response format does not change.
- Client-side error normalization in the SPA adds `retryable: boolean`: `true` for network failures,
  timeouts, 5xx and `RATE_LIMITED`, `false` for other 4xx.

## Auth

| Request | Body | Response |
|---|---|---|
| `POST /auth/register` | `{ name, email, password, acceptTerms: true }` | 201 `{ user: Me, accessToken, refreshToken }` + cookies; `user.locale` = request locale |
| `POST /auth/login` | `{ email, password }` | 200 same; 401 generic text; 429 `retryAfterSec` |
| `POST /auth/refresh` | `{ refreshToken? }` (or cookie) | 200 `{ accessToken, refreshToken }` |
| `POST /auth/logout` | `{ refreshToken? }` | 204 |
| `POST /auth/logout-all` | — | 204 |
| `POST /auth/email/verify` | `{ token }` | 200 `{ user: Me }`; 422 `TOKEN_INVALID_OR_EXPIRED` |
| `POST /auth/email/resend` | — | 204; 429 if < 60 s |
| `POST /auth/password/forgot` | `{ email }` | 204 always |
| `POST /auth/password/reset` | `{ token, password }` | 204 |

## Me

| Request | Body / query | Response |
|---|---|---|
| `GET /me` | — | `Me` |
| `PATCH /me` | `{ name?, bio?, links?, locale? }` | `Me` |
| `PUT /me/password` | `{ currentPassword, newPassword, refreshToken? }` | 204 (other sessions revoked) |
| `POST /me/email` | `{ currentPassword, newEmail }` | 204 (email sent to the new address) |
| `POST /me/avatar` | multipart `file` | `Me` |
| `DELETE /me/avatar` | — | `Me` |
| `GET /me/dashboard` | — | `{ continue: { courseId, courseTitle, lessonId, lessonTitle, progress } \| null; active: MyCourse[] /* up to 6 */; certificates: CertificateDto[]; notifications: NotificationDto[] /* 5 */; recommendations: CourseCard[] /* up to 4 */ }` |
| `GET /me/enrollments` | `status?, search?, PageQuery` | `Page<MyCourse>` |
| `GET /me/certificates` | — | `CertificateDto[]` |
| `GET /me/notifications` | `PageQuery` | `Page<NotificationDto>` |
| `GET /me/notifications/unread-count` | — | `{ count: number }` |
| `POST /me/notifications/:id/read` | — | 204 |
| `POST /me/notifications/read-all` | — | 204 |
| `GET /me/instructor-application` | — | `ApplicationDto \| null` + `canApplyAt: DateTime \| null` |
| `POST /me/instructor-application` | `{ motivation, experience? }` | 201 `ApplicationDto` |

```ts
type MyCourse = { enrollmentId: Id; course: CourseCard; status: EnrollmentStatus; progress: number
                  lastLessonId: Id | null; lastActivityAt: DateTime; completedAt: DateTime | null }
type CertificateDto = { code: string; courseTitle: string; studentName: string; authorName: string
                        issuedAt: DateTime; revoked: boolean; url: string }
type NotificationDto = { id: Id; type: NotificationType; payload: Record<string, unknown>
                         read: boolean; createdAt: DateTime; link: string }
// The client renders the text from its dictionary: t(`notifications.${type}`, payload).
```

## Catalog (public)

| Request | Query | Response |
|---|---|---|
| `GET /categories` | — | `CategoryDto[]` |
| `GET /courses` | `search?, category?, level?, language? (uk\|en), tag?, minRating? (1..5), sort? (popular\|newest\|rating\|title), PageQuery (limit default 12)` | `Page<CourseCard>` |
| `GET /courses/:slug` | — | `CourseDetail`; an old slug answers 301 with `Location` to the current path |
| `GET /courses/:slug/reviews` | `rating?, PageQuery` | `Page<ReviewDto>` |
| `GET /courses/:slug/preview/:lessonId` | — | `LessonContent` for `isPreview`; otherwise 403 `FORBIDDEN` ("Enroll in the course to open this lesson") |
| `GET /instructors/:id` | — | `{ author: UserSummary & { bio, links }; studentCount; ratingAvg; courses: CourseCard[] }` |
| `GET /certificates/:code` | — | `CertificateDto` |
| `GET /stats/public` | — | `{ courses, students, instructors }` |

```ts
type CourseDetail = CourseCard & {
  description: string /* Markdown */; outcomes: string[]; requirements: string[]; tags: string[]
  updatedAt: DateTime
  ratingDistribution: Record<1|2|3|4|5, number>
  curriculum: { id: Id; title: string; lessons: { id: Id; title: string; type: LessonType
                durationMinutes: number; isPreview: boolean }[] }[]
  viewer: null | { enrolled: boolean; progress: number | null; isAuthor: boolean
                   canReview: boolean; reviewBlockReason: string | null /* i18n key */
                   myReview: ReviewDto | null }
}
type ReviewDto = { id: Id; user: UserSummary; rating: number; text: string; hidden: boolean
                   authorReply: string | null; authorRepliedAt: DateTime | null
                   createdAt: DateTime; updatedAt: DateTime }
```

## Learning

| Request | Body | Response |
|---|---|---|
| `POST /courses/:id/enrollment` | — | 201 `{ enrollmentId, firstLessonId }`; 409 already enrolled; 422 BR-E1/E2 |
| `DELETE /courses/:id/enrollment` | — | 204; 422 when a certificate exists |
| `GET /learn/courses/:courseId` | — | `LearnCourse` |
| `GET /learn/lessons/:lessonId` | — | `LessonContent` |
| `PUT /learn/lessons/:lessonId/completion` | — | `ProgressResult` |
| `DELETE /learn/lessons/:lessonId/completion` | — | `ProgressResult`; 422 for quiz lessons |
| `GET /learn/quizzes/:quizId` | — | `QuizForStudent` |
| `POST /learn/quizzes/:quizId/attempts` | `{ answers: Record<questionId, optionId[]> }` | 201 `AttemptResult`; 422 attempt limit / BR-Q4 |
| `GET /learn/quizzes/:quizId/attempts` | — | `AttemptSummary[]` |

```ts
type LearnCourse = { course: { id: Id; slug: string; title: string; language: Locale }
  mode: 'student' | 'preview'; progress: number; status: EnrollmentStatus | null
  lastLessonId: Id | null
  modules: { id: Id; title: string; lessons: { id: Id; title: string; type: LessonType
             durationMinutes: number; completed: boolean; quizId: Id | null }[] }[] }
type LessonContent = { id: Id; courseId: Id; title: string; type: LessonType; content: string | null
  videoUrl: string | null; durationMinutes: number; quizId: Id | null
  prevLessonId: Id | null; nextLessonId: Id | null; completed: boolean }
type ProgressResult = { progress: number; completedLessonIds: Id[]; courseCompleted: boolean
                        certificateCode: string | null }
type QuizForStudent = { id: Id; lessonId: Id; passScore: number; maxAttempts: number | null
  attemptsUsed: number; bestScore: number | null; passed: boolean; shuffle: boolean
  canSubmit: boolean /* false in preview or without attempts */
  questions: { id: Id; type: QuestionType; text: string; points: number
               options: { id: Id; text: string }[] }[] }   // no isCorrect, no explanation
type AttemptResult = { id: Id; scorePercent: number; scorePoints: number; maxPoints: number
  passed: boolean; attemptsLeft: number | null; answersRevealed: boolean
  questions: { id: Id; correct: boolean; explanation: string | null
               correctOptionIds: Id[] | null /* null when not revealed */ }[]
  progress: ProgressResult }
type AttemptSummary = { id: Id; scorePercent: number; passed: boolean; submittedAt: DateTime }
```

## Reviews

| Request | Body | Response |
|---|---|---|
| `POST /courses/:id/reviews` | `{ rating, text }` | 201 `ReviewDto`; 422 BR-R1/R2/U4 |
| `PATCH /reviews/:id` | `{ rating?, text? }` | `ReviewDto` |
| `DELETE /reviews/:id` | — | 204 |
| `PUT /reviews/:id/reply` | `{ text }` | `ReviewDto` |

## Teaching

| Request | Body / query | Response |
|---|---|---|
| `GET /instructor/overview` | — | `{ byStatus: Record<CourseStatus, number>; students; ratingAvg; enrollments30d }` |
| `GET /instructor/courses` | `status?` | `InstructorCourseRow[]` |
| `POST /instructor/courses` | `{ title, categoryId, level, language }` | 201 `CourseEditor` |
| `GET /instructor/courses/:id` | — | `CourseEditor` |
| `PATCH /instructor/courses/:id` | `{ title?, slug?, shortDescription?, description?, categoryId?, level?, language?, tags?, outcomes?, requirements? }` | `CourseEditor`; 409 slug taken; 422 status forbids editing |
| `DELETE /instructor/courses/:id` | — | 204; 422 BR-P5 |
| `POST /instructor/courses/:id/cover` | multipart `file` | `CourseEditor` |
| `GET /instructor/courses/:id/readiness` | — | `{ ready: boolean; items: { key: string /* i18n key */; ok: boolean }[] }` |
| `POST /instructor/courses/:id/{submit,withdraw,archive,restore}` | — | `CourseEditor`; 422 with `rule`/`unmet` |
| `POST /instructor/courses/:id/modules` | `{ title }` | 201 `ModuleDto` |
| `PATCH /instructor/modules/:id` | `{ title }` | `ModuleDto` |
| `DELETE /instructor/modules/:id` | — | 204 |
| `PUT /instructor/courses/:id/structure` | `{ modules: { moduleId, lessonIds: Id[] }[] }` | `CourseEditor['modules']`; 422 when the id sets differ |
| `POST /instructor/modules/:id/lessons` | `{ title, type }` | 201 `LessonEditor` |
| `GET /instructor/lessons/:id` | — | `LessonEditor` |
| `PATCH /instructor/lessons/:id` | `{ title?, content?, videoUrl?, durationMinutes?, isPreview?, type? }` | `LessonEditor` (with `updatedAt` to compare with the local draft) |
| `DELETE /instructor/lessons/:id` | — | 204 |
| `PUT /instructor/lessons/:id/quiz` | `QuizEditor` without ids on new items | `QuizEditor` |
| `GET /instructor/courses/:id/students` | `search?, sort? (name\|enrolledAt\|progress\|lastActivity), PageQuery` | `Page<StudentRow>` |
| `GET /instructor/courses/:id/students.csv` | same | `text/csv; charset=utf-8` with BOM, headers in the request locale |
| `DELETE /instructor/courses/:id/students/:userId/attempts/:quizId` | — | 204 |
| `GET /instructor/courses/:id/stats` | — | `CourseStats` |
| `GET /instructor/reviews` | `courseId?, PageQuery` | `Page<ReviewDto & { course: { id, title } }>` |

```ts
type CourseEditor = { id: Id; slug: string; title: string; shortDescription: string | null
  description: string | null; coverUrl: string | null; level: CourseLevel; language: Locale
  categoryId: Id | null; tags: string[]; outcomes: string[]; requirements: string[]
  status: CourseStatus; moderationComment: string | null; editable: boolean; updatedAt: DateTime
  modules: ModuleDto[] }
type ModuleDto = { id: Id; title: string; position: number
  lessons: { id: Id; title: string; type: LessonType; durationMinutes: number
             isPreview: boolean; position: number }[] }
type LessonEditor = { id: Id; moduleId: Id; title: string; type: LessonType; content: string | null
  videoUrl: string | null; durationMinutes: number; isPreview: boolean; updatedAt: DateTime
  quiz: QuizEditor | null; typeLocked: boolean }
type QuizEditor = { passScore: number; maxAttempts: number | null; shuffle: boolean
  revealAnswers: RevealAnswers
  questions: { id?: Id; type: QuestionType; text: string; explanation: string | null
               points: number; options: { id?: Id; text: string; isCorrect: boolean }[] }[] }
type StudentRow = { userId: Id; name: string; avatarUrl: string | null; enrolledAt: DateTime
  progress: number; lastActivityAt: DateTime; status: EnrollmentStatus
  quizzes: { quizId: Id; bestScore: number | null; attempts: number; passed: boolean }[] }
type CourseStats = { totals: { students: number; completed: number; avgProgress: number
                               ratingAvg: number | null }
  enrollmentsByWeek: { weekStart: string; count: number }[]          // 12 weeks
  funnel: { lessonId: Id; title: string; completedShare: number }[]  // 0..1, curriculum order
  quizzes: { quizId: Id; title: string; avgScore: number | null; firstTryPassShare: number | null }[]
  ratingDistribution: Record<1|2|3|4|5, number> }
```

## Administration

Every `POST` with a reason takes `{ reason: string /* 10..1000 */ }`; a role change takes
`{ role: Role }`.

| Request | Response |
|---|---|
| `GET /admin/stats` | `{ cards: { users, users7d, published, pending, applications, enrollments7d }; daily: { date, registrations, enrollments }[] /* 30 */; topCourses: CourseCard[]; recentAudit: AuditDto[] }` |
| `GET /admin/users?search&role&status&page&limit` | `Page<AdminUserRow>` |
| `GET /admin/users/:id` | `AdminUserDetail` |
| `PATCH /admin/users/:id/role` | `AdminUserRow`; 422 BR-U3 / self |
| `POST /admin/users/:id/block`, `/unblock` | `AdminUserRow` |
| `GET /admin/courses?status&search&page` | `Page<CourseCard & { status; submittedAt }>` |
| `GET /admin/courses/:id` | `CourseEditor` + lessons with content and quizzes with correct answers |
| `POST /admin/courses/:id/approve`, `/reject`, `/unpublish` | `{ status: CourseStatus }` |
| `GET /admin/instructor-applications?status&page` | `Page<ApplicationDto & { user: UserSummary & { email } }>` |
| `POST /admin/instructor-applications/:id/approve`, `/reject` | `ApplicationDto` |
| `GET /admin/categories`, `POST`, `PATCH /:id`, `DELETE /:id` | `AdminCategoryDto` (`nameUk`, `nameEn`, `slug`, `accent`, `sortOrder`, `courseCount`) / 204; 422 when courses exist |
| `GET /admin/reviews?rating&status&page` | `Page<ReviewDto & { course }>` |
| `POST /admin/reviews/:id/hide`, `/unhide` | `ReviewDto` |
| `GET /admin/certificates?search&page` | `Page<CertificateDto>` |
| `POST /admin/certificates/:code/revoke` | `CertificateDto` |
| `GET /admin/audit-log?actorId&action&from&to&page` | `Page<AuditDto>` |

```ts
type ApplicationDto = { id: Id; motivation: string; experience: string | null
  status: ApplicationStatus; reviewComment: string | null; createdAt: DateTime
  reviewedAt: DateTime | null }
type AdminUserRow = UserSummary & { email: string; emailVerified: boolean; role: Role
  status: UserStatus; locale: Locale; createdAt: DateTime; lastLoginAt: DateTime | null }
type AuditDto = { id: Id; actor: UserSummary; action: string; entityType: string
  entityId: Id; meta: Record<string, unknown>; createdAt: DateTime }
```

## System

- `GET /health` → `{ status: 'ok', db: 'ok' | 'down', version }`.
- `GET /api/openapi.json`, `GET /api/docs`.
