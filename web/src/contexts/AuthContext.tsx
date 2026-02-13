'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signOut, getSession } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { User, AuthMode, AuthResult } from '@/lib/types';
import { authenticateDemo, getDemoSession, setDemoSession, clearDemoSession } from '@/lib/demo-auth';
import { demoUserToUser } from '@/lib/jwt-auth';

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

function sessionToUser(session: { user: { id: string; email: string; name: string; role: string; divisionId?: string | null; divisionName?: string | null; divisionCode?: string | null } }): User {
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    divisionId: session.user.divisionId || null,
    divisionName: session.user.divisionName || null,
    divisionCode: session.user.divisionCode || null,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);

  const checkBackendStatus = async (): Promise<boolean> => {
    setBackendAvailable(true);
    return true;
  };

  // Sync NextAuth session to user state
  useEffect(() => {
    if (nextAuthStatus === 'loading') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(true);
      return;
    }

    if (nextAuthStatus === 'authenticated' && nextAuthSession) {
      setUser(sessionToUser(nextAuthSession));
      setAuthMode('backend');
      setIsLoading(false);
      return;
    }

    // Not authenticated via NextAuth - check for demo session
    if (nextAuthStatus === 'unauthenticated') {
      const demoUser = getDemoSession();
      if (demoUser) {
        setUser(demoUserToUser(demoUser));
        setAuthMode('demo');
      } else {
        setUser(null);
        setAuthMode(null);
      }
      setIsLoading(false);
    }
  }, [nextAuthSession, nextAuthStatus]);

  const login = async (
    identifier: string,
    password: string,
    useBackend?: boolean
  ): Promise<AuthResult> => {
    setIsLoading(true);

    try {
      // Try NextAuth credentials sign-in
      if (useBackend !== false) {
        const result = await signIn('credentials', {
          identifier,
          password,
          redirect: false,
        });

        if (result?.ok) {
          // Fetch the session to populate user state
          const session = await getSession();
          if (session) {
            const authUser = sessionToUser(session);
            setUser(authUser);
            setAuthMode('backend');
            setIsLoading(false);
            return { success: true, user: authUser };
          }
        }

        // If NextAuth auth fails and demo fallback is allowed
        if (useBackend === true) {
          setIsLoading(false);
          return { success: false, error: 'Authentication failed. Check your credentials.' };
        }
      }

      // Try demo authentication as fallback
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
    } catch (error: unknown) {
      console.error('Login error:', error);
      setIsLoading(false);
      return { success: false, error: 'Login failed due to an error' };
    }
  };

  const logout = (): void => {
    setUser(null);
    setAuthMode(null);
    clearDemoSession();
    signOut({ redirect: false });
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
