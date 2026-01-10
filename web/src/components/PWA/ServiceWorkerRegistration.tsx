'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 * Handles PWA service worker registration and updates
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      console.log('[SW] Registering service worker...');

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW] Service worker registered:', registration);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          console.log('[SW] New service worker installing');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New service worker available');

              // Show update notification to user
              if (window.confirm('A new version is available. Refresh to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });

      // Handle successful registration
      if (registration.active) {
        console.log('[SW] Service worker is active');
      }

      // Register for background sync if supported
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        console.log('[SW] Background sync is supported');
      }

      // Check if push messaging is supported
      if ('PushManager' in window) {
        console.log('[SW] Push messaging is supported');
      }

    } catch (error) {
      console.error('[SW] Service worker registration failed:', error);
    }
  };

  // This component doesn't render anything
  return null;
}

/**
 * Hook to check if app is running as PWA
 */
export function useIsPWA() {
  useEffect(() => {
    // Check if running in standalone mode (PWA)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone ||
                  document.referrer.includes('android-app://');

    if (isPWA) {
      document.body.classList.add('pwa-mode');
      console.log('[PWA] App is running as PWA');
    }

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.body.classList.add('pwa-mode');
      } else {
        document.body.classList.remove('pwa-mode');
      }
    };

    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);
}

/**
 * Hook for offline status detection
 */
export function useOfflineStatus() {
  useEffect(() => {
    const handleOnline = () => {
      document.body.classList.remove('offline');
      console.log('[PWA] Back online');

      // Trigger background sync if available
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          // Type assertion for background sync
          const syncRegistration = registration as any;
          if (syncRegistration.sync) {
            return syncRegistration.sync.register('po-sync');
          }
        }).catch((error) => {
          console.error('[PWA] Background sync registration failed:', error);
        });
      }
    };

    const handleOffline = () => {
      document.body.classList.add('offline');
      console.log('[PWA] Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    if (!navigator.onLine) {
      document.body.classList.add('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
}

/**
 * Install prompt for PWA
 */
export function useInstallPrompt() {
  useEffect(() => {
    let deferredPrompt: any;

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] Install prompt available');
      e.preventDefault();
      deferredPrompt = e;

      // Show install button if needed
      const installButton = document.getElementById('pwa-install-button');
      if (installButton) {
        installButton.style.display = 'block';

        installButton.onclick = () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
              if (choiceResult.outcome === 'accepted') {
                console.log('[PWA] User accepted install prompt');
              } else {
                console.log('[PWA] User dismissed install prompt');
              }
              deferredPrompt = null;
              installButton.style.display = 'none';
            });
          }
        };
      }
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      deferredPrompt = null;

      // Hide install button
      const installButton = document.getElementById('pwa-install-button');
      if (installButton) {
        installButton.style.display = 'none';
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
}