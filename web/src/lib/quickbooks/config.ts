/**
 * QuickBooks OAuth Configuration
 * Enterprise-grade QuickBooks Online API integration setup
 */

import OAuthClient from 'intuit-oauth';

// Environment configuration
export const QB_CONFIG = {
  clientId: process.env.QB_CLIENT_ID!,
  clientSecret: process.env.QB_CLIENT_SECRET!,
  redirectUri: process.env.QB_REDIRECT_URI!,
  environment: process.env.QB_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
} as const;

// Validate required environment variables
export function validateQBConfig(): void {
  const requiredVars = ['QB_CLIENT_ID', 'QB_CLIENT_SECRET', 'QB_REDIRECT_URI'];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required QuickBooks environment variable: ${varName}`);
    }
  }
}

// QuickBooks OAuth scopes
export const QB_SCOPES = [
  'com.intuit.quickbooks.accounting',
];

// OAuth client instance
export function createOAuthClient(): OAuthClient {
  validateQBConfig();

  return new OAuthClient({
    clientId: QB_CONFIG.clientId,
    clientSecret: QB_CONFIG.clientSecret,
    environment: QB_CONFIG.environment as 'sandbox' | 'production',
    redirectUri: QB_CONFIG.redirectUri,
  });
}

// QuickBooks API URLs
export const QB_URLS = {
  sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  production: 'https://quickbooks.api.intuit.com',
} as const;

export function getQBApiBaseUrl(): string {
  return QB_URLS[QB_CONFIG.environment as keyof typeof QB_URLS];
}

// QuickBooks company info for bills
export const QB_COMPANY_INFO = {
  name: 'All Surface Roofing & Waterproofing, Inc.',
  address: {
    line1: '1234 Construction Way',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
  },
};

// Error handling types
export interface QBError {
  code: string;
  message: string;
  detail?: string;
}

export interface QBApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: QBError;
}

// Rate limiting configuration
export const QB_RATE_LIMITS = {
  requestsPerMinute: 1000,
  requestsPerDay: 100000,
  retryAttempts: 3,
  retryDelayMs: 1000,
} as const;