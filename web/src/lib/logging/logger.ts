/**
 * Enterprise Structured Logging System
 * Replaces console.log/error with structured, auditable logging
 */

import winston from 'winston';
import { getConfig, isDevelopment, isProduction } from '@/lib/config';

// Define log levels for enterprise use
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
} as const;

// Define colors for console output in development
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
} as const;

// Add colors to winston
winston.addColors(LOG_COLORS);

// Create formatters
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, userId, sessionId, requestId, ...meta } = info;
    return JSON.stringify({
      timestamp,
      level,
      message,
      userId: userId || null,
      sessionId: sessionId || null,
      requestId: requestId || null,
      metadata: Object.keys(meta).length > 0 ? meta : undefined,
    });
  })
);

// Create transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: isDevelopment() ? 'debug' : 'info',
    format: isDevelopment() ? developmentFormat : productionFormat,
  })
);

// File transports (production and development)
if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  );

  // Security audit log (for financial transactions)
  transports.push(
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf((info) => {
          if (info.auditEvent) {
            return JSON.stringify({
              timestamp: info.timestamp,
              auditEvent: info.auditEvent,
              userId: info.userId,
              sessionId: info.sessionId,
              action: info.action,
              resourceType: info.resourceType,
              resourceId: info.resourceId,
              details: info.details,
              ipAddress: info.ipAddress,
              userAgent: info.userAgent,
            });
          }
          return JSON.stringify(info);
        })
      ),
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: isDevelopment() ? 'debug' : 'info',
  levels: LOG_LEVELS,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
});

// Enhanced logging interface with context
export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface AuditLogData extends LogContext {
  auditEvent: boolean;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  statusBefore?: string;
  statusAfter?: string;
}

class EnterpriseLogger {
  private context: LogContext = {};

  /**
   * Set context for subsequent log messages
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear logging context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Get current logging context
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): EnterpriseLogger {
    const childLogger = new EnterpriseLogger();
    childLogger.setContext({ ...this.context, ...additionalContext });
    return childLogger;
  }

  /**
   * Log error messages
   */
  error(message: string, meta: Record<string, any> = {}): void {
    logger.error(message, { ...this.context, ...meta });
  }

  /**
   * Log warning messages
   */
  warn(message: string, meta: Record<string, any> = {}): void {
    logger.warn(message, { ...this.context, ...meta });
  }

  /**
   * Log info messages
   */
  info(message: string, meta: Record<string, any> = {}): void {
    logger.info(message, { ...this.context, ...meta });
  }

  /**
   * Log HTTP requests
   */
  http(message: string, meta: Record<string, any> = {}): void {
    logger.http(message, { ...this.context, ...meta });
  }

  /**
   * Log debug messages
   */
  debug(message: string, meta: Record<string, any> = {}): void {
    logger.debug(message, { ...this.context, ...meta });
  }

  /**
   * Log audit events for financial transactions
   */
  audit(message: string, data: AuditLogData): void {
    logger.info(message, {
      ...this.context,
      ...data,
      auditEvent: true,
    });
  }

  /**
   * Log authentication events
   */
  auth(message: string, meta: Record<string, any> = {}): void {
    logger.info(message, {
      ...this.context,
      ...meta,
      category: 'authentication'
    });
  }

  /**
   * Log database operations
   */
  db(message: string, meta: Record<string, any> = {}): void {
    logger.debug(message, {
      ...this.context,
      ...meta,
      category: 'database'
    });
  }

  /**
   * Log business logic operations
   */
  business(message: string, meta: Record<string, any> = {}): void {
    logger.info(message, {
      ...this.context,
      ...meta,
      category: 'business'
    });
  }

  /**
   * Log security events
   */
  security(message: string, meta: Record<string, any> = {}): void {
    logger.warn(message, {
      ...this.context,
      ...meta,
      category: 'security'
    });
  }

  /**
   * Log performance metrics
   */
  performance(message: string, meta: Record<string, any> = {}): void {
    logger.info(message, {
      ...this.context,
      ...meta,
      category: 'performance'
    });
  }

  /**
   * Log API operations with timing
   */
  api(message: string, meta: { method?: string; url?: string; duration?: number; statusCode?: number } = {}): void {
    logger.http(message, {
      ...this.context,
      ...meta,
      category: 'api'
    });
  }
}

// Create default logger instance
const log = new EnterpriseLogger();

// Helper functions for common logging patterns
export const createChildLogger = (context: LogContext): EnterpriseLogger => {
  return log.child(context);
};

export const auditLog = (action: string, resourceType: string, resourceId: string, details: Record<string, any> = {}, context: LogContext = {}): void => {
  log.audit(`${action} performed on ${resourceType} ${resourceId}`, {
    auditEvent: true,
    action,
    resourceType,
    resourceId,
    details,
    ...context,
  });
};

export const securityLog = (event: string, details: Record<string, any> = {}, context: LogContext = {}): void => {
  log.security(`Security event: ${event}`, {
    ...details,
    ...context,
  });
};

export const performanceLog = (operation: string, duration: number, context: LogContext = {}): void => {
  log.performance(`${operation} completed`, {
    duration,
    ...context,
  });
};

// Export the default logger
export default log;

// Export the winston logger for advanced use cases
export { logger as winstonLogger };

// Create logs directory if it doesn't exist (for Node.js environments)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  const fs = require('fs');
  const path = require('path');
  const logsDir = path.join(process.cwd(), 'logs');

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}