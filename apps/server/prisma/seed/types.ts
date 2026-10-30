import type { Accent, CourseLevel, CourseStatus, Locale } from '@learnly/contracts/enums';

export type AuthorKey = 'olena' | 'taras' | 'iryna';
export type CategoryKey =
  | 'programming'
  | 'design'
  | 'data-science'
  | 'marketing'
  | 'languages'
  | 'productivity';

export interface CategorySeed {
  key: CategoryKey;
  nameUk: string;
  nameEn: string;
  accent: Accent;
}

interface QuestionSeed {
  text: string;
  explanation?: string;
  points?: number;
  /** `[text, isCorrect]`; more than one correct option makes it a multiple-choice question. */
  options: [string, boolean][];
}

interface LessonBase {
  title: string;
  minutes: number;
  preview?: boolean;
}

export type LessonSeed =
  | (LessonBase & { type: 'text'; content: string })
  | (LessonBase & { type: 'video'; videoUrl: string; content: string })
  | (LessonBase & {
      type: 'quiz';
      quiz: { passScore?: number; maxAttempts?: number; questions: QuestionSeed[] };
    });

interface ModuleSeed {
  title: string;
  lessons: LessonSeed[];
}

export interface CourseSeed {
  title: string;
  shortDescription: string;
  description: string;
  outcomes: string[];
  requirements: string[];
  tags: string[];
  category: CategoryKey;
  author: AuthorKey;
  language: Locale;
  level: CourseLevel;
  status: CourseStatus;
  modules: ModuleSeed[];
}
