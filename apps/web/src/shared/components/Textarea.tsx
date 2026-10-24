import type { Ref, TextareaHTMLAttributes } from 'react';
import { cx } from '../utils/cx';

export function Textarea({
  className,
  ref,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={cx('input min-h-24 resize-y', className)} {...rest} />;
}
