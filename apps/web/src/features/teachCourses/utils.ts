import type { CourseStatus } from '@learnly/contracts/enums';
import type { CourseEditor, UpdateCourseInput } from '@learnly/contracts/instructor';
import type { StatusTone } from '../../shared/components/Badge';

const STATUS_TONES: Record<CourseStatus, StatusTone> = {
  draft: 'neutral',
  pending_review: 'warning',
  published: 'success',
  archived: 'info',
};

export function statusTone(status: CourseStatus): StatusTone {
  return STATUS_TONES[status];
}

/** The "Basics" form values: every editable field as the form holds it (no nulls). */
export interface CourseForm {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  level: CourseEditor['level'];
  language: CourseEditor['language'];
  tags: string[];
  outcomes: string[];
  requirements: string[];
}

export function toCourseForm(course: CourseEditor): CourseForm {
  return {
    title: course.title,
    slug: course.slug,
    shortDescription: course.shortDescription ?? '',
    description: course.description ?? '',
    categoryId: course.categoryId ?? '',
    level: course.level,
    language: course.language,
    tags: course.tags,
    outcomes: course.outcomes,
    requirements: course.requirements,
  };
}

/** Only the fields that changed are sent; empty list items are dropped. */
export function toCourseUpdate(form: CourseForm, course: CourseEditor): UpdateCourseInput {
  const current = toCourseForm(course);
  const cleaned: CourseForm = {
    ...form,
    outcomes: form.outcomes.map((item) => item.trim()).filter(Boolean),
    requirements: form.requirements.map((item) => item.trim()).filter(Boolean),
  };
  const update: Partial<Record<keyof CourseForm, unknown>> = {};
  for (const key of Object.keys(cleaned) as (keyof CourseForm)[]) {
    const changed = JSON.stringify(cleaned[key]) !== JSON.stringify(current[key]);
    // A course always keeps a category once it has one; an empty choice is not a change.
    if (changed && !(key === 'categoryId' && !cleaned.categoryId)) update[key] = cleaned[key];
  }
  return update as UpdateCourseInput;
}

/** Adds a normalized tag unless it is empty, a duplicate, or over the limit. */
export function addTag(tags: readonly string[], raw: string, max: number): string[] {
  const tag = raw.trim().toLowerCase();
  if (!tag || tags.includes(tag) || tags.length >= max) return [...tags];
  return [...tags, tag];
}
