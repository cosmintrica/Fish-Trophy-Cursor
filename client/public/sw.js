// Service Worker pentru Fish Trophy - Optimizat pentru PWA moderne
// Versiune: v8 - Optimizat cu strategii moderne de caching

const CACHE_VERSION = 'v8';
const CACHE_NAME = `fish-trophy-${CACHE_VERSION}`;
const STATIC_CACHE = `fish-trophy-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fish-trophy-runtime-${CACHE_VERSION}`;

// Resurse statice critice pentru offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Strategii de caching
const CACHE_STRATEGIES = {
  // Network First - pentru HTML (mereu fresh)
  NETWORK_FIRST: 'network-first',
  // Stale While Revalidate - pentru resurse statice (rapid + fresh)
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Cache First - pentru assets statice (rapid)
  CACHE_FIRST: 'cache-first'
};

// Helper: Verifică dacă request-ul este pentru resurse externe
const isExternalRequest = (url) => {
  try {
    const urlObj = new URL(url, self.location.origin);
    return urlObj.origin !== self.location.origin;
  } catch {
    return false;
  }
};

// Helper: Verifică dacă request-ul este pentru API
const isAPIRequest = (url) => {
  return url.includes('/api/') || url.includes('supabase.co');
};

// Helper: Verifică dacă request-ul este pentru assets statice
const isStaticAsset = (url) => {
  return url.includes('/assets/') || 
         /\.(js|css|woff|woff2|ttf|eot|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url);
};

// Helper: Network First Strategy
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Fallback pentru HTML - returnează index.html pentru SPA routing
    if (request.headers.get('accept')?.includes('text/html')) {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    throw error;
  }
};

// Helper: Stale While Revalidate Strategy (performant + fresh)
const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Ignore network errors in background
  });
  
  // Return cached version immediately, update in background
  return cachedResponse || fetchPromise;
};

// Helper: Cache First Strategy (rapid pentru assets statice)
const cacheFirst = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
    }).catch(() => {
      // Ignore errors
    });
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
};

// Helper: Verifică dacă suntem în development (verifică URL-ul)
const isDevelopment = () => {
  return self.location.hostname === 'localhost' || 
         self.location.hostname === '127.0.0.1' ||
         self.location.hostname.includes('netlify.app');
};

// Install Event - Cache resurse statice critice
self.addEventListener('install', (event) => {
  if (isDevelopment()) {
    console.log('[SW] Installing service worker...');
  }
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        if (isDevelopment()) {
          console.log('[SW] Caching static assets...');
        }
        // Cache doar resursele critice, restul se cache-uiesc on-demand
        return cache.addAll(STATIC_ASSETS.filter(Boolean));
      })
      .then(() => {
        // Force activation pentru PWA installability
        return self.skipWaiting();
      })
      .catch((error) => {
        if (isDevelopment()) {
          console.error('[SW] Installation failed:', error);
        }
      })
  );
});

// Activate Event - Cleanup cache-uri vechi
self.addEventListener('activate', (event) => {
  if (isDevelopment()) {
    console.log('[SW] Activating service worker...');
  }
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Șterge toate cache-urile vechi
            if (cacheName.startsWith('fish-trophy') && 
                cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== RUNTIME_CACHE) {
              if (isDevelopment()) {
                console.log('[SW] Deleting old cache:', cacheName);
              }
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim all clients imediat pentru PWA installability
        return self.clients.claim();
      })
      .then(() => {
        // Notifică clients despre update
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: CACHE_VERSION
            });
          });
        });
      })
      .catch((error) => {
        if (isDevelopment()) {
          console.error('[SW] Activation failed:', error);
        }
      })
  );
});

// Fetch Event - Strategii inteligente de caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension și alte protocoale
  if (url.protocol === 'chrome-extension:' || url.protocol === 'chrome:') {
    return;
  }
  
  // Skip API requests - mereu network (pentru date fresh)
  if (isAPIRequest(url.href)) {
    return;
  }
  
  // Aplică strategii diferite bazate pe tipul de resursă
  if (request.headers.get('accept')?.includes('text/html')) {
    // HTML: Network First (mereu fresh)
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(url.href)) {
    // Assets statice: Cache First (rapid)
    event.respondWith(cacheFirst(request));
  } else {
    // Alte resurse: Stale While Revalidate (rapid + fresh)
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Message Event - Comunicare cu clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// Error handling global
self.addEventListener('error', (event) => {
  if (isDevelopment()) {
    console.error('[SW] Global error:', event.error);
  }
});

self.addEventListener('unhandledrejection', (event) => {
  if (isDevelopment()) {
    console.error('[SW] Unhandled rejection:', event.reason);
  }
  event.preventDefault();
});
