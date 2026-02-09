// ASR PO System Service Worker
// Provides offline functionality and caching for PWA

const CACHE_NAME = 'asr-po-v4';
const STATIC_CACHE_URLS = [
  '/',
  '/login',
  '/po',
  '/po/create',
  '/approvals',
  '/manifest.json'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/auth/session',
  '/api/po',
  '/api/projects',
  '/api/vendors',
  '/api/divisions'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control immediately
  self.clients.claim();
});

// Fetch event - handle requests with cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network first, cache fallback
    event.respondWith(networkFirstStrategy(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ttf)$/)) {
    // Static assets - Cache first
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // HTML pages - Stale while revalidate
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

// Network first strategy (good for API calls)
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Cache successful API responses if they match our patterns
    if (response.ok && shouldCacheApiRequest(request.url)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/') || new Response('Offline - Please check your connection');
    }

    throw error;
  }
}

// Cache first strategy (good for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Failed to fetch and cache:', request.url);
    throw error;
  }
}

// Stale while revalidate strategy (good for HTML pages)
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);

  // Start fetch in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      // Clone synchronously before the body can be consumed
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then((c) => c.put(request, responseToCache));
    }
    return response;
  });

  // Return cached version immediately if available
  return cachedResponse || fetchPromise;
}

// Check if API request should be cached
function shouldCacheApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => url.includes(pattern));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'po-sync') {
    event.waitUntil(syncPendingPOs());
  }
});

// Sync pending PO operations when back online
async function syncPendingPOs() {
  try {
    // Get pending operations from IndexedDB
    // This would need to be implemented based on your offline storage strategy
    console.log('[SW] Syncing pending PO operations');

    // Example: retry failed PO submissions
    // const pendingPOs = await getPendingPOsFromStorage();
    // for (const po of pendingPOs) {
    //   await submitPO(po);
    // }
  } catch (error) {
    console.error('[SW] Failed to sync pending POs:', error);
  }
}

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  const options = {
    body: 'You have new purchase order updates',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Updates',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.data = { ...options.data, ...data };
  }

  event.waitUntil(
    self.registration.showNotification('ASR PO System', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/po')
    );
  }
});