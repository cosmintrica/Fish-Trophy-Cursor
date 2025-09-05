// Service Worker pentru Fish Trophy
const CACHE_NAME = 'fish-trophy-v6';
const STATIC_CACHE = 'fish-trophy-static-v6';

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Opened static cache');
        return cache.addAll([
          '/',
          '/index.html',
          '/manifest.json'
        ]);
      })
  );
  // Don't force activation on mobile to prevent infinite reloads
  // self.skipWaiting();
});

// Fetch event - network first strategy for better mobile experience
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip JavaScript modules and assets - let them load directly from network
  if (event.request.url.includes('/assets/') || 
      event.request.url.endsWith('.js') || 
      event.request.url.endsWith('.css') ||
      event.request.url.endsWith('.woff') ||
      event.request.url.endsWith('.woff2')) {
    return;
  }

  // For HTML files, always try network first
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If successful, cache and return response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Fallback to index.html for SPA routing
              return caches.match('/index.html');
            });
        })
    );
    return;
  }

  // For other resources, try cache first
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Don't take control immediately to prevent conflicts
      // return self.clients.claim();
    })
  );
});
