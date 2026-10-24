import { cx } from '../utils/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return cx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm');
}
