# Contract: local storage and external APIs (SPA)

## localStorage

All keys are prefixed with `learnly:v1:`. The value is JSON validated by a Zod schema on read; an
invalid value is removed and treated as absent. Access only through `storageApi` (`queryFn`); the
schema owner is the listed feature.

| Key | Feature | Value schema | Cleared on logout |
|---|---|---|---|
| `theme` | theme | `'light' \| 'dark' \| 'system'` (mirrored in the `theme` cookie) | no |
| `locale` | locale | `'uk' \| 'en'` (mirrored in the `locale` cookie) | no |
| `ui` | navigation | `{ collapsedModules: Record<courseId, moduleId[]>; notesPanelWidth: number }` | no |
| `notes:<courseId>` | notes | `{ [lessonId]: { text: string /* ≤ 20000 */; updatedAt: DateTime } }` | yes |
| `quiz:<quizId>` | quizzes | `{ answers: Record<questionId, optionId[]>; currentIndex: number; order: questionId[]; savedAt: DateTime }` | yes |
| `draft:lesson:<lessonId>` | teachLessons | `{ fields: Partial<LessonEditor & { quiz: QuizEditor }>; savedAt: DateTime; baseUpdatedAt: DateTime }` | yes |
| `draft:course:<courseId>` | teachCourses | `{ fields: Partial<CourseEditor>; savedAt: DateTime; baseUpdatedAt: DateTime }` | yes |
| `wiki-cache` | wiki | `{ entries: { key: string /* lang:title */; summary: WikiSummary; savedAt: DateTime }[] /* ≤ 20, LRU */ }` | yes |
| `last-user` | auth | user `Id`; when a different user signs in, personal keys are cleared | no |

Draft restore rule: "Restore draft" is offered when `draft.savedAt > server.updatedAt`. When
`server.updatedAt > draft.baseUpdatedAt` (the lesson was changed elsewhere), the dialog warns about
the conflict.

Locale rule: on startup the SPA computes `resolveLocale({ cookie, user: Me.locale, acceptLanguage:
navigator.languages })` from `packages/i18n` (the same function as the server) and re-runs it once
`Me` is loaded; the `locale` storage key mirrors the cookie and is not a separate source. The cookie
is written only on an explicit choice and by the server on login. Switching updates the slice, the
key, the cookie and, for signed-in users, `PATCH /me { locale }`.

## Wikipedia REST

- Request: `GET https://{lang}.wikipedia.org/api/rest_v1/page/summary/{encodeURIComponent(title)}`.
  Language order: the interface locale first, then the other locale (`uk` UI: `uk` → `en`; `en` UI:
  `en` → `uk`). Timeout 5 s.
- Selection: 2–80 characters, trimmed of whitespace and punctuation at the edges, at most 5 words.
- Used response fields and normalization:

```ts
type WikiSummary = { lang: 'uk' | 'en'; title: string; extract: string /* cut to 600 */
                     thumbnailUrl: string | null; pageUrl: string }
// source: title, extract, thumbnail?.source, content_urls.desktop.page
// type === 'disambiguation' → the "Ambiguous term" message and a link
```

- Errors: 404 in both languages → `{ kind: 'not_found' }`; network / timeout / 5xx →
  `{ kind: 'unavailable' }`. The user-facing text comes from `describeError` in the active locale.

## noembed

- Request: `GET https://noembed.com/embed?url={encodeURIComponent(videoUrl)}`. Timeout 5 s.
- Accepted links (checked before the request by `parseVideoUrl` in `packages/contracts`):
  `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`, `vimeo.com/<id>`,
  `player.vimeo.com/video/<id>`.
- Normalization:

```ts
type VideoMeta = { provider: 'youtube' | 'vimeo'; title: string; authorName: string | null
                   thumbnailUrl: string | null; embedUrl: string }
// a response with an error field → { kind: 'not_found' }
```

- `embedUrl` is built locally from the video id (`https://www.youtube-nocookie.com/embed/<id>`,
  `https://player.vimeo.com/video/<id>`), never taken from the noembed response. The YouTube player
  receives `hl=<locale>`.

## CSP (affects both contracts)

`connect-src 'self' https://uk.wikipedia.org https://en.wikipedia.org https://noembed.com`;
`img-src 'self' data: https://upload.wikimedia.org https://i.ytimg.com https://i.vimeocdn.com`;
`frame-src https://www.youtube-nocookie.com https://player.vimeo.com`.
