import type { LearnCourse } from '@learnly/contracts/learning';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { NotesPanel } from '../NotesPanel';
import { clampNote, exportNotesMarkdown, notesFileName } from '../utils';

const COURSE_ID = '01970000-0000-7000-8000-00000000c001';
const L1 = '01970000-0000-7000-8000-00000000b001';
const L2 = '01970000-0000-7000-8000-00000000b002';
const STORAGE_KEY = `learnly:v1:notes:${COURSE_ID}`;

const COURSE: LearnCourse = {
  course: { id: COURSE_ID, slug: 'js', title: 'Основи JavaScript', language: 'uk' },
  mode: 'student',
  progress: 0,
  status: 'active',
  lastLessonId: null,
  modules: [
    {
      id: '01970000-0000-7000-8000-00000000a001',
      title: 'Вступ',
      lessons: [
        { id: L1, title: 'Змінні', type: 'text', durationMinutes: 5, completed: false, quizId: null },
        { id: L2, title: 'Функції', type: 'text', durationMinutes: 5, completed: false, quizId: null },
      ],
    },
  ],
};

describe('notes utils', () => {
  it('exports notes in curriculum order with localized headings', () => {
    const markdown = exportNotesMarkdown({
      courseTitle: 'JS',
      lessons: [{ id: 'a', title: 'First' }, { id: 'b', title: 'Second' }, { id: 'c', title: 'Empty' }],
      notes: { b: { text: 'Second note', updatedAt: '' }, a: { text: ' First note ', updatedAt: '' }, c: { text: '  ', updatedAt: '' }, gone: { text: 'x', updatedAt: '' } },
      headings: { course: (title) => `Notes: ${title}`, lesson: (title) => `Lesson: ${title}`, exportedOn: 'Exported today' },
    });
    expect(markdown).toBe('# Notes: JS\n\n_Exported today_\n\n## Lesson: First\n\nFirst note\n\n## Lesson: Second\n\nSecond note\n');
  });

  it('limits notes to 20 000 characters and builds a safe file name', () => {
    expect(clampNote('x'.repeat(20_005))).toHaveLength(20_000);
    expect(notesFileName('JS: основи / вступ')).toBe('JS-основи-вступ.md');
    expect(notesFileName('???')).toBe('notes.md');
  });
});

describe('NotesPanel', () => {
  it('saves a note per lesson on this device and shows it again after a reload', async () => {
    document.cookie = 'locale=uk; path=/';
    const first = renderWithStore(<NotesPanel course={COURSE} lessonId={L1} />);
    await userEvent.type(await screen.findByLabelText('Нотатка до уроку «Змінні»'), 'let і const');
    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toContain('let і const'), { timeout: 3000 });
    expect(await screen.findByText(/Збережено о/)).toBeInTheDocument();
    first.unmount();

    renderWithStore(<NotesPanel course={COURSE} lessonId={L1} />);
    const restored = await screen.findByLabelText('Нотатка до уроку «Змінні»');
    await waitFor(() => expect(restored).toHaveValue('let і const'));
    expect(screen.getByRole('button', { name: 'Експортувати в .md' })).toBeEnabled();
    expect(screen.getByText('Змінні', { selector: 'li' })).toBeInTheDocument();
  });

  it('warns when browser storage is unavailable', async () => {
    document.cookie = 'locale=uk; path=/';
    const denied = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    try {
      renderWithStore(<NotesPanel course={COURSE} lessonId={L2} />);
      expect(await screen.findByText(/Сховище браузера недоступне/)).toBeInTheDocument();
    } finally {
      denied.mockRestore();
    }
  });
});
