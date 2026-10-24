import type { Locale } from '@learnly/contracts/enums';
import type { StudentQuestion } from '@learnly/contracts/quizzes';
import { Checkbox } from '../../../shared/components/Checkbox';
import { MarkdownView } from '../../../shared/components/MarkdownView';
import { RadioGroup } from '../../../shared/components/RadioGroup';
import { useT } from '../../locale/useT';

interface QuizQuestionProps {
  question: StudentQuestion;
  index: number;
  total: number;
  selected: readonly string[];
  language: Locale;
  onToggle: (optionId: string) => void;
}

export function QuizQuestion({ question, index, total, selected, language, onToggle }: QuizQuestionProps) {
  const { t } = useT();
  const hint = question.type === 'single' ? t('app.quiz.chooseOne') : t('app.quiz.chooseMany');

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 flex w-full flex-wrap items-center justify-between gap-2 text-sm text-text-muted">
        <span>{t('app.quiz.questionOf', { current: index + 1, total })}</span>
        <span>{t('app.quiz.points', { count: question.points })}</span>
      </legend>
      <MarkdownView source={question.text} lang={language} />
      <p className="text-sm font-medium">{hint}</p>
      {question.type === 'single' ? (
        <RadioGroup
          label={hint}
          value={selected[0] ?? ''}
          onValueChange={onToggle}
          options={question.options.map((option) => ({ value: option.id, label: <span lang={language}>{option.text}</span> }))}
        />
      ) : (
        <div className="flex flex-col gap-2" role="group" aria-label={hint}>
          {question.options.map((option) => (
            <Checkbox
              key={option.id}
              checked={selected.includes(option.id)}
              onCheckedChange={() => onToggle(option.id)}
              label={<span lang={language}>{option.text}</span>}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}
