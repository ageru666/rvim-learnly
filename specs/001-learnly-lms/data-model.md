# Data Model: Learnly

Phase 1 of the plan. PostgreSQL 18, Prisma 7. Requirement source: `docs/tz.md` section 7 and BR-*.

## Conventions

- PK: `uuid` with `gen_random_uuid()`, except composite keys of link tables.
- Time: `timestamptz`, UTC. `createdAt` / `updatedAt` on every entity except links and logs (those
  have `createdAt` only).
- Database table names are `snake_case` (`@@map`), columns `snake_case` (`@map`), code uses
  `camelCase`.
- Extensions: `citext` (email), `pg_trgm` (search).
- Deletion: cascade for "composition" (course → modules → lessons → quiz → questions → options;
  enrollment → completions, attempts); `Restrict` for references to author users and categories.
- Field limits are constants in `packages/contracts/src/limits.ts` and are enforced by Zod.
- User-facing texts are never stored for system events; the database stores codes and payloads,
  and texts come from `packages/i18n` at render time.

## Enums

| Enum | Values |
|---|---|
| `Locale` | `uk`, `en` (single source: `LOCALES` in `packages/contracts/src/enums.ts`) |
| `Role` | `student`, `instructor`, `admin` |
| `UserStatus` | `active`, `blocked` |
| `ApplicationStatus` | `pending`, `approved`, `rejected` |
| `CourseLevel` | `beginner`, `intermediate`, `advanced` |
| `CourseStatus` | `draft`, `pending_review`, `published`, `archived` |
| `LessonType` | `text`, `video`, `quiz` |
| `QuestionType` | `single`, `multiple` |
| `RevealAnswers` | `always`, `after_pass_or_exhausted` |
| `EnrollmentStatus` | `active`, `completed` |
| `ReviewStatus` | `visible`, `hidden` |
| `Accent` | `yellow`, `green`, `cyan`, `blue`, `indigo`, `red`, `pink`, `magenta` |
| `AuditAction` | `course.approve`, `course.reject`, `course.unpublish`, `application.approve`, `application.reject`, `user.role`, `user.block`, `user.unblock`, `category.create`, `category.update`, `category.delete`, `review.hide`, `review.unhide`, `certificate.revoke` |
| `OneTimeTokenPurpose` | `password_reset`, `email_verify` |
| `NotificationType` | `course_completed`, `review_replied`, `review_hidden`, `application_approved`, `application_rejected`, `course_approved`, `course_rejected`, `course_unpublished`, `course_new_review`, `admin_course_submitted`, `admin_application_submitted` |

## Entities

### User (`users`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| email | citext | unique, 3–254 |
| emailVerifiedAt | timestamptz? | null = not verified |
| passwordHash | text | argon2id |
| name | text | 2–60 |
| bio | text? | ≤ 500 |
| avatarUrl | text? | path `/uploads/avatars/...` |
| links | jsonb | `{ website?, github?, linkedin? }`, each a valid URL ≤ 200 |
| locale | Locale | default `uk`; set from the request locale at registration, changed by the user |
| role | Role | default `student` |
| status | UserStatus | default `active` |
| blockedReason | text? | required when `blocked` |
| lastLoginAt | timestamptz? | |

Relations: 1–N `RefreshToken`, `OneTimeToken`, `InstructorApplication`, `Course` (as author),
`Enrollment`, `Review`, `Notification`, `AuditLogEntry` (as actor).

### RefreshToken (`refresh_tokens`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| userId | uuid | FK users, cascade |
| tokenHash | text | unique, SHA-256 |
| familyId | uuid | rotation chain |
| userAgent, ip | text? | |
| expiresAt | timestamptz | +30 days |
| revokedAt | timestamptz? | |
| replacedById | uuid? | next token in the chain |

Rule: presenting an already revoked token revokes the whole `familyId` family (R6).

### OneTimeToken (`one_time_tokens`)

Covers password reset and email verification.

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| userId | uuid | FK users, cascade |
| purpose | OneTimeTokenPurpose | |
| email | citext? | for `email_verify`: the address being verified (email change) |
| tokenHash | text | unique |
| expiresAt | timestamptz | 1 h for reset, 24 h for email |
| usedAt | timestamptz? | |

Rule: issuing a new token with the same purpose marks previous unused ones as used. Resending the
verification email is allowed at most once every 60 seconds (by `createdAt` of the latest token).

### LoginAttempt (`login_attempts`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| email | citext | |
| ip | text | |
| succeeded | bool | |
| createdAt | timestamptz | index `(email, ip, created_at)` |

Rule FR-AUTH-2: 5 failed attempts for an (email, ip) pair within 15 minutes block login until the
window passes. Records older than 24 hours are deleted on server start and every hour.

### InstructorApplication (`instructor_applications`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| userId | uuid | FK users, cascade |
| motivation | text | 50–2000 |
| experience | text? | ≤ 2000 |
| status | ApplicationStatus | default `pending` |
| reviewedById | uuid? | FK users |
| reviewComment | text? | required when `rejected`, 10–1000 |
| reviewedAt | timestamptz? | |

Partial unique index: one `pending` per user (BR-U1). Re-applying after `rejected` is allowed
7 days after `reviewedAt`.

Transitions: `pending → approved` (the user's role becomes `instructor`), `pending → rejected`.

### Category (`categories`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| nameUk | text | unique, 2–40 |
| nameEn | text | unique, 2–40 |
| slug | text | unique (from `nameEn`) |
| accent | Accent | |
| sortOrder | int | default 0 |

Deletion is forbidden while courses exist (`Restrict`, checked in the service with a clear error).
API and SSR expose a single `name` resolved for the request locale.

### Course (`courses`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| authorId | uuid | FK users, restrict |
| categoryId | uuid? | FK categories, restrict; required for BR-P1 |
| slug | text | unique, ≤ 80, `[a-z0-9-]` |
| title | text | 5–120 |
| shortDescription | text? | ≤ 200 |
| description | text? | Markdown, ≤ 10 000 |
| coverUrl | text? | |
| level | CourseLevel | default `beginner` |
| language | Locale | content language, default = author's locale at creation |
| outcomes | text[] | ≤ 10 items of ≤ 160 |
| requirements | text[] | ≤ 10 items of ≤ 160 |
| status | CourseStatus | default `draft` |
| wasPublished | bool | default false; true after the first publication |
| submittedAt, publishedAt | timestamptz? | |
| moderationComment | text? | reason of the last rejection or unpublishing |

Indexes: `(status, published_at desc)`, `category_id`, `author_id`, `language`, GIN trgm on `title`
and `short_description`.

Transitions (BR-P1–P5):

| From | Event | To | Who | Condition |
|---|---|---|---|---|
| draft | submit | pending_review | author | BR-P1 satisfied, email verified |
| pending_review | withdraw | draft | author | |
| pending_review | approve | published | admin | sets `publishedAt`, `wasPublished = true` |
| pending_review | reject | draft | admin | reason 10–1000 |
| published | archive | archived | author, admin | |
| published | unpublish | draft | admin | reason 10–1000 |
| archived | restore | published | author, admin | `wasPublished = true` |
| draft | delete | (deleted) | author, admin | no enrollments ever |

Editing is allowed in `draft` and `published` and forbidden in `pending_review` and `archived`.

### CourseSlugHistory (`course_slug_history`)

`oldSlug` (PK), `courseId` (FK cascade), `createdAt`. When the slug of a course with
`wasPublished = true` changes, the old slug is stored here (BR-P6). A new slug must not match any
current slug or history entry.

### Tag (`tags`) and CourseTag (`course_tags`)

`Tag`: `id`, `name` (unique, 2–30, lowercase). `CourseTag`: PK (`courseId`, `tagId`), at most
5 tags per course.

### Module (`modules`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| courseId | uuid | FK courses, cascade |
| title | text | 2–120 |
| position | int | ≥ 0, order within the course |

### Lesson (`lessons`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| moduleId | uuid | FK modules, cascade |
| title | text | 2–120 |
| type | LessonType | can change only while there are no attempts or completions |
| content | text? | Markdown ≤ 50 000 (`text`, description for `video`) |
| videoUrl | text? | YouTube or Vimeo, required for `video` |
| durationMinutes | int | 1–600, default 5 |
| isPreview | bool | default false |
| position | int | order within the module |

### Quiz (`quizzes`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| lessonId | uuid | unique, FK lessons, cascade |
| passScore | int | 1–100, default 70 |
| maxAttempts | int? | null = unlimited, otherwise 1–10 |
| shuffle | bool | default false |
| revealAnswers | RevealAnswers | default `after_pass_or_exhausted` |

Created automatically when a lesson of type `quiz` is created.

### Question (`questions`) and AnswerOption (`answer_options`)

`Question`: `id`, `quizId` (cascade), `type`, `text` (Markdown 1–2000), `explanation` (≤ 2000),
`points` (1–10, default 1), `position`.

`AnswerOption`: `id`, `questionId` (cascade), `text` (1–500), `isCorrect`, `position`.

Validation (when saving a quiz and in BR-P1): 2–8 options; exactly one correct for `single`; at
least one correct for `multiple`.

### Enrollment (`enrollments`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| userId | uuid | FK users, cascade |
| courseId | uuid | FK courses, cascade |
| status | EnrollmentStatus | default `active` |
| lastLessonId | uuid? | FK lessons, set null |
| lastActivityAt | timestamptz | |
| enrolledAt | timestamptz | |
| completedAt | timestamptz? | |

Unique (`userId`, `courseId`). Indexes `(course_id, enrolled_at)`,
`(user_id, last_activity_at desc)`.

Transitions: `active → completed` (BR-C1, irreversible, BR-C2). Deleting the enrollment = "leave the
course" (forbidden once a certificate exists).

### LessonCompletion (`lesson_completions`)

PK (`enrollmentId`, `lessonId`), both FK cascade, `completedAt`.

### QuizAttempt (`quiz_attempts`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| enrollmentId | uuid | FK enrollments, cascade |
| quizId | uuid | FK quizzes, cascade |
| answers | jsonb | `Record<questionId, optionId[]>` |
| result | jsonb | review snapshot: per question `{ correct, points, correctOptionIds, explanation }` (BR-Q5) |
| scorePoints, maxPoints, scorePercent | int | |
| passed | bool | |
| submittedAt | timestamptz | |

Index `(enrollment_id, quiz_id)`. An author's reset deletes the student's attempts for the quiz
and removes the quiz lesson's completion mark.

### Review (`reviews`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| userId | uuid | FK users, cascade |
| courseId | uuid | FK courses, cascade |
| rating | int | 1–5 |
| text | text | 10–2000 |
| status | ReviewStatus | default `visible` |
| hiddenReason | text? | required when `hidden` |
| authorReply | text? | ≤ 1000 |
| authorRepliedAt | timestamptz? | |

Unique (`userId`, `courseId`). Index `(course_id, status)`.

### Certificate (`certificates`)

| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| enrollmentId | uuid | unique, FK enrollments, restrict |
| code | text | unique, 10 characters from an alphabet without `0 O 1 I L` |
| studentName, courseTitle, authorName | text | snapshot at issue time |
| issuedAt | timestamptz | |
| revokedAt | timestamptz? | |
| revokedReason | text? | required on revocation |

The unique `enrollmentId` guarantees a single issue under concurrency (BR-C1). Because the FK is
`restrict`, a completed course with a certificate cannot be left: the service returns
`BUSINESS_RULE_VIOLATION` with a clear message.

### Notification (`notifications`)

`id`, `userId` (cascade), `type` (NotificationType), `payload` jsonb (`{ courseId?, courseTitle?,
courseSlug?, reviewId?, applicationId?, comment? }`), `readAt?`, `createdAt`.
Index `(user_id, read_at, created_at desc)`. The display text is `t('notifications.<type>', payload)`
in the viewer's locale.

### AuditLogEntry (`audit_log`)

`id`, `actorId` (FK users, restrict), `action` (`AuditAction`), `entityType`, `entityId`, `meta` jsonb, `createdAt`. Indexes `(created_at desc)`,
`(actor_id)`. Action labels in the admin panel come from dictionaries (`admin.audit.<action>`).

## Derived values (queries, not stored)

- Course rating: `avg(rating)` and `count(*)` over `reviews where status = 'visible'`, distribution
  `count group by rating`.
- Course students: `count(enrollments)`.
- Lessons and duration: `count(lessons)`, `sum(duration_minutes)` over the course modules.
- Enrollment progress: `floor(count(lesson_completions) * 100 / count(course lessons))`, 0 when the
  course has no lessons.
- Review eligibility (BR-R1): progress ≥ 30 or `status = completed`.

The catalog and home page use the SQL view `course_stats` (course_id, students, lessons, minutes,
rating_avg, rating_count), created in a migration and read through `prisma.$queryRaw` with a typed
result.

## Seed data

A deterministic seed (`faker` with a fixed seed) per TZ 7.4:

- `admin@learnly.local`, `olena.teacher@learnly.local`, `taras.teacher@learnly.local`,
  `iryna.teacher@learnly.local` (locale `en`), `student1..15@learnly.local` (`student2`, `student3`
  with locale `en`); password `Learnly2026!` for everyone; `student15` with an unverified email.
- 6 categories with `nameUk`/`nameEn`; 10 courses (7 published: 5 in Ukrainian and 2 in English,
  1 pending_review, 1 draft, 1 archived); published courses have 3–5 modules, 3–5 lessons per
  module, 1–2 quizzes per course, 1–2 preview lessons, video lessons with real public YouTube links.
- Enrollments with 0–100 % progress, 3 certificates, 30+ reviews, 2 applications (pending and
  rejected), notifications, several audit entries.
- Covers: SVG covers generated by the seed in category accent colours, converted to WebP with sharp
  (no external images).
