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

// Helper: Verifică dacă request-ul este pentru module Vite (development)
// Acestea trebuie să fie servite direct de Vite, nu de service worker
const isViteModule = (url) => {
  // In development, Vite serves source files directly
  // These should never be cached by service worker
  return url.includes('/src/') && 
         (url.endsWith('.tsx') || url.endsWith('.ts') || url.includes('?v='));
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
  
  // Skip Vite modules in development - must be served directly by Vite
  if (isViteModule(url.href)) {
    return; // Let Vite handle it directly
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
  // Handle SKIP_WAITING synchronously
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return; // Return early, no response needed
  }
  
  // Handle GET_VERSION with proper port checking
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports.length > 0 && event.ports[0]) {
      try {
        // Check if port is still open
        event.ports[0].postMessage({ version: CACHE_VERSION });
      } catch (error) {
        // Port is closed, ignore silently
      }
    }
    return; // Return early after handling
  }
  
  // For all other messages, only respond if we have a valid port
  // and respond synchronously to prevent "message channel closed" errors
  if (event.ports && event.ports.length > 0 && event.ports[0]) {
    try {
      // Respond synchronously if port is available
      event.ports[0].postMessage({ success: true });
    } catch (error) {
      // Port is closed, ignore silently - this is expected
    }
  }
  // If no port, don't try to respond - this prevents the error
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
