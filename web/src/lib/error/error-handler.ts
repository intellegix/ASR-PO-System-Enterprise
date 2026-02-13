/**
 * Global Error Handling System
 * Centralized error handling for the application
 */

import log from '@/lib/logging/logger';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: Date;
  additionalInfo?: Record<string, unknown>;
}

export interface APIError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export class ApplicationError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    status: number = 500,
    code?: string,
    context?: ErrorContext
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.status = status;
    this.code = code;
    this.context = context;
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', { additionalInfo: details });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class BusinessLogicError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', { additionalInfo: details });
    this.name = 'BusinessLogicError';
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message?: string) {
    super(
      message || `External service ${service} is unavailable`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      { additionalInfo: { service } }
    );
    this.name = 'ExternalServiceError';
  }
}

/**
 * Global error handler class
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;

  private constructor() {
    this.setupGlobalHandlers();
  }

  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  private setupGlobalHandlers(): void {
    if (typeof window !== 'undefined') {
      // Browser environment
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    } else if (typeof process !== 'undefined') {
      // Node.js environment
      process.on('uncaughtException', this.handleUncaughtException.bind(this));
      process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
    }
  }

  private handleGlobalError(event: ErrorEvent): void {
    const error = event.error || new Error(event.message);

    log.error('Global error caught', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      category: 'global_error',
    });

    // Prevent default browser error handling in development
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    // In production, you might want to send to external error tracking
    event.preventDefault();
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent | { reason?: unknown }): void {
    const eventObj = event as { reason?: unknown; preventDefault?: () => void };
    const reason = eventObj.reason || event;
    const error = reason instanceof Error ? reason : new Error(String(reason));

    log.error('Unhandled promise rejection', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      reason: String(reason),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      category: 'unhandled_rejection',
    });

    // Prevent default browser handling in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production' && eventObj.preventDefault) {
      eventObj.preventDefault();
    }
  }

  private handleUncaughtException(error: Error): void {
    log.error('Uncaught exception', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      category: 'uncaught_exception',
    });

    // In production server, you might want to gracefully shut down
    if (process.env.NODE_ENV === 'production') {
      console.error('Uncaught exception, shutting down gracefully:', error);
      process.exit(1);
    }
  }

  public handleError(error: Error, context?: ErrorContext): void {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    log.error('Application error handled', {
      errorId,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
      category: 'application_error',
    });

    // Send to external error tracking if configured
    if (process.env.NODE_ENV === 'production') {
      this.reportToExternalService(error, context, errorId);
    }
  }

  private reportToExternalService(
    error: Error,
    context?: ErrorContext,
    errorId?: string
  ): void {
    // Placeholder for external error reporting service
    // In production, you would integrate with Sentry, LogRocket, Rollbar, etc.
    try {
      const win = window as unknown as { Sentry?: { captureException: (error: Error, options: unknown) => void } };
      if (typeof window !== 'undefined' && win.Sentry) {
        win.Sentry.captureException(error, {
          contexts: {
            errorId,
            ...context,
          },
        });
      }
    } catch (reportingError) {
      log.error('Failed to report error to external service', {
        originalError: error.message,
        reportingError: reportingError instanceof Error ? reportingError.message : String(reportingError),
        category: 'error_reporting_failure',
      });
    }
  }

  public handleAPIError(
    error: APIError | Error,
    context?: ErrorContext
  ): ApplicationError {
    if (error instanceof ApplicationError) {
      return error;
    }

    if ('status' in error) {
      // APIError
      return new ApplicationError(
        error.message,
        error.status,
        error.code,
        context
      );
    }

    // Generic Error
    return new ApplicationError(
      error.message || 'An unexpected error occurred',
      500,
      'UNKNOWN_ERROR',
      context
    );
  }
}

/**
 * Utility functions for error handling
 */

export const handleError = (error: Error, context?: ErrorContext): void => {
  const handler = GlobalErrorHandler.getInstance();
  handler.handleError(error, context);
};

export const handleAPIError = (
  error: APIError | Error,
  context?: ErrorContext
): ApplicationError => {
  const handler = GlobalErrorHandler.getInstance();
  return handler.handleAPIError(error, context);
};

/**
 * Higher-order function to wrap async functions with error handling
 */
export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context?: ErrorContext
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  };
};

/**
 * Retry logic with exponential backoff
 */
export const withRetry = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  maxRetries: number = 3,
  baseDelay: number = 1000
) => {
  return async (...args: T): Promise<R> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        log.warn('Retrying after error', {
          attempt: attempt + 1,
          maxRetries,
          delay,
          errorMessage: lastError.message,
          category: 'retry_attempt',
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    handleError(lastError!);
    throw lastError!;
  };
};

/**
 * Error boundary for async operations in React components
 */
export const safeAsync = async <T>(
  asyncOperation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await asyncOperation();
  } catch (error) {
    handleError(error instanceof Error ? error : new Error(String(error)));
    return fallback;
  }
};

// Initialize global error handler
if (typeof window !== 'undefined' || typeof process !== 'undefined') {
  GlobalErrorHandler.getInstance();
}

export default GlobalErrorHandler;