import { Plus, X } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import { IconButton } from '../../../shared/components/IconButton';
import { Input } from '../../../shared/components/Input';
import { useT } from '../../locale/useT';

interface ListInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  max: number;
  maxLength: number;
  disabled?: boolean;
}

/** "What you will learn" and "Requirements": up to 10 short items. */
export function ListInput({ label, value, onChange, max, maxLength, disabled = false }: ListInputProps) {
  const { t } = useT();
  const update = (index: number, text: string) => onChange(value.map((item, position) => (position === index ? text : item)));
  return (
    <fieldset className="field" disabled={disabled}>
      <legend className="field-label">{label}</legend>
      <ol className="flex flex-col gap-2">
        {value.map((item, index) => (
          <li key={index} className="flex gap-2">
            <Input
              aria-label={t('app.teach.basics.item', { number: index + 1 })}
              value={item}
              maxLength={maxLength}
              onChange={(event) => update(index, event.target.value)}
            />
            <IconButton
              label={t('app.teach.basics.removeItem', { number: index + 1 })}
              icon={<X aria-hidden size={16} />}
              onClick={() => onChange(value.filter((_, position) => position !== index))}
            />
          </li>
        ))}
      </ol>
      {value.length < max && (
        <Button size="sm" variant="ghost" className="self-start" onClick={() => onChange([...value, ''])}>
          <Plus aria-hidden size={14} />
          {t('app.teach.basics.addItem')}
        </Button>
      )}
    </fieldset>
  );
}
