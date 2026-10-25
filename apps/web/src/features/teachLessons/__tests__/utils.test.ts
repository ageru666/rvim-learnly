import type { LessonEditor } from '@learnly/contracts/instructor';
import { en } from '@learnly/i18n/messages/en';
import { describe, expect, it } from 'vitest';
import { lessonFormValidationSchema, quizFor, toLessonForm, toLessonUpdate } from '../utils';

const LESSON: LessonEditor = {
  id: '01970000-0000-7000-8000-00000000b001',
  moduleId: '01970000-0000-7000-8000-00000000a001',
  courseId: '01970000-0000-7000-8000-00000000c001',
  title: 'Variables',
  type: 'text',
  content: null,
  videoUrl: null,
  durationMinutes: 5,
  isPreview: false,
  updatedAt: '2026-10-20T10:00:00.000Z',
  quiz: null,
  typeLocked: false,
  editable: true,
};

describe('lesson editor utils', () => {
  it('maps the lesson to the form and back', () => {
    const form = toLessonForm(LESSON);
    expect(form).toMatchObject({ content: '', videoUrl: '', quiz: null });
    expect(toLessonUpdate({ ...form, title: ' Variables ', content: '  ' })).toEqual({
      title: 'Variables',
      type: 'text',
      durationMinutes: 5,
      isPreview: false,
      content: null,
      videoUrl: null,
    });
    expect(toLessonUpdate({ ...form, type: 'video', videoUrl: ' https://youtu.be/x ', content: 'Notes' })).toMatchObject({
      videoUrl: 'https://youtu.be/x',
      content: 'Notes',
    });
  });

  it('always gives a quiz lesson a quiz', () => {
    expect(toLessonForm({ ...LESSON, type: 'quiz' }).quiz).toMatchObject({ passScore: 70, questions: [] });
    expect(quizFor({ type: 'quiz', quiz: null })).toMatchObject({ questions: [] });
    expect(quizFor({ type: 'text', quiz: null })).toBeNull();
    const quiz = { passScore: 50, maxAttempts: 2, shuffle: true, revealAnswers: 'always' as const, questions: [] };
    expect(quizFor({ type: 'quiz', quiz })).toBe(quiz);
  });

  it('requires a recognized link for video lessons', () => {
    const video = { ...toLessonForm(LESSON), type: 'video' as const, videoUrl: 'https://example.com' };
    const result = lessonFormValidationSchema.safeParse(video);
    expect(result.error?.issues[0]).toMatchObject({ path: ['videoUrl'], message: 'validation.video.url' });
    expect(lessonFormValidationSchema.safeParse({ ...video, videoUrl: 'https://youtu.be/dQw4w9WgXcQ' }).success).toBe(true);
    expect(en.validation.video.url).toBeTruthy();
  });
});
