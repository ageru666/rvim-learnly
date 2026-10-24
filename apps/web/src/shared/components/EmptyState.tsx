import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="card card-body flex flex-col items-center gap-3 py-12 text-center">
      <span className="text-text-subtle">{icon}</span>
      <p className="heading-md">{title}</p>
      {text && <p className="max-w-md text-text-muted">{text}</p>}
      {action}
    </div>
  );
}
