import type { Answers } from '@learnly/contracts/quizzes';
import { CircleCheck, Circle } from 'lucide-react';
import { cx } from '../../../shared/utils/cx';
import { useT } from '../../locale/useT';
import { isAnswered } from '../utils';

interface QuizNavigatorProps {
  order: readonly string[];
  answers: Answers;
  currentIndex: number;
  onSelect: (index: number) => void;
}

/** Answered state is shown by an icon and the accessible name, not by colour alone. */
export function QuizNavigator({ order, answers, currentIndex, onSelect }: QuizNavigatorProps) {
  const { t } = useT();
  return (
    <nav aria-label={t('app.quiz.navigator')}>
      <ol className="flex flex-wrap gap-2">
        {order.map((questionId, index) => {
          const answered = isAnswered(answers, questionId);
          const label = answered
            ? t('app.quiz.answered', { number: index + 1 })
            : t('app.quiz.unanswered', { number: index + 1 });
          return (
            <li key={questionId}>
              <button
                type="button"
                aria-label={label}
                aria-current={index === currentIndex ? 'step' : undefined}
                onClick={() => onSelect(index)}
                className={cx(
                  'focus-ring flex size-10 items-center justify-center gap-0.5 rounded-md border text-sm',
                  index === currentIndex ? 'border-primary font-bold' : 'border-border',
                  answered && 'bg-surface-selected',
                )}
              >
                {answered ? <CircleCheck aria-hidden size={12} /> : <Circle aria-hidden size={12} />}
                {index + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
