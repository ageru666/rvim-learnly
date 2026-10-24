import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logFailure } from '../utils/logger';

interface ErrorBoundaryProps {
  /** Static fallback (no data fetching or dispatching) with a recovery action (guideline §3.6). */
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * React only supports error boundaries as class components, so this is the one class in the SPA.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logFailure('render', { message: error.message, componentStack: info.componentStack });
  }

  override render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
