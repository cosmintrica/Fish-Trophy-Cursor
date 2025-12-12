import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { X, Shield, Settings, Fish, BarChart3, Target } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

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
  const location = useLocation();
  const isForum = location.pathname.startsWith('/forum');
  // Dark mode is now globally synchronized via ThemeContext.tsx
  // No need for separate detection - just use Tailwind dark: classes

  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [consent, setConsent] = useState<CookieConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(savedConsent);
        setConsent(parsed);
        updateGtagConsent(parsed);
      } catch (e) {
        setShowBanner(true);
      }
    }
  }, []);

  const updateGtagConsent = (consentState: CookieConsentState) => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        'event': 'consent_update',
        'consent': {
          'ad_storage': consentState.marketing ? 'granted' : 'denied',
          'ad_user_data': consentState.marketing ? 'granted' : 'denied',
          'ad_personalization': consentState.marketing ? 'granted' : 'denied',
          'analytics_storage': consentState.analytics ? 'granted' : 'denied'
        }
      });
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
    setIsMinimized(false);
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

  const handleMinimize = () => {
    setIsMinimized(true);
    setShowBanner(false);
  };

  const handleRestore = () => {
    setIsMinimized(false);
    setShowBanner(true);
    setShowSettings(false); // Restore to main view so user can "Accept All" easily
  };

  // Floating Cookie Token Component
  const CookieToken = () => (
    <div
      onClick={handleRestore}
      className={cn(
        "fixed bottom-4 left-4 z-[9998] cursor-pointer group animate-in fade-in zoom-in duration-300",
        "transition-transform hover:scale-110 active:scale-95"
      )}
      title="Setări Personalizare"
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute -inset-1 rounded-full bg-blue-400/30 dark:bg-blue-400/20 blur-md group-hover:bg-blue-400/50 transition-all" />

        {/* Token Circle */}
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-slate-900 border border-blue-200 dark:border-blue-700/50 shadow-lg shadow-blue-500/20 flex items-center justify-center overflow-hidden">
          {/* Animated Fish inside */}
          <Fish className="w-6 h-6 text-blue-600 dark:text-blue-400 fish-swim relative z-10" />

          {/* Token Shine */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Label on hover (Desktop only) */}
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md border border-gray-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 pointer-events-none whitespace-nowrap hidden md:block">
          Preferințe
          <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-slate-800" />
        </div>
      </div>
    </div>
  );

  // If banner is hidden OR minimized, show the token
  // Check if consent is saved (localStorage logic handled in effect), so if showBanner is false, we assume consent is saved OR user minimized.
  // We ALWAYS want to persist the choice to re-edit.
  if (!showBanner || isMinimized) {
    return (
      <>
        <style>{`
          @keyframes swim {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-3px) rotate(-5deg); }
            75% { transform: translateY(3px) rotate(5deg); }
          }
          .fish-swim {
            animation: swim 4s ease-in-out infinite;
          }
        `}</style>
        <CookieToken />
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes swim {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(-5deg); }
          75% { transform: translateY(3px) rotate(5deg); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .fish-swim {
          animation: swim 4s ease-in-out infinite;
        }
        .bg-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s infinite linear;
        }
        .dark .bg-shimmer {
          animation-duration: 8s; /* Slower animation in dark mode/forum */
        }
      `}</style>
        <div className={cn(
          "fixed bottom-4 left-4 right-4 md:left-4 md:right-auto z-[9999] md:w-full max-w-md mx-auto md:mx-0 transition-opacity duration-300 ease-out transform translate-y-0 opacity-100",
          "animate-in slide-in-from-bottom-8 fade-in leading-relaxed print:hidden"
        )}>
          <div className={cn(
            "rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-xl border border-white/20 overflow-hidden",
            "bg-white/80 dark:bg-slate-900/80 dark:border-slate-700/50",
            "relative group transition-colors duration-300 hover:bg-white/90 dark:hover:bg-slate-900/90"
          )}>
          {/* Animated Shimmer Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Decorative Gradient Border Top */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />

          {/* Header */}
          <div className="p-4 flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative group/icon">
                <div className="absolute -inset-2 rounded-full bg-blue-400/20 dark:bg-blue-400/10 blur-xl animate-pulse group-hover/icon:bg-blue-400/30 transition-all" />
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center border border-blue-200/50 dark:border-blue-700/30 shadow-inner">
                  <Fish className="w-5 h-5 text-blue-600 dark:text-blue-400 fish-swim" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-base leading-tight tracking-tight">
                  {showSettings ? 'Setări Năluci' : 'Prindem Cookie-uri?'}
                </h3>
                <p className="text-[10px] uppercase tracking-wider font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mt-0.5">
                  Confidențialitate & Date
                </p>
              </div>
            </div>
            {/* Close/Minimize button */}
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              title="Minimizează"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-4 relative z-10">
            {!showSettings ? (
              <>
                <p className="text-gray-600 dark:text-slate-300 text-xs leading-relaxed mb-4 font-medium">
                  Folosim cookie-uri pentru a-ți asigura <span className="text-blue-600 dark:text-blue-400 font-bold">"captura cea mare"</span> (experiență optimă).
                  Analizăm curenții (traficul) și personalizăm echipamentul.
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={handleAcceptAll}
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-500/25 rounded-xl py-4 h-auto font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ 
                      textRendering: 'optimizeLegibility',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    Acceptă Toată Captura 🎣
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRejectAll}
                      variant="ghost"
                      className="flex-1 text-gray-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 rounded-xl h-9 text-xs transition-colors"
                    >
                      Respinge
                    </Button>
                    <Button
                      onClick={() => setShowSettings(true)}
                      variant="ghost"
                      className="flex-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl h-9 text-xs transition-colors"
                    >
                      Personalizează
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 mb-4 max-h-[250px] overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {/* Necessary Cookies */}
                  <div className="rounded-xl p-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="font-bold text-xs text-gray-900 dark:text-white">Strict Necesare</span>
                      </div>
                      <span className="text-[9px] font-bold text-gray-500 dark:text-slate-400 bg-gray-200/80 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">OBLIGATORIU</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-normal">
                      Esențiale pentru funcționarea apelor. Fără ele, barca nu plutește.
                    </p>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-gray-100 dark:hover:border-slate-700/50 transition-all cursor-pointer group/item">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 group-hover/item:scale-110 transition-transform" />
                        <span className="font-bold text-xs text-gray-900 dark:text-white">Analiză</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer scale-75 origin-right">
                        <input
                          type="checkbox"
                          checked={consent.analytics}
                          onChange={handleToggleAnalytics}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                      </label>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-normal">
                      Măsurăm dimensiunea capturilor pentru statistici.
                    </p>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-gray-100 dark:hover:border-slate-700/50 transition-all cursor-pointer group/item">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 group-hover/item:scale-110 transition-transform" />
                        <span className="font-bold text-xs text-gray-900 dark:text-white">Marketing</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer scale-75 origin-right">
                        <input
                          type="checkbox"
                          checked={consent.marketing}
                          onChange={handleToggleMarketing}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-normal">
                      Reclame relevante pentru tine.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleSavePreferences}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md py-4 h-auto text-sm"
                  >
                    Salvează setările
                  </Button>
                  <Button
                    onClick={() => setShowSettings(false)}
                    variant="ghost"
                    className="w-full text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-300 h-8 text-xs"
                  >
                    Înapoi
                  </Button>
                </div>
              </>
            )}

            {/* Footer Link */}
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-800/50 flex justify-center items-center gap-2 whitespace-nowrap">
              <Link to={isForum ? "/forum/privacy" : "/privacy"} className="text-[9px] font-semibold text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-wide">
                Politică Confidențialitate
              </Link>
              <span className="text-[9px] text-gray-300 dark:text-slate-700">•</span>
              <Link to={isForum ? "/forum/cookies" : "/cookies"} className="text-[9px] font-semibold text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-wide">
                Politică Cookie-uri
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
