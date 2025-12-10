import { useState, useEffect } from 'react';
import { X, Cookie, Shield, Settings } from 'lucide-react';
import { Button } from './ui/button';

// Extend Window interface for GTM dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}

const COOKIE_CONSENT_KEY = 'cookie_consent';
const COOKIE_CONSENT_EXPIRY_DAYS = 365;

interface CookieConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<CookieConsentState>({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(savedConsent);
        setConsent(parsed);
        // Update gtag consent based on saved preferences
        updateGtagConsent(parsed);
      } catch (e) {
        setShowBanner(true);
      }
    }
  }, []);

  const updateGtagConsent = (consentState: CookieConsentState) => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      // Consent Mode v2 - Update consent via GTM dataLayer
      // This works with Google Tag Manager
      window.dataLayer.push({
        'event': 'consent_update',
        'consent': {
          'ad_storage': consentState.marketing ? 'granted' : 'denied',
          'ad_user_data': consentState.marketing ? 'granted' : 'denied',
          'ad_personalization': consentState.marketing ? 'granted' : 'denied',
          'analytics_storage': consentState.analytics ? 'granted' : 'denied'
        }
      });
      
      // Also push gtag consent update for compatibility
      window.dataLayer.push({
        'event': 'gtag.consent',
        'gtag.consent': {
          'ad_storage': consentState.marketing ? 'granted' : 'denied',
          'ad_user_data': consentState.marketing ? 'granted' : 'denied',
          'ad_personalization': consentState.marketing ? 'granted' : 'denied',
          'analytics_storage': consentState.analytics ? 'granted' : 'denied'
        }
      });
    }
  };

  const saveConsent = (consentState: CookieConsentState) => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + COOKIE_CONSENT_EXPIRY_DAYS);
    
    const consentData = {
      ...consentState,
      timestamp: new Date().toISOString(),
      expiry: expiryDate.toISOString(),
    };
    
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    updateGtagConsent(consentState);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptAll = () => {
    const allAccepted: CookieConsentState = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    setConsent(allAccepted);
    saveConsent(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyNecessary: CookieConsentState = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    setConsent(onlyNecessary);
    saveConsent(onlyNecessary);
  };

  const handleSavePreferences = () => {
    saveConsent(consent);
  };

  const handleToggleAnalytics = () => {
    setConsent(prev => ({ ...prev, analytics: !prev.analytics }));
  };

  const handleToggleMarketing = () => {
    setConsent(prev => ({ ...prev, marketing: !prev.marketing }));
  };

  if (!showBanner && !showSettings) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4 md:p-6">
      <div className="max-w-2xl md:max-w-3xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Cookie className="w-5 h-5 md:w-6 md:h-6 text-white flex-shrink-0" />
            <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg">
              {showSettings ? 'Setări Cookie-uri' : 'Cookie-uri și Confidențialitate'}
            </h3>
          </div>
          <button
            onClick={() => {
              setShowBanner(false);
              setShowSettings(false);
            }}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="Închide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6">
          {!showSettings ? (
            <>
              <p className="text-gray-700 text-xs sm:text-sm md:text-base mb-3 md:mb-4 leading-relaxed">
                Folosim cookie-uri pentru a îmbunătăți experiența ta pe site, pentru analiză și pentru personalizare. 
                Cookie-urile necesare sunt întotdeauna active. Poți alege să activezi sau să dezactivezi cookie-urile 
                pentru analiză și marketing.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAcceptAll}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Acceptă toate
                </Button>
                <Button
                  onClick={handleRejectAll}
                  variant="outline"
                  className="flex-1"
                >
                  Respinge toate
                </Button>
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Personalizează
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {/* Necessary Cookies */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">Cookie-uri Necesare</span>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Întotdeauna active</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Aceste cookie-uri sunt esențiale pentru funcționarea site-ului și nu pot fi dezactivate.
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cookie className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-900">Cookie-uri de Analiză</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent.analytics}
                        onChange={handleToggleAnalytics}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Ne ajută să înțelegem cum interacționezi cu site-ul prin Google Analytics.
                  </p>
                </div>

                {/* Marketing Cookies */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cookie className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900">Cookie-uri de Marketing</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent.marketing}
                        onChange={handleToggleMarketing}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Folosite pentru publicitate personalizată și măsurarea performanței campaniilor.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSavePreferences}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Salvează preferințele
                </Button>
                <Button
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Înapoi
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer Link */}
        <div className="px-3 sm:px-4 md:px-6 py-2 md:py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-[10px] sm:text-xs text-gray-600 text-center">
            Pentru mai multe informații, consultă{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Politica de Confidențialitate
            </a>
            {' '}și{' '}
            <a href="/cookies" className="text-blue-600 hover:underline">
              Politica de Cookie-uri
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

