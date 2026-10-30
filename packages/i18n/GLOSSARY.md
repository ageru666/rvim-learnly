# Learnly translation glossary

One term per concept in each language. When a message needs one of these concepts, it uses the term below,
in the site, the dashboard, the admin panel, emails and notifications alike. `src/messages/uk.ts` is the
source dictionary; `src/messages/en.ts` follows it key by key.

## Terms

| Concept | English | Ukrainian | Notes |
|---|---|---|---|
| Course | course | курс | |
| Module | module | модуль | A group of lessons inside a course. |
| Lesson | lesson | урок | Types: text (текст), video (відео), quiz (тест). |
| Curriculum | curriculum | програма курсу | The ordered modules and lessons; the editor tab is «Програма». |
| Quiz | quiz | тест | Never "test" in English, never «вікторина» in Ukrainian. |
| Question | question | питання | |
| Answer option | option | варіант відповіді | |
| Attempt | attempt | спроба | |
| Passing score | passing score | прохідний бал | |
| Pass / fail a quiz | pass / fail | скласти / не скласти тест | Taking it is «проходити тест». Not «здати». |
| Enrollment | enrollment | запис (на курс) | |
| Enroll | enroll | записатися | |
| Leave a course | leave | покинути курс | Deletes the enrollment and its progress. |
| Lesson done | completed | пройдено, пройдений урок | |
| Course done | completed | завершено, завершений курс | |
| Progress | progress | прогрес | |
| Certificate | certificate | сертифікат | Genitive «сертифіката». |
| Revoke a certificate | revoke | анулювати | |
| Review (by a student) | review | відгук | Only for what students write. |
| Rating of a course | rating, average rating | рейтинг, середній рейтинг | The average over reviews. |
| Rating of one review | rating, stars | оцінка, зірки | |
| Moderation of a course | moderation | модерація | "Submit for moderation", «Надіслати на модерацію». Never "review", which is a student's review. |
| Instructor application | application | заявка викладача | An application is "under review" / «на розгляді». |
| Student | student | студент | |
| Instructor (role) | instructor | викладач | |
| Course author | author | автор курсу | The instructor in relation to their own course. |
| Administrator | administrator | адміністратор | «Модератор» when the text is about a decision on content (a hidden review, a rejected course). |
| Dashboard | dashboard | кабінет | The SPA at `/app`. |
| Admin panel | admin panel | адмін-панель | |
| Teaching area | Teaching | Викладання | The instructor part of the dashboard. |
| My courses | My courses | Мої курси | The student's enrollments only; the instructor's courses are "the course list" / «список курсів». |
| Free lesson | free lesson, free preview | безкоштовний урок, безкоштовний перегляд | A lesson open without enrolling. |
| Preview mode | preview mode | режим перегляду | The author looking at their course as a student; no progress is saved. |
| Draft | draft | чернетка | Both a course status and an unsaved local copy of an edit. |
| Notes | notes | нотатки | Kept on the device only. |
| Notification | notification | сповіщення | |
| Account | account | обліковий запис | |
| Email | email | email | Also for the address; «електронна пошта» is not used. |
| Log in / log out / sign up | log in, log out, sign up | увійти, вийти, зареєструватися | |
| Upload | upload | завантажити | Files sent to the server: covers, avatars. |
| Export | export | експортувати | Files made for the user: CSV, Markdown. |

## Ukrainian

- The apostrophe inside words is `ʼ` (U+02BC): «імʼя», «зʼявиться». Quotation marks are «…».
- Counts use ICU plurals with all four categories (`one`, `few`, `many`, `other`), and the verb agrees with the
  numeral: «2 питання залишилися», «5 питань залишилося».
- A name in a placeholder cannot be declined, so a noun before it carries the case: «спроби студента {name}».
- The user is addressed as «ви», lowercase.
- Audit log entries are nouns («Схвалення курсу»), not a past tense that would give the administrator a gender.
- "Wrong" is «неправильний», not «невірний».

## English

- US spelling: color, canceled, catalog, enrollment.
- Buttons are imperatives without articles: "Add lesson", "Start quiz", "Export to CSV". Questions in dialogs keep
  them: "Finish the quiz?".
- Sentence case everywhere; quotation marks are “…”, the apostrophe is ’.
- Confirmations are short: "Profile saved.", "Lesson saved."
- Counts use ICU plurals with `one` and `other`.

## Checked automatically

`src/__tests__/parity.test.ts` fails when the two dictionaries have different keys or placeholders, when a plural
lacks a category the language needs, when a message is empty, and for the rules above that a machine can see:
the Ukrainian apostrophe, counts printed without a plural, gendered audit entries and British spelling.
