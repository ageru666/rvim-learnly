import { REVEAL_ANSWERS, revealAnswersSchema } from '@learnly/contracts/enums';
import { LIMITS } from '@learnly/contracts/limits';
import type { QuizEditor as QuizEditorValue } from '@learnly/contracts/quizzes';
import { Plus } from 'lucide-react';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Switch } from '../../shared/components/Switch';
import { useT } from '../locale/useT';
import { QuestionEditor } from './components/QuestionEditor';
import { duplicateQuestion, emptyQuestion, moveItem, validateQuizDraft } from './utils';

const UNLIMITED = 'unlimited';

interface QuizEditorProps {
  value: QuizEditorValue;
  onChange: (value: QuizEditorValue) => void;
  disabled?: boolean;
  /** Shows the problems found by `validateQuizDraft` (after a save attempt). */
  showProblems?: boolean;
}

/** FR-TEACH-4 quiz editor: settings (FR-QUIZ-2) and the question list. */
export function QuizEditor({ value, onChange, disabled = false, showProblems = false }: QuizEditorProps) {
  const { t, translate } = useT();
  const problems = showProblems ? validateQuizDraft(value) : [];
  const setQuestions = (questions: QuizEditorValue['questions']) => onChange({ ...value, questions });
  const attemptOptions = Array.from({ length: LIMITS.maxAttempts.max }, (_, index) => String(index + 1));

  return (
    <div className="flex flex-col gap-6">
      <Card className="card-body flex flex-col gap-4">
        <h2 className="heading-md">{t('app.quizEditor.settings')}</h2>
        <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-3">
          <FormField label={t('app.quizEditor.passScore')}>
            {(field) => (
              <Input
                {...field}
                type="number"
                min={LIMITS.passScore.min}
                max={LIMITS.passScore.max}
                value={value.passScore}
                onChange={(event) => onChange({ ...value, passScore: Number(event.target.value) || LIMITS.passScore.min })}
              />
            )}
          </FormField>
          <FormField label={t('app.quizEditor.maxAttempts')}>
            {(field) => (
              <Select
                {...field}
                value={value.maxAttempts === null ? UNLIMITED : String(value.maxAttempts)}
                disabled={disabled}
                onValueChange={(next) => onChange({ ...value, maxAttempts: next === UNLIMITED ? null : Number(next) })}
                options={[{ value: UNLIMITED, label: t('app.quizEditor.unlimited') }, ...attemptOptions.map((count) => ({ value: count, label: count }))]}
              />
            )}
          </FormField>
          <FormField label={t('app.quizEditor.revealAnswers')}>
            {(field) => (
              <Select
                {...field}
                value={value.revealAnswers}
                disabled={disabled}
                onValueChange={(next) => onChange({ ...value, revealAnswers: revealAnswersSchema.parse(next) })}
                options={REVEAL_ANSWERS.map((mode) => ({ value: mode, label: translate(`enums.revealAnswers.${mode}`) }))}
              />
            )}
          </FormField>
        </fieldset>
        <Switch checked={value.shuffle} onCheckedChange={(shuffle) => onChange({ ...value, shuffle })} label={t('app.quizEditor.shuffle')} disabled={disabled} />
      </Card>

      {problems.length > 0 && (
        <Alert kind="error" title={t('app.quizEditor.problems')}>
          <ul className="list-disc pl-5">
            {problems.map((problem) => (
              <li key={`${problem.key}-${problem.number ?? 0}`}>{translate(problem.key, { number: problem.number ?? 0 })}</li>
            ))}
          </ul>
        </Alert>
      )}

      <section className="flex flex-col gap-4" aria-label={t('app.quizEditor.questions')}>
        {value.questions.length === 0 && <p className="text-text-muted">{t('app.quizEditor.noQuestions')}</p>}
        {value.questions.map((question, index) => (
          <QuestionEditor
            key={question.id ?? `new-${index}`}
            question={question}
            index={index}
            total={value.questions.length}
            disabled={disabled}
            onChange={(next) => setQuestions(value.questions.map((item, position) => (position === index ? next : item)))}
            onMove={(delta) => setQuestions(moveItem(value.questions, index, index + delta))}
            onDuplicate={() => setQuestions([...value.questions.slice(0, index + 1), duplicateQuestion(question), ...value.questions.slice(index + 1)])}
            onRemove={() => setQuestions(value.questions.filter((_, position) => position !== index))}
          />
        ))}
        {!disabled && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setQuestions([...value.questions, emptyQuestion('single')])}>
              <Plus aria-hidden size={16} />
              {t('app.quizEditor.addSingle')}
            </Button>
            <Button variant="outline" onClick={() => setQuestions([...value.questions, emptyQuestion('multiple')])}>
              <Plus aria-hidden size={16} />
              {t('app.quizEditor.addMultiple')}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
