'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import log from '@/lib/logging/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

/**
 * React Error Boundary with structured logging integration
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { errorId } = this.state;

    // Log error with context
    log.error('React Error Boundary caught error', {
      errorId,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      category: 'react_error_boundary',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to external error tracking service if configured
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // In production, you might want to report to Sentry, LogRocket, etc.
      console.error('Error Boundary caught error:', {
        errorId,
        error: error.message,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] w-full items-center justify-center">
          <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Something went wrong
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    An error occurred while displaying this content. Our team has been
                    notified and is working to fix the issue.
                  </p>
                </div>
                <div className="mt-4">
                  <div className="-mx-2 -my-1.5 flex">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => this.setState({ hasError: false })}
                      className="mr-2 bg-red-50 text-red-800 hover:bg-red-100"
                    >
                      Try again
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.location.reload();
                        }
                      }}
                      className="bg-red-50 text-red-800 hover:bg-red-100"
                    >
                      Reload page
                    </Button>
                  </div>
                </div>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-red-800">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-red-100 p-2 text-xs text-red-900">
                      {this.state.error.stack}
                    </pre>
                    <p className="mt-2 text-xs text-red-600">
                      Error ID: {this.state.errorId}
                    </p>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * React Hook version for functional components
 * Uses React 18's error boundaries via libraries or manual implementation
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const captureError = React.useCallback((error: Error) => {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    log.error('Manual error capture', {
      errorId,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      category: 'manual_error_capture',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });

    setError(error);
  }, []);

  return { captureError };
};

/**
 * HOC for wrapping components with error boundary
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

/**
 * Specific error boundary for dashboard components
 */
export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    fallback={
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50">
        <div className="text-center">
          <p className="text-sm font-medium text-yellow-800">
            Unable to load dashboard data
          </p>
          <p className="mt-1 text-xs text-yellow-600">
            Please refresh the page or contact support if the issue persists
          </p>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      log.error('Dashboard component error', {
        errorMessage: error.message,
        componentStack: errorInfo.componentStack,
        category: 'dashboard_error',
      });
    }}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Specific error boundary for report components
 */
export const ReportErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    fallback={
      <div className="flex h-96 w-full items-center justify-center rounded-lg border border-red-200 bg-red-50">
        <div className="text-center">
          <p className="text-sm font-medium text-red-800">
            Unable to generate report
          </p>
          <p className="mt-1 text-xs text-red-600">
            The report data could not be loaded. Please try refreshing or contact support.
          </p>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      log.error('Report component error', {
        errorMessage: error.message,
        componentStack: errorInfo.componentStack,
        category: 'report_error',
      });
    }}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;