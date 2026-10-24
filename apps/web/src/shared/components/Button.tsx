import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx';
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonClass';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button and exposes the busy state to assistive technology (guideline §4.3). */
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClass(variant, size), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}
