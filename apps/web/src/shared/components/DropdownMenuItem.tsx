import { DropdownMenu as MenuPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cx } from '../utils/cx';

export function DropdownMenuItem({ className, ...rest }: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cx('dropdown-item cursor-pointer data-[highlighted]:bg-surface-hover', className)}
      {...rest}
    />
  );
}
