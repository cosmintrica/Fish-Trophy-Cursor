import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './forum/styles/forum.css';

// CRITICAL: Dezactivează Service Worker-ul în development ÎNAINTE de orice alt cod
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isDevelopment = window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.port === '5173' ||
    window.location.port === '8889' ||
    window.location.port === '8888';
  
  if (isDevelopment) {
    // Blochează complet înregistrarea Service Worker-ului în development
    const originalRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = function(...args: any[]) {
      console.warn('[SW] Service Worker registration BLOCKED in development');
      return Promise.reject(new Error('Service Worker disabled in development'));
    };
    
    // Șterge Service Worker-ul existent imediat
    (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName.startsWith('fish-trophy')) {
                return caches.delete(cacheName);
              }
            })
          );
        }
      } catch (error) {
        // Ignore
      }
    })();
  }
}

// Suppress 403 errors from Supabase auth when no session exists (normal behavior)
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      // Suppress 403 errors for Supabase auth endpoints when no session (normal)
      if (response.status === 403 && args[0] && typeof args[0] === 'string' && args[0].includes('/auth/v1/user')) {
        // This is normal when user is not authenticated - don't log to console
        return response;
      }
      return response;
    } catch (error) {
      // Suppress 403 errors in catch as well
      if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
        const url = args[0];
        if (url && typeof url === 'string' && url.includes('/auth/v1/user')) {
          // Normal 403 when no session - don't log
          return Promise.reject(error);
        }
      }
      throw error;
    }
  };
}

// Register Service Worker for PWA (optimizat)
// În development, dezactivează complet Service Worker-ul pentru a evita conflicte cu Vite/Netlify Dev
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  // Verifică dacă suntem în development - dezactivează COMPLET în development
  const isDevelopment = window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.port === '5173' ||
    window.location.port === '8889' ||
    window.location.port === '8888' ||
    window.location.hostname.includes('.netlify.app');
  
  if (!isDevelopment && import.meta.env.PROD) {
    // Production: înregistrează Service Worker
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
        .then((registration) => {
          // Verifică pentru update-uri
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available - notify user
                  // Poți adăuga aici o notificare pentru utilizator
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });
      
      // Verifică pentru update-uri periodice (la fiecare 60 de minute)
      setInterval(() => {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            registration.update();
          }
        });
      }, 60 * 60 * 1000);
    });
  } else {
    // Development: dezactivează și șterge Service Worker-ul existent IMEDIAT
    // IMPORTANT: Facem asta înainte ca Service Worker-ul să se poată înregistra
    (async () => {
      try {
        // Dezactivează Service Worker-ul existent
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          // Unregister imediat
          await registration.unregister();
          console.log('[SW] Unregistered in development:', registration.scope);
        }
        
        // Șterge toate cache-urile Service Worker
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName.startsWith('fish-trophy')) {
                console.log('[SW] Deleting cache in development:', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        }
      } catch (error) {
        console.warn('[SW] Error unregistering in development:', error);
      }
    })();
    
    // Previne înregistrarea Service Worker-ului în development
    // Override register method temporar
    const originalRegister = navigator.serviceWorker.register;
    navigator.serviceWorker.register = function(...args) {
      console.warn('[SW] Service Worker registration blocked in development');
      return Promise.reject(new Error('Service Worker disabled in development'));
    };
  }
}

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;"><h1>Eroare de încărcare</h1><p>Elementul root nu a fost găsit. Te rugăm să reîmprospătezi pagina.</p></div>';
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    rootElement.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;"><h1>Eroare de încărcare</h1><p>Aplicația nu a putut fi încărcată. Te rugăm să reîmprospătezi pagina.</p></div>';
  }
}
