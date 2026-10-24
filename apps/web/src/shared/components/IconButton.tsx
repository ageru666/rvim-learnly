import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx';
import type { ButtonVariant } from './buttonClass';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required: icon-only controls must have an accessible name (guideline §4.3). */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
}

export function IconButton({ label, icon, variant = 'ghost', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={cx('btn btn-icon', `btn-${variant}`, className)} {...rest}>
      {icon}
    </button>
  );
}
