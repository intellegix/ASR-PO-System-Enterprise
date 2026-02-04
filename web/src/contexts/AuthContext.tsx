'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthMode, AuthResult } from '@/lib/types';
import { authenticateDemo, getDemoSession, setDemoSession, clearDemoSession, DemoUser } from '@/lib/demo-auth';
import {
  authenticateWithBackend,
  getJWTSession,
  clearJWTSession,
  jwtUserToUser,
  demoUserToUser,
  JWTSession
} from '@/lib/jwt-auth';
import { checkBackendHealth } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  authMode: AuthMode;
  isLoading: boolean;
  isAuthenticated: boolean;
  backendAvailable: boolean;
  login: (identifier: string, password: string, useBackend?: boolean) => Promise<AuthResult>;
  logout: () => void;
  checkBackendStatus: () => Promise<boolean>;
  switchToBackend: (identifier: string, password: string) => Promise<AuthResult>;
  switchToDemo: (identifier: string, password: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(false);

  // Check backend availability
  const checkBackendStatus = async (): Promise<boolean> => {
    try {
      const available = await checkBackendHealth();
      setBackendAvailable(available);
      return available;
    } catch {
      setBackendAvailable(false);
      return false;
    }
  };

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      // Check backend availability
      await checkBackendStatus();

      // Try JWT session first (backend auth)
      const jwtSession = getJWTSession();
      if (jwtSession) {
        setUser(jwtUserToUser(jwtSession));
        setAuthMode('backend');
        setIsLoading(false);
        return;
      }

      // Fall back to demo session
      const demoUser = getDemoSession();
      if (demoUser) {
        setUser(demoUserToUser(demoUser));
        setAuthMode('demo');
      }

      setIsLoading(false);
    };

    initializeAuth();

    // Check backend status periodically
    const statusInterval = setInterval(checkBackendStatus, 30000); // Every 30 seconds
    return () => clearInterval(statusInterval);
  }, []);

  const login = async (
    identifier: string,
    password: string,
    useBackend?: boolean
  ): Promise<AuthResult> => {
    setIsLoading(true);

    try {
      // If backend is specifically requested or available and not explicitly disabled
      if (useBackend === true || (useBackend !== false && backendAvailable)) {
        const jwtSession = await authenticateWithBackend(identifier, password);
        if (jwtSession) {
          const authUser = jwtUserToUser(jwtSession);
          setUser(authUser);
          setAuthMode('backend');
          setIsLoading(false);
          return { success: true, user: authUser };
        }

        // If backend auth fails and demo fallback is allowed
        if (useBackend !== true) {
          console.log('Backend auth failed, falling back to demo...');
        } else {
          setIsLoading(false);
          return { success: false, error: 'Backend authentication failed' };
        }
      }

      // Try demo authentication
      const demoUser = await authenticateDemo(identifier, password);
      if (demoUser) {
        setDemoSession(demoUser);
        const authUser = demoUserToUser(demoUser);
        setUser(authUser);
        setAuthMode('demo');
        setIsLoading(false);
        return { success: true, user: authUser };
      }

      setIsLoading(false);
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return { success: false, error: 'Login failed due to an error' };
    }
  };

  const logout = (): void => {
    setUser(null);
    setAuthMode(null);
    clearJWTSession();
    clearDemoSession();
  };

  const switchToBackend = async (identifier: string, password: string): Promise<AuthResult> => {
    return login(identifier, password, true);
  };

  const switchToDemo = async (identifier: string, password: string): Promise<AuthResult> => {
    return login(identifier, password, false);
  };

  const value: AuthContextType = {
    user,
    authMode,
    isLoading,
    isAuthenticated: !!user,
    backendAvailable,
    login,
    logout,
    checkBackendStatus,
    switchToBackend,
    switchToDemo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };