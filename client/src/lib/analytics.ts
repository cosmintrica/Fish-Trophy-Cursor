// Real analytics tracking system for Fish Trophy
import { supabase } from './supabase';

interface AnalyticsEvent {
  event_type: string;
  page_path: string;
  user_id?: string;
  session_id: string;
  timestamp: string;
  user_agent: string;
  referrer?: string;
  screen_resolution?: string;
  viewport_size?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  additional_data?: Record<string, any>;
}

class AnalyticsTracker {
  private sessionId: string;
  private userId?: string;
  private isInitialized = false;
  private userCountry?: string;
  private userCity?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initialize() {
    if (this.isInitialized) return;

    try {
      // Get user info if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      this.userId = user?.id;

      // Detect user location (country/city)
      await this.detectUserLocation();

      // Track page view
      await this.trackEvent('page_view', {
        page_path: window.location.pathname,
        page_title: document.title,
        referrer: document.referrer || undefined
      });

      // Track session start
      await this.trackEvent('session_start', {
        page_path: window.location.pathname,
        referrer: document.referrer || undefined
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Analytics initialization error:', error);
    }
  }

  private async detectUserLocation() {
    try {
      // Use a free IP geolocation service
      // Skip on localhost to avoid CORS errors
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        console.log('Running on localhost, skipping IP geolocation');
        this.userCountry = 'Development';
        this.userCity = 'Localhost';
        return;
      }

      const response = await fetch('/api/geo');
      if (response.ok) {
        const data = await response.json();
        this.userCountry = data.country_name || 'România';
        this.userCity = data.city || '';
      } else {
        // Fallback to Romania for Romanian fishing platform
        this.userCountry = 'România';
        this.userCity = '';
      }
    } catch (error) {
      console.log('Location detection failed, using Romania as default');
      this.userCountry = 'România';
      this.userCity = '';
    }
  }

  async trackEvent(eventType: string, additionalData: Record<string, any> = {}) {
    try {
      const event: AnalyticsEvent = {
        event_type: eventType,
        page_path: additionalData.page_path || window.location.pathname,
        user_id: this.userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer || undefined,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        device_type: this.getDeviceType(),
        browser: this.getBrowser(),
        os: this.getOS(),
        country: this.userCountry,
        city: this.userCity,
        additional_data: additionalData
      };

      // Transform event to match database schema
      const dbEvent = {
        event_type: event.event_type,
        user_id: event.user_id,
        session_id: event.session_id,
        page_path: event.page_path,
        user_agent: event.user_agent,
        referrer: event.referrer,
        screen_resolution: event.screen_resolution,
        viewport_size: event.viewport_size,
        device_type: event.device_type,
        browser: event.browser,
        os: event.os,
        country: event.country,
        city: event.city,
        additional_data: {
          page_title: additionalData.page_title,
          ...additionalData
        }
      };

      // Send to Supabase
      const { error } = await supabase
        .from('analytics_events')
        .insert([dbEvent]);

      if (error) {
        console.error('Analytics tracking error:', error);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getBrowser(): string {
    const userAgent = navigator.userAgent;

    // Edge (Chromium-based) - check first
    if (userAgent.includes('Edg/')) return 'Edge';

    // Opera - check before Chrome
    if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) return 'Opera';

    // Firefox
    if (userAgent.includes('Firefox/')) return 'Firefox';

    // Safari - check before Chrome but after Opera
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) return 'Safari';

    // Chrome - check after others
    if (userAgent.includes('Chrome/')) return 'Chrome';

    // Internet Explorer
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';

    // Brave (Chromium-based)
    if (userAgent.includes('Brave/')) return 'Brave';

    return 'Other';
  }

  private getOS(): string {
    const userAgent = navigator.userAgent;

    // Windows versions
    if (userAgent.includes('Windows NT 10.0')) return 'Windows 10/11';
    if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
    if (userAgent.includes('Windows NT 6.2')) return 'Windows 8';
    if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
    if (userAgent.includes('Windows NT 6.0')) return 'Windows Vista';
    if (userAgent.includes('Windows NT 5.1')) return 'Windows XP';
    if (userAgent.includes('Windows')) return 'Windows';

    // macOS versions
    if (userAgent.includes('Mac OS X 10_15')) return 'macOS Catalina';
    if (userAgent.includes('Mac OS X 10_14')) return 'macOS Mojave';
    if (userAgent.includes('Mac OS X 10_13')) return 'macOS High Sierra';
    if (userAgent.includes('Mac OS X 10_12')) return 'macOS Sierra';
    if (userAgent.includes('Mac OS X 10_11')) return 'macOS El Capitan';
    if (userAgent.includes('Mac OS X 10_10')) return 'macOS Yosemite';
    if (userAgent.includes('Mac OS X')) return 'macOS';
    if (userAgent.includes('Mac')) return 'macOS';

    // Linux distributions
    if (userAgent.includes('Ubuntu')) return 'Ubuntu';
    if (userAgent.includes('Debian')) return 'Debian';
    if (userAgent.includes('Fedora')) return 'Fedora';
    if (userAgent.includes('CentOS')) return 'CentOS';
    if (userAgent.includes('Red Hat')) return 'Red Hat';
    if (userAgent.includes('Linux')) return 'Linux';

    // Mobile OS - check mobile first for better detection
    if (userAgent.includes('iPhone')) return 'iOS';
    if (userAgent.includes('iPad')) return 'iPadOS';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone OS') || userAgent.includes('iOS')) return 'iOS';
    if (userAgent.includes('iPad OS')) return 'iPadOS';

    // Other
    if (userAgent.includes('FreeBSD')) return 'FreeBSD';
    if (userAgent.includes('OpenBSD')) return 'OpenBSD';
    if (userAgent.includes('NetBSD')) return 'NetBSD';

    return 'Other';
  }

  // Specific tracking methods
  async trackPageView(pagePath: string, pageTitle: string) {
    await this.trackEvent('page_view', {
      page_path: pagePath,
      page_title: pageTitle
    });
  }

  async trackUserAction(action: string, details: Record<string, any> = {}) {
    await this.trackEvent('user_action', {
      action,
      ...details
    });
  }

  async trackRecordSubmission(recordData: Record<string, any>) {
    await this.trackEvent('record_submission', {
      species: recordData.species,
      weight: recordData.weight,
      location: recordData.location
    });
  }

  async trackMapInteraction(interaction: string, details: Record<string, any> = {}) {
    await this.trackEvent('map_interaction', {
      interaction,
      ...details
    });
  }

  async trackSearch(query: string, results: number) {
    await this.trackEvent('search', {
      query,
      results_count: results
    });
  }

  async trackAuth(action: string, method: string) {
    await this.trackEvent('auth', {
      action, // 'login', 'logout', 'register'
      method // 'email', 'google'
    });
  }
}

// Create singleton instance
export const analytics = new AnalyticsTracker();

// Export for use in components
export default analytics;
