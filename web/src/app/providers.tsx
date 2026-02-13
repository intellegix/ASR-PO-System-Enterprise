'use client';

import { type ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import EmotionCacheProvider from '@/theme/EmotionCacheProvider';
import theme from '@/theme';
import { ServiceWorkerRegistration, useIsPWA, useOfflineStatus, useInstallPrompt } from '@/components/PWA/ServiceWorkerRegistration';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryProvider } from '@/components/providers/QueryProvider';

function PWAProvider({ children }: { children: ReactNode }) {
  // Initialize PWA hooks
  useIsPWA();
  useOfflineStatus();
  useInstallPrompt();

  return (
    <>
      <ServiceWorkerRegistration />
      {children}
    </>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <EmotionCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SessionProvider>
          <QueryProvider>
            <AuthProvider>
              <PWAProvider>{children}</PWAProvider>
            </AuthProvider>
          </QueryProvider>
        </SessionProvider>
      </ThemeProvider>
    </EmotionCacheProvider>
  );
}
