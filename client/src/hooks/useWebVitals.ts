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
      // Cumulative Layout Shift (CLS)
      onCLS((metric: WebVitalsMetric) => {
        // // console.log('CLS:', metric);
        // Send to analytics
        if ((window as any).gtag) {
          (window as any).gtag('event', 'web_vitals', {
            event_category: 'Performance',
            event_label: 'CLS',
            value: Math.round(metric.value * 1000), // Convert to milliseconds
            custom_map: {
              metric_id: metric.id,
              metric_delta: metric.delta,
              metric_navigation_type: metric.navigationType
            }
          });
        }
      });

      // Interaction to Next Paint (INP) - replaces FID in Core Web Vitals
      onINP((metric: WebVitalsMetric) => {
        // console.log('INP:', metric);
        if ((window as any).gtag) {
          (window as any).gtag('event', 'web_vitals', {
            event_category: 'Performance',
            event_label: 'INP',
            value: Math.round(metric.value),
            custom_map: {
              metric_id: metric.id,
              metric_delta: metric.delta,
              metric_navigation_type: metric.navigationType
            }
          });
        }
      });

      // First Contentful Paint (FCP)
      onFCP((metric: WebVitalsMetric) => {
        // console.log('FCP:', metric);
        if ((window as any).gtag) {
          (window as any).gtag('event', 'web_vitals', {
            event_category: 'Performance',
            event_label: 'FCP',
            value: Math.round(metric.value),
            custom_map: {
              metric_id: metric.id,
              metric_delta: metric.delta,
              metric_navigation_type: metric.navigationType
            }
          });
        }
      });

      // Largest Contentful Paint (LCP)
      onLCP((metric: WebVitalsMetric) => {
        // console.log('LCP:', metric);
        if ((window as any).gtag) {
          (window as any).gtag('event', 'web_vitals', {
            event_category: 'Performance',
            event_label: 'LCP',
            value: Math.round(metric.value),
            custom_map: {
              metric_id: metric.id,
              metric_delta: metric.delta,
              metric_navigation_type: metric.navigationType
            }
          });
        }
      });

      // Time to First Byte (TTFB)
      onTTFB((metric: WebVitalsMetric) => {
        // console.log('TTFB:', metric);
        if ((window as any).gtag) {
          (window as any).gtag('event', 'web_vitals', {
            event_category: 'Performance',
            event_label: 'TTFB',
            value: Math.round(metric.value),
            custom_map: {
              metric_id: metric.id,
              metric_delta: metric.delta,
              metric_navigation_type: metric.navigationType
            }
          });
        }
      });
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
    if (typeof document === 'undefined') return;

    // Preload critical fonts
    const criticalFonts = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
    ];

    criticalFonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = font;
      link.as = 'style';
      link.onload = () => {
        link.rel = 'stylesheet';
      };
      document.head.appendChild(link);
    });
  },

  // Service Worker registration for caching
  registerServiceWorker: () => {
    // Service worker registration moved to main.tsx to avoid conflicts
    // console.log('Service worker registration handled in main.tsx');
  }
};
