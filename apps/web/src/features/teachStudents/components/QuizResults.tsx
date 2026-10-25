import type { StudentRow } from '@learnly/contracts/instructor';
import { RotateCcw } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { IconButton } from '../../../shared/components/IconButton';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { resetRequested } from '../teachStudentsSlice';

/** Best result per quiz; a quiz with attempts can be reset for this student. */
export function QuizResults({ student }: { student: StudentRow }) {
  const { t } = useT();
  const format = useFormat();
  const dispatch = useDispatch();
  return (
    <ul className="flex flex-col gap-1">
      {student.quizzes.map((quiz) => (
        <li key={quiz.quizId} className="flex items-center gap-1">
          <span>
            {quiz.bestScore === null
              ? t('app.students.noAttempts', { title: quiz.title })
              : t('app.students.quizResult', { title: quiz.title, score: format.percent(quiz.bestScore), attempts: quiz.attempts })}
          </span>
          {quiz.attempts > 0 && (
            <IconButton
              className="btn-sm"
              label={t('app.students.reset')}
              icon={<RotateCcw aria-hidden size={14} />}
              onClick={() => dispatch(resetRequested({ userId: student.userId, name: student.name, quizId: quiz.quizId, title: quiz.title }))}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
