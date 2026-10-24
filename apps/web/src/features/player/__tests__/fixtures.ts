import type { LearnCourse, LessonContent } from '@learnly/contracts/learning';

export const COURSE_ID = '01970000-0000-7000-8000-00000000c001';
export const MODULE_1 = '01970000-0000-7000-8000-00000000a001';
export const MODULE_2 = '01970000-0000-7000-8000-00000000a002';
export const LESSON_1 = '01970000-0000-7000-8000-00000000b001';
export const LESSON_2 = '01970000-0000-7000-8000-00000000b002';
export const LESSON_3 = '01970000-0000-7000-8000-00000000b003';
export const QUIZ_ID = '01970000-0000-7000-8000-00000000d001';

export function learnCourse(overrides: Partial<LearnCourse> = {}): LearnCourse {
  return {
    course: { id: COURSE_ID, slug: 'js-basics', title: 'Основи JavaScript', language: 'uk' },
    mode: 'student',
    progress: 33,
    status: 'active',
    lastLessonId: LESSON_2,
    modules: [
      {
        id: MODULE_1,
        title: 'Вступ',
        lessons: [
          { id: LESSON_1, title: 'Що таке JavaScript', type: 'text', durationMinutes: 5, completed: true, quizId: null },
          { id: LESSON_2, title: 'Змінні', type: 'video', durationMinutes: 12, completed: false, quizId: null },
        ],
      },
      {
        id: MODULE_2,
        title: 'Перевірка',
        lessons: [{ id: LESSON_3, title: 'Тест', type: 'quiz', durationMinutes: 10, completed: false, quizId: QUIZ_ID }],
      },
    ],
    ...overrides,
  };
}

export function lessonContent(overrides: Partial<LessonContent> = {}): LessonContent {
  return {
    id: LESSON_2,
    courseId: COURSE_ID,
    title: 'Змінні',
    type: 'text',
    content: '## Оголошення\n\n`let` і `const`.',
    videoUrl: null,
    durationMinutes: 12,
    quizId: null,
    prevLessonId: LESSON_1,
    nextLessonId: LESSON_3,
    completed: false,
    ...overrides,
  };
}
