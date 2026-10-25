import { QUESTION_TYPES, questionTypeSchema } from '@learnly/contracts/enums';
import { LIMITS } from '@learnly/contracts/limits';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { Checkbox } from '../../../shared/components/Checkbox';
import { FormField } from '../../../shared/components/FormField';
import { IconButton } from '../../../shared/components/IconButton';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Textarea } from '../../../shared/components/Textarea';
import { useT } from '../../locale/useT';
import { changeQuestionType, markCorrect, type QuizQuestionDraft } from '../utils';

interface QuestionEditorProps {
  question: QuizQuestionDraft;
  index: number;
  total: number;
  disabled: boolean;
  onChange: (question: QuizQuestionDraft) => void;
  onMove: (delta: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function QuestionEditor({ question, index, total, disabled, onChange, onMove, onDuplicate, onRemove }: QuestionEditorProps) {
  const { t, translate } = useT();
  const setOption = (optionIndex: number, text: string) =>
    onChange({ ...question, options: question.options.map((option, position) => (position === optionIndex ? { ...option, text } : option)) });

  return (
    <Card className="card-body flex flex-col gap-4">
      <fieldset disabled={disabled} className="flex flex-col gap-4">
        <legend className="mb-2 flex w-full items-center justify-between gap-2">
          <span className="heading-md">{t('app.quizEditor.question', { number: index + 1 })}</span>
          <span className="flex gap-1">
            <IconButton label={t('app.quizEditor.moveUp')} icon={<ArrowUp aria-hidden size={14} />} disabled={index === 0} onClick={() => onMove(-1)} />
            <IconButton label={t('app.quizEditor.moveDown')} icon={<ArrowDown aria-hidden size={14} />} disabled={index === total - 1} onClick={() => onMove(1)} />
            <IconButton label={t('app.quizEditor.duplicate')} icon={<Copy aria-hidden size={14} />} onClick={onDuplicate} />
            <IconButton label={t('app.quizEditor.remove')} icon={<Trash2 aria-hidden size={14} />} onClick={onRemove} />
          </span>
        </legend>
        <FormField label={t('app.quizEditor.questionText')}>
          {(field) => (
            <Textarea {...field} rows={2} value={question.text} maxLength={LIMITS.questionText.max} onChange={(event) => onChange({ ...question, text: event.target.value })} />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('app.quizEditor.questionType')}>
            {(field) => (
              <Select
                {...field}
                value={question.type}
                disabled={disabled}
                onValueChange={(value) => onChange(changeQuestionType(question, questionTypeSchema.parse(value)))}
                options={QUESTION_TYPES.map((type) => ({ value: type, label: translate(`enums.questionType.${type}`) }))}
              />
            )}
          </FormField>
          <FormField label={t('app.quizEditor.points')}>
            {(field) => (
              <Input
                {...field}
                type="number"
                min={LIMITS.questionPoints.min}
                max={LIMITS.questionPoints.max}
                value={question.points}
                onChange={(event) => onChange({ ...question, points: Number(event.target.value) || LIMITS.questionPoints.min })}
              />
            )}
          </FormField>
        </div>
        <fieldset className="field">
          <legend className="field-label">{t('app.quizEditor.options')}</legend>
          <ol className="flex flex-col gap-2">
            {question.options.map((option, optionIndex) => (
              <li key={optionIndex} className="flex items-center gap-2">
                <Checkbox
                  checked={option.isCorrect}
                  onCheckedChange={(checked) => onChange(markCorrect(question, optionIndex, checked))}
                  label={<span className="sr-only">{t('app.quizEditor.correct')}</span>}
                  disabled={disabled}
                />
                <Input
                  aria-label={t('app.quizEditor.option', { number: optionIndex + 1 })}
                  value={option.text}
                  maxLength={LIMITS.optionText.max}
                  onChange={(event) => setOption(optionIndex, event.target.value)}
                />
                <IconButton
                  label={t('app.quizEditor.removeOption', { number: optionIndex + 1 })}
                  icon={<X aria-hidden size={14} />}
                  disabled={question.options.length <= LIMITS.optionsPerQuestion.min}
                  onClick={() => onChange({ ...question, options: question.options.filter((_, position) => position !== optionIndex) })}
                />
              </li>
            ))}
          </ol>
          {question.options.length < LIMITS.optionsPerQuestion.max && (
            <Button size="sm" variant="ghost" className="self-start" onClick={() => onChange({ ...question, options: [...question.options, { text: '', isCorrect: false }] })}>
              <Plus aria-hidden size={14} />
              {t('app.quizEditor.addOption')}
            </Button>
          )}
        </fieldset>
        <FormField label={t('app.quizEditor.explanation')}>
          {(field) => (
            <Textarea
              {...field}
              rows={2}
              value={question.explanation ?? ''}
              maxLength={LIMITS.questionExplanation.max}
              onChange={(event) => onChange({ ...question, explanation: event.target.value || null })}
            />
          )}
        </FormField>
      </fieldset>
    </Card>
  );
}
