'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { Box, Button, Alert, AlertTitle } from '@mui/material';
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
        <Box
          sx={{
            display: 'flex',
            minHeight: '400px',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Alert
            severity="error"
            sx={{
              maxWidth: 'md',
              borderRadius: 2,
              border: 1,
              borderColor: 'error.light',
            }}
          >
            <AlertTitle sx={{ fontWeight: 500 }}>Something went wrong</AlertTitle>
            <Box sx={{ mt: 1 }}>
              An error occurred while displaying this content. Our team has been notified and is
              working to fix the issue.
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => this.setState({ hasError: false })}
                sx={{
                  bgcolor: 'error.lighter',
                  color: 'error.dark',
                  borderColor: 'error.light',
                  '&:hover': {
                    bgcolor: 'error.light',
                    borderColor: 'error.main',
                  },
                }}
              >
                Try again
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                sx={{
                  bgcolor: 'error.lighter',
                  color: 'error.dark',
                  borderColor: 'error.light',
                  '&:hover': {
                    bgcolor: 'error.light',
                    borderColor: 'error.main',
                  },
                }}
              >
                Reload page
              </Button>
            </Box>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: 16 }}>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  Error Details (Development)
                </summary>
                <pre
                  style={{
                    marginTop: 8,
                    whiteSpace: 'pre-wrap',
                    borderRadius: 4,
                    backgroundColor: '#fee2e2',
                    padding: 8,
                    fontSize: '0.75rem',
                    overflow: 'auto',
                  }}
                >
                  {this.state.error.stack}
                </pre>
                <Box sx={{ mt: 1, fontSize: '0.75rem', color: 'error.dark' }}>
                  Error ID: {this.state.errorId}
                </Box>
              </details>
            )}
          </Alert>
        </Box>
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
export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <Box
        sx={{
          display: 'flex',
          height: 256,
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          border: 1,
          borderColor: 'warning.light',
          bgcolor: 'warning.lighter',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'warning.dark' }}>
            Unable to load dashboard data
          </Box>
          <Box sx={{ mt: 0.5, fontSize: '0.75rem', color: 'warning.main' }}>
            Please refresh the page or contact support if the issue persists
          </Box>
        </Box>
      </Box>
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
export const ReportErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <Box
        sx={{
          display: 'flex',
          height: 384,
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          border: 1,
          borderColor: 'error.light',
          bgcolor: 'error.lighter',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'error.dark' }}>
            Unable to generate report
          </Box>
          <Box sx={{ mt: 0.5, fontSize: '0.75rem', color: 'error.main' }}>
            The report data could not be loaded. Please try refreshing or contact support.
          </Box>
        </Box>
      </Box>
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
