import type { ReactNode } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  /** Shown only for transient failures; terminal errors offer `fallbackAction` instead. */
  retryable: boolean;
  onRetry?: () => void;
  retryLabel: string;
  fallbackAction?: ReactNode;
}

export function ErrorState({ message, retryable, onRetry, retryLabel, fallbackAction }: ErrorStateProps) {
  const action =
    retryable && onRetry ? (
      <Button variant="outline" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : (
      fallbackAction
    );
  return (
    <Alert kind="error" action={action}>
      {message}
    </Alert>
  );
}
