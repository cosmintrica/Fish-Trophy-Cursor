import { useEffect } from 'react';

export const useErrorHandler = () => {
  useEffect(() => {
    // Global error handler to prevent infinite reloads
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      
      // Prevent default error handling that might cause reloads
      event.preventDefault();
      
      // Log error details for debugging
      console.error('Error message:', event.message);
      console.error('Error filename:', event.filename);
      console.error('Error line:', event.lineno);
      console.error('Error column:', event.colno);
      
      // Don't reload on mobile to prevent infinite loops
      if (window.innerWidth <= 768) {
        console.log('Mobile device - preventing auto-reload to avoid infinite loops');
        return false;
      }
      
      return true;
    };

    // Unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Prevent default handling
      event.preventDefault();
      
      // Log promise rejection details
      console.error('Promise rejection reason:', event.reason);
      
      return false;
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
};
