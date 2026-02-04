/**
 * Environment Configuration Validation
 * Ensures critical environment variables are properly configured
 */

export interface EnvConfig {
  DATABASE_URL: string;
  NEXTAUTH_SECRET: string;
  NODE_ENV: string;
}

class ConfigValidationError extends Error {
  constructor(message: string) {
    super(`Configuration Error: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

function validateNextAuthSecret(secret: string | undefined): string {
  if (!secret) {
    // For static export builds, NEXTAUTH_SECRET is not required
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_STATIC_EXPORT === 'true') {
      return 'static-export-placeholder'; // Return placeholder for static export
    }
    throw new ConfigValidationError(
      'NEXTAUTH_SECRET is required. Generate one with: openssl rand -hex 32'
    );
  }

  if (secret.length < 32) {
    throw new ConfigValidationError(
      'NEXTAUTH_SECRET must be at least 32 characters long for security. Generate with: openssl rand -hex 32'
    );
  }

  // Check for common weak secrets
  const weakSecrets = [
    'secret',
    'password',
    'test',
    'development',
    'demo',
    '123456',
    'change-me',
    'your-secret-here',
  ];

  const lowerSecret = secret.toLowerCase();
  for (const weak of weakSecrets) {
    if (lowerSecret.includes(weak)) {
      throw new ConfigValidationError(
        `NEXTAUTH_SECRET appears to contain weak patterns. Use a cryptographically secure random string: openssl rand -hex 32`
      );
    }
  }

  return secret;
}

function validateDatabaseUrl(url: string | undefined): string {
  // For static export builds, DATABASE_URL is not required
  if (!url) {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_STATIC_EXPORT === 'true') {
      return ''; // Return empty string for static export
    }
    throw new ConfigValidationError('DATABASE_URL is required');
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'postgresql:' && parsedUrl.protocol !== 'postgres:') {
      throw new ConfigValidationError('DATABASE_URL must be a PostgreSQL connection string');
    }
  } catch (error) {
    throw new ConfigValidationError(`DATABASE_URL is not a valid URL: ${error}`);
  }

  return url;
}

/**
 * Validates and returns environment configuration
 * Throws ConfigValidationError if validation fails
 */
export function validateConfig(): EnvConfig {
  const config = {
    DATABASE_URL: validateDatabaseUrl(process.env.DATABASE_URL),
    NEXTAUTH_SECRET: validateNextAuthSecret(process.env.NEXTAUTH_SECRET),
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  return config;
}

/**
 * Safe config getter that validates on first access
 */
let cachedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateConfig();
  }
  return cachedConfig;
}

/**
 * Check if we're in production environment
 */
export function isProduction(): boolean {
  return getConfig().NODE_ENV === 'production';
}

/**
 * Check if we're in development environment
 */
export function isDevelopment(): boolean {
  return getConfig().NODE_ENV === 'development';
}

/**
 * Check if we're in test environment
 */
export function isTest(): boolean {
  return getConfig().NODE_ENV === 'test';
}