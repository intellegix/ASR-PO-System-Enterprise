/**
 * JWT Authentication Utilities for Backend Integration
 */

import { api } from './api-client';
import { User } from './types';
import { DemoUser } from './demo-auth';

export interface JWTSession {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    divisionId: string | null;
    division?: string;
    permissions: string[];
  };
  expires: number;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    divisionId: string | null;
    division?: string;
    permissions: string[];
  };
  expiresIn: number;
}

const JWT_SESSION_KEY = 'asr-po-jwt-session';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

/**
 * Authenticate with the backend using credentials
 */
export async function authenticateWithBackend(
  identifier: string,
  password: string
): Promise<JWTSession | null> {
  try {
    const response = await api.post<LoginResponse>('/api/auth/login', {
      identifier,
      password,
    });

    if (response.success) {
      const session: JWTSession = {
        token: response.token,
        refreshToken: response.refreshToken,
        user: response.user,
        expires: Date.now() + response.expiresIn,
      };

      // Store session in localStorage
      localStorage.setItem(JWT_SESSION_KEY, JSON.stringify(session));

      return session;
    }

    return null;
  } catch (error) {
    console.error('Backend authentication failed:', error);
    return null;
  }
}

/**
 * Get current JWT session from localStorage
 */
export function getJWTSession(): JWTSession | null {
  try {
    const stored = localStorage.getItem(JWT_SESSION_KEY);
    if (!stored) return null;

    const session: JWTSession = JSON.parse(stored);

    // Check if token has expired
    if (Date.now() >= session.expires) {
      clearJWTSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error retrieving JWT session:', error);
    clearJWTSession();
    return null;
  }
}

/**
 * Check if JWT token needs refreshing
 */
export function shouldRefreshToken(session: JWTSession): boolean {
  return Date.now() >= session.expires - TOKEN_REFRESH_THRESHOLD;
}

/**
 * Refresh JWT token using refresh token
 */
export async function refreshJWTToken(): Promise<boolean> {
  try {
    const session = getJWTSession();
    if (!session?.refreshToken) {
      return false;
    }

    const response = await api.post<LoginResponse>('/api/auth/refresh', {
      refreshToken: session.refreshToken,
    });

    if (response.success) {
      const newSession: JWTSession = {
        token: response.token,
        refreshToken: response.refreshToken,
        user: response.user,
        expires: Date.now() + response.expiresIn,
      };

      localStorage.setItem(JWT_SESSION_KEY, JSON.stringify(newSession));
      return true;
    }

    // If refresh fails, clear session
    clearJWTSession();
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearJWTSession();
    return false;
  }
}

/**
 * Clear JWT session from localStorage
 */
export function clearJWTSession(): void {
  localStorage.removeItem(JWT_SESSION_KEY);
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader(): Record<string, string> {
  const session = getJWTSession();
  if (!session) return {};

  return {
    Authorization: `Bearer ${session.token}`,
  };
}

/**
 * Check if user has specific permission
 */
export function hasPermission(permission: string, session?: JWTSession | null): boolean {
  const currentSession = session || getJWTSession();
  if (!currentSession) return false;

  return currentSession.user.permissions.includes(permission) ||
         currentSession.user.permissions.includes('admin');
}

/**
 * Convert JWT user to User format for compatibility
 */
export function jwtUserToUser(session: JWTSession): User {
  return {
    id: session.user.id,
    username: session.user.email,
    name: session.user.name,
    role: session.user.role,
    email: session.user.email,
    divisionId: session.user.divisionId,
    division: session.user.division || undefined,
    lastLogin: new Date().toISOString(),
    isActive: true,
    permissions: session.user.permissions,
  };
}

/**
 * Convert demo user to User format for compatibility
 */
export function demoUserToUser(demoUser: DemoUser): User {
  return {
    id: demoUser.id,
    username: demoUser.email,
    name: demoUser.name,
    role: demoUser.role,
    email: demoUser.email,
    divisionId: demoUser.divisionId,
    division: demoUser.divisionName || undefined,
    divisionName: demoUser.divisionName,
    divisionCode: demoUser.divisionCode,
    lastLogin: new Date().toISOString(),
    isActive: true,
    permissions: ['read', 'write'], // Default permissions for demo users
  };
}

/**
 * Automatically refresh token if needed before API requests
 */
export async function ensureValidToken(): Promise<boolean> {
  const session = getJWTSession();
  if (!session) return false;

  if (shouldRefreshToken(session)) {
    return await refreshJWTToken();
  }

  return true;
}

/**
 * Enhanced API request wrapper with automatic token refresh
 */
export async function authenticatedApiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure token is valid
  const hasValidToken = await ensureValidToken();
  if (!hasValidToken) {
    throw new Error('Authentication required');
  }

  // Add authorization header
  const authHeaders = getAuthHeader();
  const config: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  };

  return api.get<T>(endpoint, config);
}