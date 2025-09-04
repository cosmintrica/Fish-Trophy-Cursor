// import React from 'react'; // Not needed with automatic JSX runtime // Explicitly import React for better compatibility
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
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

// Service Worker disabled in development to prevent cache conflicts
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Only register SW in production
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
        .then((registration) => {
          console.log('SW registered successfully: ', registration);
        })
        .catch((registrationError) => {
          console.error('SW registration failed: ', registrationError);
        });
    });
  } else {
    // In development, unregister any existing SW to prevent conflicts
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
    });
  }
}

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;"><h1>Eroare de încărcare</h1><p>Elementul root nu a fost găsit. Te rugăm să reîmprospătezi pagina.</p></div>';
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      // React.StrictMode temporarily disabled to fix mobile reload issue
      // <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster />
        </QueryClientProvider>
      // </React.StrictMode>
    );
  } catch (error) {
    console.error('Error rendering React app:', error);
    rootElement.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;"><h1>Eroare de încărcare</h1><p>Aplicația nu a putut fi încărcată. Te rugăm să reîmprospătezi pagina.</p></div>';
  }
}
