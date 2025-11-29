import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './forum/styles/forum.css';

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
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
      .then((registration) => {
        console.log('[SW] Registered:', registration.scope);
        
        // Verifică pentru update-uri
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available - notify user
                console.log('[SW] New version available');
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
