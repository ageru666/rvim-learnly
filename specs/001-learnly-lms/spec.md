# Feature Specification: Learnly, an online course platform (mini-LMS)

**Feature Branch**: `001-learnly-lms`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "A full mini-LMS per docs/tz.md: public site with a course catalog, registration with email verification, learning with progress, quizzes, certificates, reviews, an instructor dashboard with a course editor and analytics, an admin panel with moderation, a documented programmatic interface for third-party clients, a bilingual interface (Ukrainian by default and English). No OAuth and no features that require external accounts."

Detailed values (field limits, page and endpoint lists, data model) are fixed in `docs/tz.md`;
identifiers such as `FR-AUTH-1` and `BR-P1` below refer to it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A guest explores the catalog and a course page (Priority: P1)

A visitor without an account opens the home page, sees popular and new courses, categories and
platform counters, searches the catalog with filters, opens a course page with the description,
curriculum, author, rating and reviews, watches a preview lesson and reads the information pages
(about, FAQ, terms, privacy policy, contacts).

**Why this priority**: this is the storefront of the product and the core of lab 1 (dynamic pages
from the database and static content). Without the catalog there is no entry point for any other
flow.

**Independent Test**: on demo data a guest, without logging in, finds a course through search and
filters, opens its page and a preview lesson, and visits every information page.

**Acceptance Scenarios**:

1. **Given** published courses exist, **When** a guest opens the home page, **Then** they see the
   counters (courses, students, instructors), up to 6 popular and up to 6 new courses, and
   categories with course counts.
2. **Given** a guest in the catalog, **When** they enter a search phrase and choose a category,
   level, content language and sorting, **Then** only matching published courses are shown, 12 per
   page, and the page address contains the chosen parameters and reproduces the result when
   reopened.
3. **Given** a course page, **When** a guest opens it, **Then** they see the description, "What you
   will learn", requirements, the curriculum with lesson types and durations, the author, the
   content language, the average rating with its distribution and paginated reviews.
4. **Given** a course has a preview lesson, **When** a guest opens it, **Then** its content is
   available without login; **When** the guest tries to open a non-preview lesson, **Then** they are
   offered to log in and enroll.
5. **Given** a course in draft, review or archive, **When** a guest searches for it or opens its
   address, **Then** the course is not shown (a "not found" page).
6. **Given** a course address (slug) was changed, **When** the old address is opened, **Then** a
   permanent redirect to the new one happens.

---

### User Story 2 - Registration, login and account management (Priority: P1)

A visitor signs up with email and password, is signed in immediately, verifies the email from a
link, can log out, log in again, recover a forgotten password, change the password and the email,
and log out from all devices.

**Why this priority**: without an account none of the persisted actions are possible; this is a
mandatory part of labs 1 and 3.

**Independent Test**: register a new user, receive the email in the local mailbox, verify the email,
log out, reset the password from the email, log in with the new password.

**Acceptance Scenarios**:

1. **Given** a guest on the registration page, **When** they enter a valid name, email and password
   and accept the terms, **Then** an account with the "student" role is created, the user is signed
   in and receives an email with a verification link.
2. **Given** the email is already taken (case-insensitive), **When** a guest registers with it,
   **Then** an error is shown next to the email field and no account is created.
3. **Given** an unverified email, **When** the user opens the site or the dashboard, **Then** a
   banner offers to verify the email with a resend button (at most once every 60 seconds).
4. **Given** a valid verification link, **When** the user follows it, **Then** the email becomes
   verified; following it again or an expired link (older than 24 hours) shows a clear message.
5. **Given** a wrong password, **When** the user logs in, **Then** a generic message is shown that
   does not reveal which part is wrong; after 5 failed attempts within 15 minutes login is
   temporarily blocked.
6. **Given** a forgotten password, **When** the user requests a reset, **Then** the response is the
   same for existing and non-existing addresses, and an email with a link (valid 1 hour, single
   use) arrives only at an existing one.
7. **Given** the user changed the password or clicked "log out from all devices", **Then** all their
   other sessions stop working.
8. **Given** an administrator blocked a user, **Then** their current sessions end and login is
   impossible with a message about the block.

---

### User Story 3 - A student enrolls in a course and takes lessons (Priority: P1)

A signed-in user enrolls in a published course, lands in the dashboard, sees their courses with
progress and a "Continue learning" block, opens the course player, reads text lessons, watches
video lessons, marks lessons as completed, moves between lessons and sees the overall progress.

**Why this priority**: this is the core value of an LMS and the main flow of lab 2.

**Independent Test**: a demo student enrolls in a course, completes two lessons, logs out and comes
back: progress and the last lesson are kept.

**Acceptance Scenarios**:

1. **Given** a published course the user is not enrolled in, **When** they click "Enroll", **Then**
   an enrollment is created, the button changes to "Continue learning" and the course appears in
   the dashboard under "Active".
2. **Given** a guest clicks "Enroll", **Then** they are sent to login (or registration), and after a
   successful login or registration the enrollment is created automatically and the user lands on
   the first lesson.
3. **Given** the course author opens their own course, **Then** they cannot enroll but can open the
   course in preview mode, where progress is not saved.
4. **Given** a student in the player, **When** they mark a lesson as completed, **Then** the mark
   appears in the curriculum immediately and the overall progress is recalculated (completed / all
   lessons, rounded down); the mark of a text or video lesson can be removed.
5. **Given** the student opened a lesson, **When** they later return to the dashboard, **Then**
   "Continue learning" leads exactly to that lesson.
6. **Given** a student decides to leave a course, **When** they confirm in the dialog, **Then** the
   enrollment and progress are deleted; **Given** a certificate was already issued for the course,
   **Then** leaving is impossible and the interface explains why.
7. **Given** a 360 px wide phone screen, **Then** the curriculum opens in a drawer and the lesson
   content is readable without horizontal scrolling.

---

### User Story 4 - Using the product in Ukrainian or English (Priority: P2)

A visitor switches the interface between Ukrainian and English anywhere in the product. The choice
applies to the public site, the admin panel, the dashboard, form validation, error messages, emails
and notifications, is remembered for the visitor and saved to the account, and courses show and can
be filtered by their content language.

**Why this priority**: the product targets Ukrainian and English-speaking learners; a half-translated
interface would undermine every other flow, so the infrastructure is built first and this story
makes the switch visible and complete.

**Independent Test**: switch to English on the home page, register, open the dashboard, trigger a
validation error, request a password reset and open a notification: everything is in English;
switch back to Ukrainian in the dashboard and everything changes without a reload.

**Acceptance Scenarios**:

1. **Given** a first-time visitor whose browser prefers English, **When** they open the site,
   **Then** it is shown in English; with any other preference it is shown in Ukrainian.
2. **Given** a visitor switches the language in the header, **Then** the current page reloads in
   that language, and every next page of the site, the admin panel and the dashboard uses it.
3. **Given** a signed-in user changes the language, **Then** it is saved to the account, and on
   another device the product opens in that language after login.
4. **Given** the dashboard is open, **When** the user switches the language, **Then** all texts,
   dates, numbers and plural forms change without a page reload and without losing unsaved input.
5. **Given** a user whose account language is English, **When** an email or a notification is sent
   to them, **Then** it is in English regardless of who triggered it.
6. **Given** a form or API request with invalid data, **Then** the validation messages are in the
   active language, while the error code stays the same in both languages.
7. **Given** the catalog, **When** the visitor filters by content language "English", **Then** only
   English-language courses are listed, and each card shows its content language.

---

### User Story 5 - A student takes a quiz (Priority: P2)

A student opens a quiz lesson, sees the conditions (number of questions, passing score, attempts
left, best result), answers single and multiple choice questions, submits the attempt and gets the
result with a review.

**Why this priority**: quizzes distinguish an LMS from a website with articles and are needed to
complete a course.

**Independent Test**: on a demo course the student fails a quiz, reads the review, retakes it and
the quiz lesson becomes completed.

**Acceptance Scenarios**:

1. **Given** the student started a quiz, **When** they have not submitted yet, **Then** correct
   answers are not available either in the interface or in the data their device receives.
2. **Given** a multiple-answer question, **When** the student selected an incomplete set or an extra
   option, **Then** the question does not count (no partial points).
3. **Given** a result not lower than the passing score (70 % by default), **Then** the attempt is
   "Passed", the quiz lesson is marked completed automatically and the mark cannot be removed.
4. **Given** the student reloaded the page in the middle of a quiz, **Then** the selected answers and
   the current question index are restored.
5. **Given** the attempt limit is used up without passing, **Then** a new attempt is unavailable
   until the course author resets attempts for this student.
6. **Given** a submission with unanswered questions, **Then** a confirmation with their number is
   shown before submitting.
7. **Given** the "reveal after passing or after attempts run out" setting, **Then** until then the
   review shows only correct/incorrect and explanations, without the correct options.

---

### User Story 6 - Course completion and certificate (Priority: P2)

When all lessons are completed, the course completes automatically, the student sees a
congratulations screen and receives a certificate with a unique code that anyone can verify on a
public page and print.

**Why this priority**: it closes the learning loop with a visible result.

**Independent Test**: complete a short demo course and open the certificate verification page
without logging in.

**Acceptance Scenarios**:

1. **Given** the last lesson is completed, **Then** the enrollment becomes "completed", exactly one
   certificate is issued, the student sees a congratulations screen with a certificate link and an
   invitation to review, and a notification arrives.
2. **Given** a certificate code, **When** anyone opens the verification page, **Then** they see the
   student name, course, author, date and a "Certificate is valid" mark in their interface language;
   an unknown code gives a "not found" page, a revoked one shows "Certificate revoked".
3. **Given** the author later added lessons, **Then** the "completed" status and the certificate are
   kept and progress is recalculated.
4. **Given** the certificate page, **When** the user prints it, **Then** a neat one-page document
   without navigation elements is printed.

---

### User Story 7 - Course reviews and rating (Priority: P2)

A student who completed at least 30 % of a course leaves a rating and a text review, can edit or
delete it; the course author replies; the course rating is recalculated.

**Why this priority**: social proof in the catalog and a persisted user action for lab 1.

**Independent Test**: a student with 40 % progress leaves a review on the course page, the author
replies from the dashboard, and the rating on the course card is updated.

**Acceptance Scenarios**:

1. **Given** progress below 30 % and the course not completed, **Then** the review form is unavailable
   with an explanation.
2. **Given** the user already reviewed the course, **Then** they see editing of their own review
   instead of the creation form.
3. **Given** the email is not verified, **Then** reviewing is impossible and the reason is shown.
4. **Given** an administrator hid a review, **Then** it is excluded from the rating and invisible to
   others, and its author sees a "hidden" mark.

---

### User Story 8 - A user becomes an instructor and creates a course (Priority: P2)

A student applies for the instructor role; after approval they create a course, fill in the
description, content language and cover, build the curriculum from modules and lessons, reorder it
with drag and drop, write text, video and quiz lessons, see the readiness checklist and submit the
course for moderation.

**Why this priority**: without instructors there is no new content; this is the most interactive
flow for lab 2.

**Independent Test**: a demo instructor creates a course with 1 module and 3 lessons (including a
quiz) and submits it for moderation.

**Acceptance Scenarios**:

1. **Given** the user has a pending application, **Then** a new one cannot be submitted; after a
   rejection a new application is available after 7 days.
2. **Given** the course does not satisfy the readiness checklist (BR-P1), **When** the author tries
   to submit, **Then** submission is rejected with a list of unmet items.
3. **Given** a course awaiting review, **Then** it cannot be edited but can be withdrawn to draft.
4. **Given** the author edits a lesson and closes the tab without saving, **When** they open the
   lesson again, **Then** they are offered to restore or discard the local draft.
5. **Given** the author dragged a lesson into another module, **When** they reload the page, **Then**
   the new order is kept.
6. **Given** the course never had enrollments and is a draft, **Then** it can be deleted; otherwise
   only archiving is available.
7. **Given** a video link that is not YouTube or Vimeo, **Then** the editor shows an error and the
   course does not pass the readiness checklist.

---

### User Story 9 - The administrator moderates and manages the platform (Priority: P2)

In the admin panel the administrator sees a platform summary, works through the moderation queue
(approve or reject with a reason), handles instructor applications, manages users (role, block),
categories (names in both languages), reviews and certificates, and sees the audit log of their
actions.

**Why this priority**: mandatory support for administrative users in lab 1 and the closing step of
the publication loop.

**Independent Test**: the administrator approves an instructor application and a course awaiting
review; the course appears in the catalog and both actions are in the audit log.

**Acceptance Scenarios**:

1. **Given** a course awaiting review, **When** the administrator approves it, **Then** the course
   appears in the catalog and in "New courses", and the author receives a notification and an email.
2. **Given** the administrator rejects a course without a reason (shorter than 10 characters),
   **Then** the action is not performed.
3. **Given** the administrator tries to block or demote themselves or the last active administrator,
   **Then** the action is forbidden with an explanation.
4. **Given** a category has courses, **Then** it cannot be deleted, only renamed.
5. **Given** any state-changing administrator action, **Then** an audit entry appears: who, when,
   what and on which object.
6. **Given** a user without the administrator role opens the admin panel address, **Then** access is
   denied.

---

### User Story 10 - An instructor analyzes a course and works with students (Priority: P3)

The instructor sees a summary of their courses, the list of students of a course with progress and
results, exports it to CSV, resets quiz attempts for a student, views charts (enrollments per week,
lesson completion funnel, quiz results, rating distribution) and replies to reviews.

**Why this priority**: makes the instructor dashboard complete but is not needed for the basic
learning loop.

**Independent Test**: on a demo course with 10+ students open the statistics and find the lesson with
the largest drop-off; export the CSV and open it in a spreadsheet editor.

**Acceptance Scenarios**:

1. **Given** a course with enrollments, **Then** the funnel shows the share of students who completed
   each lesson in curriculum order.
2. **Given** the instructor opens the statistics of someone else's course, **Then** access is denied.
3. **Given** a CSV export, **Then** the file opens in a spreadsheet editor with correct Cyrillic text
   and column headers in the instructor's language.

---

### User Story 11 - Notifications (Priority: P3)

Users receive notifications about important events (moderation decisions, application decisions,
course completion, review reply, hidden review, new review, new items for administrators), see the
unread counter in the header and a list of notifications linking to the objects.

**Why this priority**: it connects the roles, but the product works without it.

**Independent Test**: after a course is approved, the author sees an increased counter and a
notification linking to the course within a minute.

**Acceptance Scenarios**:

1. **Given** a new notification, **Then** the counter updates within 60 seconds or immediately when
   returning to the tab.
2. **Given** the user clicked "mark all as read", **Then** the counter becomes zero on the site and in
   the dashboard.

---

### User Story 12 - Student learning tools (Priority: P3)

The student keeps private notes for lessons (stored on their device, exportable to a file), selects
a term in the lesson text and gets a short Wikipedia summary, and sees video titles and thumbnails.

**Why this priority**: improves convenience and covers the lab 2 requirements for external APIs and
local storage, but does not affect the learning loop.

**Independent Test**: select a word in a lesson and get a summary; write a note, reload the page, the
note is still there; export the course notes.

**Acceptance Scenarios**:

1. **Given** there is no article in the interface language for the term, **Then** the article in the
   other language is shown; if neither exists, a clear message.
2. **Given** the external reference service is unavailable, **Then** an error message is shown and the
   lesson keeps working.
3. **Given** the user logged out, **Then** their notes, drafts and unfinished quizzes are removed from
   the device, while the theme and language are kept.

---

### User Story 13 - A third-party client works through the programmatic interface (Priority: P3)

A third-party client developer (or the lab 3 examiner) opens the interactive documentation, obtains
a token by logging in, reads the catalog and courses and performs actions (enrollment, learning,
quizzes, reviews, course creation, moderation) according to roles, using a ready-made request
collection.

**Why this priority**: mandatory lab 3 demo; functionally relies on the flows already implemented.

**Independent Test**: run the request collection per `docs/tz.md` 8.3 from student login to the
approved course appearing in the catalog.

**Acceptance Scenarios**:

1. **Given** a request without a token to a protected method, **Then** the response is
   "unauthorized" in the single error format.
2. **Given** a student token and an administrator method, **Then** the response is "forbidden".
3. **Given** invalid data, **Then** the response contains an error code and a list of fields with
   reasons, in the language requested by the client.

---

### User Story 14 - Profile, settings and appearance (Priority: P3)

The user edits their profile (name, "About me", links, avatar); an instructor has a public author
page; the user chooses a light, dark or system theme that applies equally to the site, the admin
panel and the dashboard.

**Why this priority**: product completeness; does not block other flows.

**Independent Test**: change the avatar and the theme, go from the site to the dashboard and back:
theme and avatar are the same everywhere, with no flashing on load.

**Acceptance Scenarios**:

1. **Given** an avatar file larger than 1 MB or not an image, **Then** the upload is rejected with a
   reason.
2. **Given** the dark theme is selected, **When** any page of the site opens, **Then** it is rendered
   in the dark theme immediately.

---

### Edge Cases

- A course is unpublished or archived while a student is taking it: the student keeps access to the
  materials, the course disappears from the catalog, new enrollments are impossible.
- The author deletes the lesson that was the last uncompleted one: progress is recalculated, and if
  all remaining lessons are completed the course completes with a certificate.
- The author changes quiz questions after students' attempts: past results do not change.
- Two simultaneous requests complete the same lesson: the certificate is issued once.
- An attempt answering a question from another quiz or with a foreign option is rejected.
- A user loses the instructor role: their published courses stay in the catalog but they cannot edit
  them.
- Browser storage is unavailable or its data is corrupted: the interface works, and local features
  (notes, drafts) show a warning.
- External reference or video data services do not respond: the rest of the page works.
- A password reset or email verification link is reused or expired.
- Resending the verification email more often than once every 60 seconds is rejected.
- The user signed in long ago and returns after several hours: while the session is valid, they stay
  signed in on both the site and the dashboard without logging in again.
- A visitor sends an unsupported `Accept-Language` (e.g. `de`): Ukrainian is used.
- A long Ukrainian label in a narrow layout: it wraps instead of overflowing or being cut off.
- An email triggered by an administrator working in Ukrainian is sent to an English-speaking user:
  it is written in English.
- Empty states: no courses in the dashboard, no notifications, no search results, no reviews on a
  course: each shows a hint about what to do next.

## Requirements *(mandatory)*

### Functional Requirements

**Account and access**

- **FR-001**: System MUST allow registration with name, email and password (at least 8 characters,
  at least one letter and one digit) with email uniqueness regardless of case (FR-AUTH-1).
- **FR-002**: System MUST send an email verification email and restrict unverified users per BR-U4
  (FR-AUTH-3).
- **FR-003**: System MUST support login, logout, logout from all devices, password recovery and
  change, and email change with verification of the new address (FR-AUTH-2, 4–7).
- **FR-004**: System MUST limit password guessing (5 failed attempts within 15 minutes) and MUST NOT
  reveal whether an email exists in login and reset responses.
- **FR-005**: System MUST support the "student", "instructor" and "administrator" roles and check
  permissions and object ownership on every action per the permission matrix (TZ 3.2).
- **FR-006**: System MUST immediately end the sessions of a blocked user and forbid their login.

**Public site**

- **FR-007**: System MUST render on the server the home page, catalog, course page, preview lesson,
  author page, "Become an instructor" and certificate verification from current data
  (FR-SITE-1–8).
- **FR-008**: The catalog MUST support search, filters by category, level, content language, tag and
  minimum rating, four sort orders and pagination by 12, with parameters in the page address and
  working without browser scripts.
- **FR-009**: System MUST provide static pages: about, FAQ, terms, privacy policy, contacts
  (FR-SITE-6).
- **FR-010**: System MUST show only published courses in the catalog, search, home page and author
  pages, and permanently redirect from an old course address.
- **FR-011**: System MUST provide unique page titles and descriptions, social preview data on the
  course page, a sitemap and rules for search robots (FR-SITE-12).

**Learning**

- **FR-012**: Users MUST be able to enroll in published courses and leave them (BR-E1, BR-E2), except
  courses with an issued certificate; a guest who started enrolling MUST be enrolled automatically
  after logging in or registering.
- **FR-013**: System MUST give full lesson content only to enrolled users, the author and
  administrators; others get preview lessons only (BR-E3).
- **FR-014**: System MUST track progress per BR-L1–L3 and remember the last opened lesson.
- **FR-015**: System MUST automatically and only once complete the course and issue a certificate
  when all lessons are completed (BR-C1–C3).
- **FR-016**: System MUST provide a student dashboard: "Continue learning", active courses,
  certificates, notifications and recommendations; "My courses" with tabs and search; the course
  player (FR-LEARN-2–4).
- **FR-017**: System MUST support text lessons with formatting and code highlighting and video
  lessons with an embedded YouTube and Vimeo player.
- **FR-018**: System MUST give the author a course preview mode that does not save progress.

**Quizzes**

- **FR-019**: System MUST support single and multiple correct answer questions, points,
  explanations and quiz settings: passing score, attempt limit, shuffling, answer reveal mode
  (FR-QUIZ-1–2).
- **FR-020**: System MUST grade attempts only on the server per BR-Q1–Q5 and never send correct
  answers to a student before the attempt is submitted.
- **FR-021**: System MUST save an unfinished attempt on the student's device and restore it after a
  reload.
- **FR-022**: System MUST show the result with a review and the attempt history; the author MUST be
  able to reset attempts for a student.

**Reviews and certificates**

- **FR-023**: Users MUST be able to create, edit and delete one review per course when BR-R1, BR-R2
  and BR-U4 are satisfied; the course author MUST be able to reply to a review.
- **FR-024**: System MUST compute the course rating from visible reviews (average to 0.1 and count)
  and the distribution by rating.
- **FR-025**: System MUST issue a certificate with a unique 10-character code without look-alike
  characters and a public printable verification page; an administrator MUST be able to revoke a
  certificate.

**Teaching**

- **FR-026**: Users MUST be able to apply for the instructor role per BR-U1.
- **FR-027**: An instructor MUST be able to create, edit, archive, restore and (per BR-P5) delete
  their courses; manage modules and lessons and reorder them by drag and drop, including between
  modules (FR-TEACH-2–4).
- **FR-028**: System MUST run the course lifecycle "draft → review → published → archived" per
  BR-P1–P6 and show the author a readiness checklist.
- **FR-029**: The lesson editor MUST autosave a local draft and offer to restore it, and warn about
  unsaved changes when leaving.
- **FR-030**: An instructor MUST see a summary of courses, the course student list with search,
  sorting and CSV export, course statistics (FR-TEACH-1, 5, 6) and reviews of their courses.

**Administration**

- **FR-031**: System MUST provide a server-rendered admin panel: dashboard, users, course moderation,
  applications, categories, reviews, certificates, audit log (FR-ADMIN-1–8).
- **FR-032**: System MUST require a reason when rejecting a course, unpublishing, rejecting an
  application, blocking a user, hiding a review and revoking a certificate.
- **FR-033**: System MUST prevent deleting categories with courses and losing the last active
  administrator (BR-U3).
- **FR-034**: System MUST write every state-changing administrator action to the audit log.

**Notifications**

- **FR-035**: System MUST create in-app notifications for the FR-NOTIFY-1 events, show the unread
  counter on the site and in the dashboard, and allow marking notifications as read.
- **FR-036**: System MUST send emails on registration, email verification and change, password reset,
  instructor application decision and course moderation decision.

**Learning tools and local data**

- **FR-037**: Users MUST be able to keep lesson notes on their device and export the course notes to
  a text file.
- **FR-038**: System MUST show a short Wikipedia summary for text selected in a lesson, trying the
  interface language first and the other language second, and cache the last 20 summaries on the
  device.
- **FR-039**: System MUST show the video title and thumbnail for a link in the editor and the course
  curriculum, obtained from a public service.
- **FR-040**: System MUST keep on the user's device the theme, language, notes, unfinished quizzes,
  lesson and course drafts, lookup cache and UI state, and clear personal data on logout (TZ 5.12).

**Programmatic interface**

- **FR-041**: System MUST provide a documented programmatic interface with read and action methods
  for every student, instructor and administrator flow, with token authentication, one error format
  and pagination (TZ 8).
- **FR-042**: System MUST publish interactive documentation of the interface and ship a request
  collection with a demo flow.

**Profile and appearance**

- **FR-043**: Users MUST be able to edit their profile and avatar (FR-PROFILE-1–2); an instructor
  MUST have a public author page (FR-PROFILE-3).
- **FR-044**: System MUST support light, dark and system themes applied equally to every part of the
  product without flashing on load.
- **FR-045**: The interface MUST be responsive for widths 360–1440 px and meet the accessibility
  requirements (TZ 9.4); languages are covered by FR-049–FR-055.
- **FR-046**: Every dashboard screen MUST have loading, empty, error (retry for transient failures,
  navigation to a safe place for terminal ones) and success states. Long dashboard lists (course
  students, notifications, reviews) load more items on scroll instead of page navigation.

**Data and setup**

- **FR-047**: System MUST ship demo data per TZ 7.4, including accounts for every role.
- **FR-048**: System MUST run entirely locally without external accounts or keys; emails MUST land in
  a local development mailbox.

**Localization**

- **FR-049**: The interface MUST be available in Ukrainian (default) and English in every part of the
  product: public site, admin panel, dashboard, emails, validation and error messages (FR-I18N-1, 4).
- **FR-050**: System MUST determine the language per request in the order: explicit choice in the
  address, remembered choice, account language, browser preference, Ukrainian (FR-I18N-2).
- **FR-051**: Users MUST be able to switch the language on the site, in the admin panel and in the
  dashboard; the choice MUST be remembered and, for signed-in users, saved to the account; the
  dashboard MUST switch without a page reload (FR-I18N-3).
- **FR-052**: Emails and notifications MUST be in the recipient's language; notifications MUST be
  rendered in the language active when they are viewed (FR-NOTIFY-2, 4).
- **FR-053**: Dates, numbers, percentages and plural forms MUST follow the rules of the active
  language (FR-I18N-5).
- **FR-054**: Every course MUST declare its content language, shown on cards and the course page and
  usable as a catalog filter; category names MUST exist in both languages (FR-I18N-6, FR-CATALOG-1).
- **FR-055**: A missing or mismatched translation MUST be detected automatically before release
  (FR-I18N-7).

### Key Entities

- **User**: name, email and verification flag, role, status (active/blocked), preferred language,
  profile (about, links, avatar).
- **Session**: a long-lived sign-in token of a user on a device; can be revoked.
- **One-time token**: for password reset or email verification, with an expiry.
- **Instructor application**: motivation, experience, status, administrator's decision and comment.
- **Category**: names in both languages, address, accent colour, order.
- **Course**: author, category, address, title, descriptions, cover, level, content language,
  learning outcomes, requirements, tags, lifecycle status, address history, moderation comment.
- **Module**: an ordered section of a course.
- **Lesson**: an ordered item of a module of type "text", "video" or "quiz", duration, preview flag.
- **Quiz**: settings (passing score, attempt limit, shuffling, answer reveal) and questions with
  options, points and explanations.
- **Enrollment**: student, course, status, last lesson and activity, dates; the set of completed
  lessons.
- **Quiz attempt**: answers, points, percent, pass flag, date.
- **Review**: rating, text, visibility status, author's reply.
- **Certificate**: code, frozen student name and course title, date, revocation flag.
- **Notification**: recipient, event type, related objects, read flag.
- **Audit entry**: administrator, action, object, details, time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new visitor goes from the home page to the first opened lesson (finding a course,
  registration, enrollment) in less than 3 minutes.
- **SC-002**: An instructor creates a course of 1 module and 3 lessons, including a quiz of 3
  questions, and submits it for moderation in less than 15 minutes.
- **SC-003**: Catalog and course pages open on a local machine with demo data in under 1 second;
  dashboard actions (completing a lesson, submitting a quiz) are reflected in the interface in under
  0.5 seconds.
- **SC-004**: 100 % of the BR-* business rules of the TZ are confirmed by automated tests.
- **SC-005**: 0 cases of a user receiving data or performing an action beyond their permissions in
  automated access-control checks for every role.
- **SC-006**: All 8 user flows of TZ section 12 pass end to end in automated e2e tests or manual
  checking against the checklist.
- **SC-007**: Every page and screen renders without horizontal scrolling at 360, 768, 1024 and
  1440 px in both themes and both languages, and text contrast meets AA.
- **SC-008**: The product starts from scratch on a clean machine with Node and Docker using at most
  5 commands from the README, without registering with any external service.
- **SC-009**: All lab 1–3 acceptance criteria of TZ section 13 are checked off.
- **SC-010**: Reloading the page during a quiz or while editing a lesson loses no entered data in any
  of the checked scenarios.
- **SC-011**: 0 user-facing strings without a translation in either language and 0 hard-coded
  user-facing strings, as reported by the automated checks.

## Assumptions

- The product is educational with a small load (tens of concurrent users); scaling and high
  availability are out of scope.
- Sign-in through external services (OAuth) is excluded so that implementation needs no external
  accounts.
- Video is hosted on YouTube or Vimeo; there is no own video hosting.
- In development emails go to a local mailbox; real email delivery is not required.
- Courses are free; payments, chats, live sessions, manually graded assignments, lesson comments,
  server-side PDF generation, languages beyond Ukrainian and English, translation of user-generated
  content and locale prefixes in URLs are out of scope (TZ 15).
- Student notes are stored only on their device and are not synchronized between devices.
- Deployment to public servers and the security audit belong to labs 4 and 5 and are not done in
  this feature, but the product prepares for them (TZ 16).
- External reference services (Wikipedia, video data) are public and keyless; when unavailable,
  these features degrade without errors for the rest of the interface.
- The demo content is written in Ukrainian for most courses and in English for two of them.
