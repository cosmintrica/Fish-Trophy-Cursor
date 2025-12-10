import { useEffect } from 'react';

interface WebVitalsMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType: string;
}

export const useWebVitals = () => {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Import web-vitals library dynamically
    import('web-vitals').then((webVitals) => {
      const { onCLS, onINP, onFCP, onLCP, onTTFB } = webVitals;

      const sendToGTM = (metric: WebVitalsMetric) => {
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'web_vitals',
            event_category: 'Performance',
            event_label: metric.name,
            value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
            metric_id: metric.id,
            metric_delta: metric.delta,
            metric_navigation_type: metric.navigationType
          });
        }
      };

      // Cumulative Layout Shift (CLS)
      onCLS(sendToGTM);

      // Interaction to Next Paint (INP)
      onINP(sendToGTM);

      // First Contentful Paint (FCP)
      onFCP(sendToGTM);

      // Largest Contentful Paint (LCP)
      onLCP(sendToGTM);

      // Time to First Byte (TTFB)
      onTTFB(sendToGTM);
    }).catch((error) => {
      console.warn('Failed to load web-vitals:', error);
    });
  }, []);
};

// Performance optimization utilities
export const performanceUtils = {
  // Preload critical resources
  preloadResource: (href: string, as: string) => {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  },

  // Preconnect to external domains
  preconnect: (href: string) => {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    document.head.appendChild(link);
  },

  // Lazy load images
  lazyLoadImage: (img: HTMLImageElement) => {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const image = entry.target as HTMLImageElement;
            if (image.dataset.src) {
              image.src = image.dataset.src;
              image.removeAttribute('data-src');
            }
            observer.unobserve(image);
          }
        });
      });
      observer.observe(img);
    } else {
      // Fallback for older browsers
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    }
  },

  // Optimize font loading
  optimizeFonts: () => {
    // Fonturile sunt deja încărcate în index.html (Montserrat)
    // Nu mai încărcăm fonturi suplimentare
  },

  // Service Worker registration for caching
  registerServiceWorker: () => {
    // Service worker registration moved to main.tsx to avoid conflicts
    // console.log('Service worker registration handled in main.tsx');
  }
};
