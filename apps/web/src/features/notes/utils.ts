import { LIMITS } from '@learnly/contracts/limits';

interface StoredNote {
  text: string;
  updatedAt: string;
}

export type CourseNotes = Record<string, StoredNote>;

export function clampNote(text: string): string {
  return text.slice(0, LIMITS.noteText.max);
}

interface ExportInput {
  courseTitle: string;
  /** Lessons in curriculum order; notes of other (deleted) lessons are left out. */
  lessons: { id: string; title: string }[];
  notes: CourseNotes;
  headings: { course: (title: string) => string; lesson: (title: string) => string; exportedOn: string };
}

/** The course notes as Markdown, with localized headings, in curriculum order. */
export function exportNotesMarkdown({ courseTitle, lessons, notes, headings }: ExportInput): string {
  const sections = lessons.flatMap((lesson) => {
    const text = notes[lesson.id]?.text.trim();
    return text ? [`## ${headings.lesson(lesson.title)}\n\n${text}\n`] : [];
  });
  return [`# ${headings.course(courseTitle)}\n`, `_${headings.exportedOn}_\n`, ...sections].join('\n');
}

/** A safe file name from the course title. */
export function notesFileName(courseTitle: string): string {
  const base = courseTitle.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 60);
  return `${base || 'notes'}.md`;
}
