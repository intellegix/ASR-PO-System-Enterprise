/**
 * Validation Middleware for API Routes
 * Enterprise-grade request validation with detailed error reporting
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Formats Zod errors into a user-friendly format
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Validates request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: formatZodErrors(result.error),
      };
    }
  } catch (_error: unknown) {
    return {
      success: false,
      errors: [{ field: 'body', message: 'Invalid JSON format' }],
    };
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const result = schema.safeParse(params);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: formatZodErrors(result.error),
      };
    }
  } catch (_error: unknown) {
    return {
      success: false,
      errors: [{ field: 'query', message: 'Invalid query parameters' }],
    };
  }
}

/**
 * Validates path parameters against a Zod schema
 */
export function validatePathParams<T>(
  params: Record<string, string | undefined>,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const result = schema.safeParse(params);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: formatZodErrors(result.error),
      };
    }
  } catch (_error: unknown) {
    return {
      success: false,
      errors: [{ field: 'params', message: 'Invalid path parameters' }],
    };
  }
}

/**
 * Returns a standardized validation error response
 */
export function validationErrorResponse(errors: ValidationError[]): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: errors,
      message: 'The request contains invalid data. Please check the provided fields and try again.',
    },
    { status: 400 }
  );
}

/**
 * Higher-order function to create validated API handlers
 */
export function withValidation<TBody = unknown, TQuery = unknown, TParams = unknown>(
  handler: (
    request: NextRequest,
    context: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    }
  ) => Promise<NextResponse>,
  schemas: {
    body?: ZodSchema<TBody>;
    query?: ZodSchema<TQuery>;
    params?: ZodSchema<TParams>;
  } = {}
) {
  return async (request: NextRequest, context: { params?: Record<string, string> } = {}) => {
    const validationContext: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    } = {};

    // Validate request body if schema provided
    if (schemas.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const bodyValidation = await validateRequestBody(request, schemas.body);
      if (!bodyValidation.success) {
        return validationErrorResponse(bodyValidation.errors!);
      }
      validationContext.body = bodyValidation.data;
    }

    // Validate query parameters if schema provided
    if (schemas.query) {
      const queryValidation = validateQueryParams(request, schemas.query);
      if (!queryValidation.success) {
        return validationErrorResponse(queryValidation.errors!);
      }
      validationContext.query = queryValidation.data;
    }

    // Validate path parameters if schema provided
    if (schemas.params && context.params) {
      const paramsValidation = validatePathParams(context.params, schemas.params);
      if (!paramsValidation.success) {
        return validationErrorResponse(paramsValidation.errors!);
      }
      validationContext.params = paramsValidation.data;
    }

    // Call the handler with validated data
    return handler(request, validationContext);
  };
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes file uploads
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export function validateFileUpload(
  file: File,
  options: FileValidationOptions = {}
): ValidationResult<File> {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  } = options;

  const errors: ValidationError[] = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push({
      field: 'file',
      message: `File size exceeds maximum limit of ${Math.round(maxSize / 1024 / 1024)}MB`,
    });
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    });
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    errors.push({
      field: 'file',
      message: `File extension ${extension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: file };
}

/**
 * Rate limiting validation (basic implementation)
 * For production, consider using Redis or external rate limiting service
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    // First request or window expired
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  requestCounts.set(identifier, record);

  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * Rate limiting middleware
 * Supports both old-style context (Record<string, unknown>) and Next.js 15+ params ({ params: Promise<...> })
 */
export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 60 * 1000
) {
  return function rateLimitMiddleware<TContext = Record<string, unknown>>(
    handler: (request: NextRequest, context?: TContext) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, context?: TContext) => {
      // Use IP address as identifier (in production, consider user ID)
      const identifier = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';
      const rateLimit = checkRateLimit(identifier, maxRequests, windowMs);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again after ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            },
          }
        );
      }

      // Add rate limit headers to response
      const response = await handler(request, context);
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());

      return response;
    };
  };
}