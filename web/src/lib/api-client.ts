/**
 * API Client Configuration for Hybrid Deployment
 * Handles routing between local backend and deployed frontend
 */

// Dynamic API base URL configuration
const getApiBaseUrl = (): string => {
  // Server-side rendering (Node.js environment)
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  // Client-side (browser environment)
  const isRenderDeployment = process.env.NEXT_PUBLIC_ENVIRONMENT === 'render-frontend';

  if (isRenderDeployment) {
    // When frontend is deployed on Render, use the ngrok URL for local backend
    return process.env.NEXT_PUBLIC_API_URL || 'https://your-ngrok-url.ngrok.io';
  }

  // Local development - use same origin
  return window.location.origin;
};

// API client configuration
export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

/**
 * Enhanced fetch wrapper with automatic URL resolution
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseURL = getApiBaseUrl();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const config: RequestInit = {
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...options.headers,
    },
  };

  // Add credentials for cross-origin requests when using ngrok
  if (baseURL.includes('ngrok.io') || baseURL.includes('ngrok.app')) {
    config.credentials = 'include';
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}\nURL: ${url}\nError: ${errorText}`
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return response as unknown as T;
  } catch (error) {
    console.error(`API Request Error for ${url}:`, error);
    throw error;
  }
}

/**
 * Convenience methods for different HTTP verbs
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit): Promise<T> =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit): Promise<T> =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  patch: <T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
};

/**
 * Health check function to verify backend connectivity
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await api.get('/api/health');
    return response.status === 'healthy';
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

/**
 * Development utility to log current API configuration
 */
export function logApiConfig(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 API Configuration:', {
      baseURL: getApiBaseUrl(),
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
      isClient: typeof window !== 'undefined',
      timestamp: new Date().toISOString(),
    });
  }
}

// Auto-log configuration in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  logApiConfig();
}