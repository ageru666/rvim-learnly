import type { InputHTMLAttributes, Ref } from 'react';
import { cx } from '../utils/cx';

export function Input({
  className,
  ref,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cx('input', className)} {...rest} />;
}
