import type {
  CreateLessonInput,
  LessonEditor,
  ModuleDto,
  StructureInput,
  UpdateLessonInput,
} from '@learnly/contracts/instructor';
import { db } from '../../lib/db.js';
import { notFound, ruleViolation } from '../../lib/errors.js';
import type { AuthUser } from '../auth/auth.types.js';
import { assertEditable, ownCourse } from '../courses/courses.service.js';
import { checkCompletion, lockEnrollment } from '../learning/progress.service.js';
import { quizEditorInclude, toQuizEditor } from '../quizzes/quiz-editor.js';

const moduleInclude = { lessons: { orderBy: { position: 'asc' } } } as const;

function toModuleDto(module: {
  id: string;
  title: string;
  position: number;
  lessons: { id: string; title: string; type: LessonEditor['type']; durationMinutes: number; isPreview: boolean; position: number }[];
}): ModuleDto {
  return {
    id: module.id,
    title: module.title,
    position: module.position,
    lessons: module.lessons.map(({ id, title, type, durationMinutes, isPreview, position }) => ({
      id,
      title,
      type,
      durationMinutes,
      isPreview,
      position,
    })),
  };
}

/** The course must be the user's and editable (BR-P2, BR-P4). */
async function editableCourse(user: AuthUser, courseId: string) {
  const course = await ownCourse(user, courseId);
  assertEditable(course.status);
  return course;
}

async function moduleOf(user: AuthUser, moduleId: string) {
  const module = await db.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!module) throw notFound();
  await editableCourse(user, module.courseId);
  return module;
}

async function lessonOf(user: AuthUser, lessonId: string, options: { forEditing: boolean }) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } }, quiz: { include: quizEditorInclude } },
  });
  if (!lesson) throw notFound();
  const course = await ownCourse(user, lesson.module.courseId);
  if (options.forEditing) assertEditable(course.status);
  return { lesson, course };
}

/** BR-C3: after lessons disappear, an enrollment whose remaining lessons are all done is completed. */
async function recheckCompletions(courseId: string): Promise<void> {
  const enrollments = await db.enrollment.findMany({ where: { courseId, status: 'active' }, select: { id: true } });
  for (const { id } of enrollments) {
    await db.$transaction(async (tx) => {
      await lockEnrollment(tx, id);
      await checkCompletion(tx, id);
    });
  }
}

export async function createModule(user: AuthUser, courseId: string, title: string): Promise<ModuleDto> {
  await editableCourse(user, courseId);
  const { _max } = await db.module.aggregate({ where: { courseId }, _max: { position: true } });
  const position = (_max.position ?? -1) + 1;
  return toModuleDto(await db.module.create({ data: { courseId, title, position }, include: moduleInclude }));
}

export async function renameModule(user: AuthUser, moduleId: string, title: string): Promise<ModuleDto> {
  await moduleOf(user, moduleId);
  return toModuleDto(await db.module.update({ where: { id: moduleId }, data: { title }, include: moduleInclude }));
}

export async function deleteModule(user: AuthUser, moduleId: string): Promise<void> {
  const { courseId } = await moduleOf(user, moduleId);
  await db.module.delete({ where: { id: moduleId } });
  await recheckCompletions(courseId);
}

function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && new Set(a).size === a.length && a.every((id) => b.includes(id));
}

/** Rewrites all positions at once; the payload must list exactly the course's modules and lessons. */
export async function setStructure(user: AuthUser, courseId: string, input: StructureInput): Promise<ModuleDto[]> {
  const course = await editableCourse(user, courseId);
  const moduleIds = course.modules.map((module) => module.id);
  const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  const sentLessons = input.modules.flatMap((module) => module.lessonIds);
  const matches =
    sameMembers(input.modules.map((module) => module.moduleId), moduleIds) && sameMembers(sentLessons, lessonIds);
  if (!matches) throw ruleViolation('STRUCTURE', 'errors.curriculum.structureMismatch');

  await db.$transaction(
    input.modules.flatMap((module, modulePosition) => [
      db.module.update({ where: { id: module.moduleId }, data: { position: modulePosition } }),
      ...module.lessonIds.map((lessonId, lessonPosition) =>
        db.lesson.update({ where: { id: lessonId }, data: { moduleId: module.moduleId, position: lessonPosition } }),
      ),
    ]),
  );
  const modules = await db.module.findMany({ where: { courseId }, orderBy: { position: 'asc' }, include: moduleInclude });
  return modules.map(toModuleDto);
}

async function typeLocked(lessonId: string): Promise<boolean> {
  const [completions, attempts] = await Promise.all([
    db.lessonCompletion.count({ where: { lessonId } }),
    db.quizAttempt.count({ where: { quiz: { lessonId } } }),
  ]);
  return completions + attempts > 0;
}

export async function getLessonForEditor(user: AuthUser, lessonId: string): Promise<LessonEditor> {
  const { lesson, course } = await lessonOf(user, lessonId, { forEditing: false });
  return {
    id: lesson.id,
    moduleId: lesson.moduleId,
    courseId: lesson.module.courseId,
    title: lesson.title,
    type: lesson.type,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    durationMinutes: lesson.durationMinutes,
    isPreview: lesson.isPreview,
    updatedAt: lesson.updatedAt.toISOString(),
    quiz: lesson.quiz ? toQuizEditor(lesson.quiz) : null,
    typeLocked: await typeLocked(lesson.id),
    editable: course.status === 'draft' || course.status === 'published',
  };
}

export async function createLesson(user: AuthUser, moduleId: string, input: CreateLessonInput): Promise<LessonEditor> {
  await moduleOf(user, moduleId);
  const { _max } = await db.lesson.aggregate({ where: { moduleId }, _max: { position: true } });
  const position = (_max.position ?? -1) + 1;
  const lesson = await db.lesson.create({
    data: { moduleId, ...input, position, ...(input.type === 'quiz' ? { quiz: { create: {} } } : {}) },
    select: { id: true },
  });
  return getLessonForEditor(user, lesson.id);
}

/** The type is locked once students completed or attempted the lesson; a quiz lesson always has a quiz. */
export async function updateLesson(user: AuthUser, lessonId: string, input: UpdateLessonInput): Promise<LessonEditor> {
  const { lesson } = await lessonOf(user, lessonId, { forEditing: true });
  const typeChanges = input.type !== undefined && input.type !== lesson.type;
  if (typeChanges && (await typeLocked(lessonId))) throw ruleViolation('TYPE_LOCKED', 'errors.curriculum.typeLocked');

  await db.$transaction(async (tx) => {
    await tx.lesson.update({ where: { id: lessonId }, data: input });
    if (typeChanges && input.type === 'quiz' && !lesson.quiz) await tx.quiz.create({ data: { lessonId } });
    if (typeChanges && input.type !== 'quiz' && lesson.quiz) await tx.quiz.delete({ where: { lessonId } });
  });
  return getLessonForEditor(user, lessonId);
}

export async function deleteLesson(user: AuthUser, lessonId: string): Promise<void> {
  const { lesson } = await lessonOf(user, lessonId, { forEditing: true });
  await db.lesson.delete({ where: { id: lessonId } });
  await recheckCompletions(lesson.module.courseId);
}

/** For the quiz editor: the lesson must be the author's, editable, and of the `quiz` type. */
export async function editableQuizLesson(user: AuthUser, lessonId: string): Promise<{ quizId: string }> {
  const { lesson } = await lessonOf(user, lessonId, { forEditing: true });
  if (lesson.type !== 'quiz' || !lesson.quiz) throw ruleViolation('NOT_A_QUIZ', 'errors.curriculum.notQuiz');
  return { quizId: lesson.quiz.id };
}
