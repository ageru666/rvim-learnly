import { Toast as ToastPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <ToastPrimitive.Provider duration={5000} swipeDirection="right">
      {children}
      <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
