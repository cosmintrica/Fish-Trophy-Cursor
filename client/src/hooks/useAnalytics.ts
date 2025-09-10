import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '@/lib/analytics';

export const useAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    analytics.trackPageView(location.pathname, document.title);
  }, [location]);

  return {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackUserAction: analytics.trackUserAction.bind(analytics),
    trackRecordSubmission: analytics.trackRecordSubmission.bind(analytics),
    trackMapInteraction: analytics.trackMapInteraction.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackAuth: analytics.trackAuth.bind(analytics)
  };
};
