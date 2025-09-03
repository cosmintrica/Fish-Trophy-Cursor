// Script to clear all caches and service workers
// This can be included in the HTML to help with mobile reload issues

(function() {
  'use strict';
  
  console.log('Clearing all caches and service workers...');
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('All caches cleared');
    }).catch(function(error) {
      console.error('Error clearing caches:', error);
    });
  }
  
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (let registration of registrations) {
        console.log('Unregistering service worker:', registration);
        registration.unregister();
      }
    }).then(function() {
      console.log('All service workers unregistered');
    }).catch(function(error) {
      console.error('Error unregistering service workers:', error);
    });
  }
  
  // Clear localStorage and sessionStorage
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('Local storage cleared');
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
  
  console.log('Cache clearing complete');
})();
