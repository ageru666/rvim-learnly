import { LESSON_TYPES, type LessonType } from '@learnly/contracts/enums';

interface LessonTypeFieldProps {
  label: string;
  labelFor: (type: LessonType) => string;
}

/** A native-form radio group: the chosen type is read from the form on submit. */
export function LessonTypeField({ label, labelFor }: LessonTypeFieldProps) {
  return (
    <fieldset className="field">
      <legend className="field-label">{label}</legend>
      <div className="flex flex-wrap gap-4">
        {LESSON_TYPES.map((type, index) => (
          <label key={type} className="flex items-center gap-2 text-sm">
            <input type="radio" name="type" value={type} defaultChecked={index === 0} className="accent-primary" />
            {labelFor(type)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
