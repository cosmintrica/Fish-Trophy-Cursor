// import React from 'react'; // Not needed in React 17+ with new JSX transform
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { Toaster } from '@/components/ui/toaster'; // Temporarily disabled
import App from './App';
import './styles/index.css';

// Create a client with minimal configuration to prevent reload issues
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 0, // Disable retries to prevent reload loops
      refetchOnWindowFocus: false, // Disable refetch on focus
      refetchOnReconnect: false, // Disable refetch on reconnect
    },
  },
});

// Service Worker temporarily disabled to fix mobile infinite reload issue
// TODO: Re-enable with proper mobile optimization
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
      .then((registration) => {
        console.log('SW registered successfully: ', registration);
        
        // Check for updates but don't auto-reload
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available - just log it, don't auto-reload
                console.log('New service worker installed. User can refresh manually.');
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.error('SW registration failed: ', registrationError);
        // Don't let SW registration errors break the app
      });
  });
}
*/

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;"><h1>Eroare de încărcare</h1><p>Elementul root nu a fost găsit. Te rugăm să reîmprospătezi pagina.</p></div>';
} else {
  ReactDOM.createRoot(rootElement).render(
    // React.StrictMode temporarily disabled to fix mobile reload issue
    // <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        {/* <Toaster /> temporarily disabled */}
      </QueryClientProvider>
    // </React.StrictMode>
  );
}
