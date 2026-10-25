import { LIMITS } from '@learnly/contracts/limits';
import { X } from 'lucide-react';
import { useId, type KeyboardEvent } from 'react';
import { Input } from '../../../shared/components/Input';
import { Tag } from '../../../shared/components/Tag';
import { useT } from '../../locale/useT';
import { addTag } from '../utils';

interface TagsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function TagsInput({ value, onChange, disabled = false }: TagsInputProps) {
  const { t } = useT();
  const id = useId();

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    onChange(addTag(value, event.currentTarget.value, LIMITS.tagsPerCourse.max));
    event.currentTarget.value = '';
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {t('app.teach.basics.tags')}
      </label>
      <ul className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <li key={tag}>
            <Tag>
              {tag}
              <button
                type="button"
                className="focus-ring rounded-pill"
                aria-label={t('app.teach.basics.removeTag', { tag })}
                disabled={disabled}
                onClick={() => onChange(value.filter((item) => item !== tag))}
              >
                <X aria-hidden size={12} />
              </button>
            </Tag>
          </li>
        ))}
      </ul>
      {value.length < LIMITS.tagsPerCourse.max && (
        <Input
          id={id}
          aria-describedby={`${id}-hint`}
          maxLength={LIMITS.tag.max}
          placeholder={t('app.teach.basics.addTag')}
          disabled={disabled}
          onKeyDown={handleKeyDown}
        />
      )}
      <p id={`${id}-hint`} className="field-hint">
        {t('app.teach.basics.tagsHint')}
      </p>
    </div>
  );
}
