// Google Analytics 4 and Google Tag Manager integration
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export const GA_TRACKING_ID = 'G-XXXXXXXXXX'; // Replace with your GA4 tracking ID
export const GTM_ID = 'GTM-XXXXXXX'; // Replace with your GTM ID

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window === 'undefined') return;

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
    send_page_view: true
  });
};

// Initialize Google Tag Manager
export const initGTM = () => {
  if (typeof window === 'undefined') return;

  // GTM script
  const gtmScript = document.createElement('script');
  gtmScript.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${GTM_ID}');
  `;
  document.head.appendChild(gtmScript);

  // GTM noscript
  const noscript = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`;
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);
};

// Track page views
export const trackPageView = (url: string, title?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
    page_title: title || document.title,
    page_location: window.location.href
  });
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  });
};

// Track fishing-specific events
export const trackFishingEvent = {
  locationViewed: (locationName: string, locationType: string) => {
    trackEvent('location_viewed', 'fishing', `${locationName} (${locationType})`);
  },
  
  recordSubmitted: (species: string, weight: string) => {
    trackEvent('record_submitted', 'fishing', `${species} - ${weight}`);
  },
  
  mapFilterUsed: (filterType: string) => {
    trackEvent('map_filter_used', 'navigation', filterType);
  },
  
  userLocationRequested: () => {
    trackEvent('user_location_requested', 'geolocation', 'homepage');
  },
  
  speciesViewed: (speciesName: string) => {
    trackEvent('species_viewed', 'content', speciesName);
  },
  
  leaderboardViewed: (category: string) => {
    trackEvent('leaderboard_viewed', 'content', category);
  }
};

// Track performance metrics
export const trackPerformance = {
  pageLoad: (loadTime: number) => {
    trackEvent('page_load_time', 'performance', 'homepage', Math.round(loadTime));
  },
  
  mapLoad: (loadTime: number) => {
    trackEvent('map_load_time', 'performance', 'leaflet', Math.round(loadTime));
  },
  
  apiResponse: (endpoint: string, responseTime: number) => {
    trackEvent('api_response_time', 'performance', endpoint, Math.round(responseTime));
  }
};

// Track user engagement
export const trackEngagement = {
  timeOnPage: (page: string, timeInSeconds: number) => {
    trackEvent('time_on_page', 'engagement', page, timeInSeconds);
  },
  
  scrollDepth: (page: string, depth: number) => {
    trackEvent('scroll_depth', 'engagement', page, depth);
  },
  
  clickThrough: (from: string, to: string) => {
    trackEvent('click_through', 'navigation', `${from} -> ${to}`);
  }
};

// Initialize analytics on app start
export const initAnalytics = () => {
  initGA();
  initGTM();
  
  // Track initial page load
  trackPageView(window.location.pathname);
  
  // Track performance
  if ('performance' in window) {
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      trackPerformance.pageLoad(loadTime);
    });
  }
};
