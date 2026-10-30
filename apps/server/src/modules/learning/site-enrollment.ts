import type { Response } from 'express';
import { db } from '../../lib/db.js';
import { AppError } from '../../lib/errors.js';
import { setFlash } from '../../lib/flash.js';
import { enroll } from './enrollment.service.js';

function learnPath(courseId: string, lessonId?: string | null): string {
  return lessonId ? `/app/learn/${courseId}/${lessonId}` : `/app/learn/${courseId}`;
}

/**
 * Enrollment from the SSR site (the course page form and the login/registration `intent=enroll`):
 * returns where to go next. An existing enrollment simply continues the course; a broken rule
 * returns to the course page with the reason as a flash message.
 */
export async function enrollFromSite(res: Response, userId: string, slug: string): Promise<string> {
  const course = await db.course.findUnique({ where: { slug }, select: { id: true } });
  if (!course) {
    setFlash(res, { kind: 'error', key: 'errors.codes.NOT_FOUND' });
    return '/courses';
  }
  try {
    const result = await enroll(userId, course.id);
    return learnPath(course.id, result.firstLessonId);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    if (error.code === 'CONFLICT') return learnPath(course.id);
    setFlash(res, { kind: 'error', key: error.messageKey });
    return `/courses/${slug}`;
  }
}
