import type { Locale } from '@learnly/contracts/enums';
import { CERTIFICATE_CODE_ALPHABET, CERTIFICATE_CODE_LENGTH } from '@learnly/contracts/limits';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import type { SeededCourse, SeededLesson, SeededQuestion } from './catalog.js';
import { englishForIt } from './content/english.js';
import { timeManagement } from './content/personal.js';
import { javascriptBasics } from './content/programming.js';
import { daysAgo, faker, randomDateBetween } from './random.js';
import type { SeededUsers } from './users.js';

/** student index (1-based) → course title: these enrollments are completed and get certificates. */
const COMPLETIONS: [number, string][] = [
  [1, javascriptBasics.title],
  [2, englishForIt.title],
  [3, timeManagement.title],
];
const UNVERIFIED_STUDENT = 15;
const PENDING_APPLICANT = 13;
const REJECTED_APPLICANT = 14;
const REVIEW_MIN_SHARE = 0.3;

const REVIEW_TEXTS = {
  uk: [
    'Чудовий курс: усе пояснено простою мовою, приклади одразу можна повторити.',
    'Корисні тести після модулів, добре закріплюють матеріал.',
    'Хотілося б більше практичних завдань, але загалом дуже сподобалося.',
    'Нарешті розібралася з темою, яку давно відкладала. Дякую автору!',
    'Структура зрозуміла, уроки короткі — зручно проходити після роботи.',
    'Добрий вступ, але для мене трохи заповільно на початку.',
  ],
  en: [
    'Clear, practical and well structured. I used the phrases at work the next day.',
    'Great examples and short lessons, perfect for busy weeks.',
    'Good course overall, I would love a few more exercises.',
    'The quizzes helped me notice what I had missed.',
  ],
} as const;

const AUTHOR_REPLIES = {
  uk: 'Дякую за відгук! Радий, що курс став у пригоді.',
  en: 'Thank you for the feedback, glad the course helped!',
} as const;

type ResultSnapshot = Record<
  string,
  { correct: boolean; points: number; correctOptionIds: string[]; explanation: string | null }
>;

function correctOptionIds(question: SeededQuestion): string[] {
  return question.options.filter((option) => option.isCorrect).map((option) => option.id);
}

/** A passing attempt answers everything correctly; a failing one gets only the first question right. */
function buildAttempt(questions: SeededQuestion[], passed: boolean) {
  const answers: Record<string, string[]> = {};
  const result: ResultSnapshot = {};
  let scorePoints = 0;
  const maxPoints = questions.reduce((sum, question) => sum + question.points, 0);
  questions.forEach((question, index) => {
    const correct = passed || index === 0;
    const wrongOption = question.options.find((option) => !option.isCorrect);
    answers[question.id] = correct ? correctOptionIds(question) : wrongOption ? [wrongOption.id] : [];
    if (correct) scorePoints += question.points;
    result[question.id] = {
      correct,
      points: correct ? question.points : 0,
      correctOptionIds: correctOptionIds(question),
      explanation: question.explanation,
    };
  });
  return {
    answers,
    result,
    scorePoints,
    maxPoints,
    scorePercent: Math.round((scorePoints / maxPoints) * 100),
    passed,
  };
}

function certificateCode(): string {
  return faker.string.fromCharacters(CERTIFICATE_CODE_ALPHABET, CERTIFICATE_CODE_LENGTH);
}

interface EnrollmentPlan {
  studentId: string;
  course: SeededCourse;
  completedCount: number;
}

function planEnrollments(courses: SeededCourse[], users: SeededUsers): EnrollmentPlan[] {
  const plans: EnrollmentPlan[] = [];
  const verifiedStudents = users.students.slice(0, UNVERIFIED_STUDENT - 1);
  for (const course of courses.filter((candidate) => candidate.status === 'published')) {
    const completedBy = new Set(
      COMPLETIONS.filter(([, title]) => title === course.title).map(
        ([index]) => users.students[index - 1],
      ),
    );
    const participants = new Set([
      ...completedBy,
      ...faker.helpers.arrayElements(verifiedStudents, { min: 6, max: 11 }),
    ]);
    for (const studentId of participants) {
      if (!studentId) continue;
      const lessonCount = course.lessons.length;
      const completedCount = completedBy.has(studentId)
        ? lessonCount
        : Math.floor(faker.number.float({ min: 0, max: 0.95 }) * lessonCount);
      plans.push({ studentId, course, completedCount });
    }
  }
  const unverified = users.students[UNVERIFIED_STUDENT - 1];
  const firstPublished = courses.find((course) => course.status === 'published');
  if (unverified && firstPublished) {
    plans.push({ studentId: unverified, course: firstPublished, completedCount: 1 });
  }
  return plans;
}

async function recordQuizAttempts(
  db: PrismaClient,
  enrollmentId: string,
  lesson: SeededLesson,
  completed: boolean,
  at: Date,
): Promise<void> {
  if (!lesson.quiz) return;
  const failedFirst = !completed || faker.datatype.boolean(0.35);
  if (failedFirst) {
    await db.quizAttempt.create({
      data: { enrollmentId, quizId: lesson.quiz.id, submittedAt: at, ...buildAttempt(lesson.quiz.questions, false) },
    });
  }
  if (completed) {
    await db.quizAttempt.create({
      data: { enrollmentId, quizId: lesson.quiz.id, submittedAt: at, ...buildAttempt(lesson.quiz.questions, true) },
    });
  }
}

async function seedEnrollment(db: PrismaClient, plan: EnrollmentPlan, users: SeededUsers) {
  const { course, completedCount, studentId } = plan;
  const lessonCount = course.lessons.length;
  const isCompleted = completedCount === lessonCount;
  const enrolledAt = randomDateBetween(100, 8);
  const lastActivityAt = faker.date.between({ from: enrolledAt, to: daysAgo(0) });
  const lastLesson = course.lessons[Math.min(completedCount, lessonCount - 1)];

  const enrollment = await db.enrollment.create({
    data: {
      userId: studentId,
      courseId: course.id,
      enrolledAt,
      lastActivityAt,
      lastLessonId: completedCount > 0 ? (lastLesson?.id ?? null) : null,
      status: isCompleted ? 'completed' : 'active',
      completedAt: isCompleted ? lastActivityAt : null,
    },
    select: { id: true },
  });

  for (const [index, lesson] of course.lessons.entries()) {
    const completed = index < completedCount;
    if (completed) {
      await db.lessonCompletion.create({
        data: { enrollmentId: enrollment.id, lessonId: lesson.id, completedAt: lastActivityAt },
      });
    }
    const attempted = completed || index === completedCount;
    if (attempted) await recordQuizAttempts(db, enrollment.id, lesson, completed, lastActivityAt);
  }

  if (isCompleted) {
    const code = certificateCode();
    await db.certificate.create({
      data: {
        enrollmentId: enrollment.id,
        code,
        studentName: users.names.get(studentId) ?? '',
        courseTitle: course.title,
        authorName: users.names.get(course.authorId) ?? '',
        issuedAt: lastActivityAt,
      },
    });
    await db.notification.create({
      data: {
        userId: studentId,
        type: 'course_completed',
        payload: { courseId: course.id, courseTitle: course.title, courseSlug: course.slug, certificateCode: code },
        createdAt: lastActivityAt,
      },
    });
  }
  return { enrollmentId: enrollment.id, progressShare: completedCount / lessonCount, lastActivityAt };
}

async function seedReview(
  db: PrismaClient,
  plan: EnrollmentPlan,
  language: Locale,
  createdAt: Date,
  index: number,
): Promise<void> {
  const texts = REVIEW_TEXTS[language];
  const rating = faker.helpers.weightedArrayElement([
    { weight: 5, value: 5 },
    { weight: 4, value: 4 },
    { weight: 2, value: 3 },
    { weight: 1, value: 2 },
  ]);
  const replied = index % 3 === 0;
  const hidden = index === 7;
  const review = await db.review.create({
    data: {
      userId: plan.studentId,
      courseId: plan.course.id,
      rating,
      text: texts[index % texts.length] ?? texts[0],
      createdAt,
      status: hidden ? 'hidden' : 'visible',
      hiddenReason: hidden ? 'Відгук містить рекламу стороннього сервісу.' : null,
      authorReply: replied ? AUTHOR_REPLIES[language] : null,
      authorRepliedAt: replied ? createdAt : null,
    },
    select: { id: true },
  });
  const payload = { courseId: plan.course.id, courseTitle: plan.course.title, reviewId: review.id };
  await db.notification.create({
    data: { userId: plan.course.authorId, type: 'course_new_review', payload, createdAt },
  });
  if (replied) {
    await db.notification.create({
      data: { userId: plan.studentId, type: 'review_replied', payload, createdAt, readAt: createdAt },
    });
  }
  if (hidden) {
    await db.notification.create({
      data: {
        userId: plan.studentId,
        type: 'review_hidden',
        payload: { ...payload, comment: 'Відгук містить рекламу стороннього сервісу.' },
        createdAt,
      },
    });
  }
}

async function seedApplications(db: PrismaClient, users: SeededUsers): Promise<void> {
  const pending = users.students[PENDING_APPLICANT - 1];
  const rejected = users.students[REJECTED_APPLICANT - 1];
  if (!pending || !rejected) return;

  const pendingApplication = await db.instructorApplication.create({
    data: {
      userId: pending,
      motivation:
        'Працюю тестувальником пʼять років і хочу створити курс з основ автоматизації тестування для початківців.',
      experience: 'Проводжу внутрішні воркшопи для команди QA.',
      createdAt: daysAgo(2),
    },
  });
  await db.notification.create({
    data: {
      userId: users.adminId,
      type: 'admin_application_submitted',
      payload: { applicationId: pendingApplication.id },
      createdAt: daysAgo(2),
    },
  });

  const comment = 'Опишіть, будь ласка, тему курсу та свій досвід детальніше.';
  const rejectedApplication = await db.instructorApplication.create({
    data: {
      userId: rejected,
      motivation: 'Хочу викладати. Маю досвід роботи з різними технологіями і люблю ділитися знаннями з іншими.',
      status: 'rejected',
      reviewedById: users.adminId,
      reviewComment: comment,
      reviewedAt: daysAgo(10),
      createdAt: daysAgo(12),
    },
  });
  await db.notification.create({
    data: { userId: rejected, type: 'application_rejected', payload: { comment }, createdAt: daysAgo(10) },
  });
  await db.auditLogEntry.create({
    data: {
      actorId: users.adminId,
      action: 'application.reject',
      entityType: 'instructor_application',
      entityId: rejectedApplication.id,
      createdAt: daysAgo(10),
    },
  });
}

async function seedModeration(db: PrismaClient, courses: SeededCourse[], users: SeededUsers) {
  for (const course of courses) {
    if (course.status === 'published' || course.status === 'archived') {
      await db.auditLogEntry.create({
        data: { actorId: users.adminId, action: 'course.approve', entityType: 'course', entityId: course.id },
      });
    }
    if (course.status === 'pending_review') {
      await db.notification.create({
        data: {
          userId: users.adminId,
          type: 'admin_course_submitted',
          payload: { courseId: course.id, courseTitle: course.title },
        },
      });
    }
  }
}

export async function seedActivity(
  db: PrismaClient,
  courses: SeededCourse[],
  users: SeededUsers,
): Promise<{ enrollments: number; reviews: number }> {
  let reviews = 0;
  const plans = planEnrollments(courses, users);
  for (const plan of plans) {
    const { progressShare, lastActivityAt } = await seedEnrollment(db, plan, users);
    const eligible = progressShare >= REVIEW_MIN_SHARE && plan.studentId !== users.students[UNVERIFIED_STUDENT - 1];
    if (eligible && faker.datatype.boolean(0.85)) {
      await seedReview(db, plan, plan.course.language, lastActivityAt, reviews);
      reviews += 1;
    }
  }
  await seedApplications(db, users);
  await seedModeration(db, courses, users);
  return { enrollments: plans.length, reviews };
}
