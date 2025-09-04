import { useState, useEffect, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Fish, Menu, X, Home, MapPin, User, Trophy, FileText, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from './AuthModal';
import PWAInstallPrompt from './PWAInstallPrompt';
import { Toaster } from '@/components/ui/toaster';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, loading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // PWA Install Prompt - folosim hook-ul
  const location = useLocation();

  // Check if user is admin - use environment variable for security
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;
  const [showBlackSeaPopup, setShowBlackSeaPopup] = useState(false);

  // PWA Install Prompt Logic
  const [showPWAInstallPrompt, setShowPWAInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone = ((): boolean => {
      try {
        // PWA already installed
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
        // iOS Safari
        // @ts-ignore - iOS Safari standalone property
        if (typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone) return true;
      } catch {
        // Ignore errors
      }
      return false;
    })();

    const isMobile = ((): boolean => {
      try {
        // Prefer UA hints when available
        // @ts-ignore - User Agent Client Hints API
        if ((navigator as { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile) return true;
      } catch {
        // Ignore errors
      }
      const ua = navigator.userAgent || '';
      const maxTouchPoints = (navigator as { maxTouchPoints?: number }).maxTouchPoints ?? 0;
      const touchIpad = navigator.platform === 'MacIntel' && maxTouchPoints > 1;
      return /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua) || touchIpad;
    })();

    if (isStandalone || !isMobile) {
      // Never show install prompt on desktop or if already installed
      setShowPWAInstallPrompt(false);
      setDeferredPrompt(null);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPWAInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Hide PWA prompt after 10 seconds
  useEffect(() => {
    if (showPWAInstallPrompt) {
      const timer = setTimeout(() => {
        setShowPWAInstallPrompt(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showPWAInstallPrompt]);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPWAInstallPrompt(false);
      }
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // PWA Install Prompt logic - folosim hook-ul din PWAInstallPrompt

  // Close mobile menu when route changes
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  // Fallback pentru cazurile când aplicația nu se încarcă - DUPĂ toate hook-urile
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-blue-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Title */}
            <Link to="/" className="flex items-center space-x-3 group">
              <img
                src="/icon_free.png"
                alt="Fish Trophy"
                className="w-12 h-12 rounded-xl group-hover:scale-110 transition-transform duration-300"
              />
              <span className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:via-indigo-700 group-hover:to-purple-700 transition-all duration-300">
                Fish Trophy
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/' 
                    ? 'text-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Acasa
              </Link>
              <Link
                to="/species"
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                Specii
              </Link>
              <Link
                to="/records"
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                Recorduri
              </Link>
              <Link
                to="/submission-guide"
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                Ghid Submisie
              </Link>
              {isAdmin ? (
                <Link
                  to="/black-sea"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === '/black-sea' 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Marea Neagră
                </Link>
              ) : (
                <button
                  onClick={() => setShowBlackSeaPopup(true)}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Marea Neagră
                </button>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* User Section */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="hidden sm:block text-sm text-gray-700">
                    {user.email}
                  </span>
                  <Link
                    to="/profile"
                    className="hidden sm:inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profilul meu
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hidden sm:inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <User className="w-4 h-4 mr-2" />
                  Autentificare
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-xl text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
        isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
        
        {/* Menu Panel */}
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {/* Menu Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <img 
                src="/icon_free.png" 
                alt="Fish Trophy" 
                className="w-8 h-8 rounded-xl"
              />
              <span className="text-lg font-bold text-gray-900">Meniu</span>
            </div>
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="p-6 space-y-2">
            <Link
              to="/"
              className={`flex items-center space-x-3 p-3 rounded-xl transition-colors ${
                location.pathname === '/' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={closeMobileMenu}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Acasa</span>
            </Link>
            
            <Link
              to="/species"
              className="flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={closeMobileMenu}
            >
              <Fish className="w-5 h-5" />
              <span className="font-medium">Specii</span>
            </Link>
            
            <Link
              to="/records"
              className="flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={closeMobileMenu}
            >
              <Trophy className="w-5 h-5" />
              <span className="font-medium">Recorduri</span>
            </Link>
            
            <Link
              to="/submission-guide"
              className="flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={closeMobileMenu}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Ghid Submisie</span>
            </Link>
            
            {isAdmin ? (
              <Link
                to="/black-sea"
                className={`flex items-center space-x-3 p-3 rounded-xl transition-colors ${
                  location.pathname === '/black-sea' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={closeMobileMenu}
              >
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Marea Neagră</span>
              </Link>
            ) : (
              <button
                onClick={() => {
                  setShowBlackSeaPopup(true);
                  closeMobileMenu();
                }}
                className="flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
              >
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Marea Neagră</span>
              </button>
            )}
            
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={closeMobileMenu}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Admin</span>
              </Link>
            )}
          </nav>

          {/* User Section in Mobile Menu */}
          {user ? (
            <div className="p-6 border-t border-gray-200 space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              
              <Link
                to="/profile"
                className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                onClick={closeMobileMenu}
              >
                <User className="w-4 h-4 mr-2" />
                Profilul meu
              </Link>
              
              <button
                onClick={() => {
                  logout();
                  closeMobileMenu();
                }}
                className="flex items-center justify-center w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                                 Ieșire
              </button>
            </div>
          ) : (
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsAuthModalOpen(true);
                  closeMobileMenu();
                }}
                className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                <User className="w-4 h-4 mr-2" />
                Autentificare
              </button>
            </div>
          )}

          {/* PWA Install Button in Mobile Menu - temporarily disabled */}
          {/* {showPWAInstallPrompt && (
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  handleInstallPWA();
                  closeMobileMenu();
                }}
                className="flex items-center justify-center w-full px-4 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adauga pe ecranul principal
              </button>
            </div>
          )} */}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 -mt-4">
        {children}
      </main>

      {/* PWA Install Prompt - temporarily disabled for mobile stability */}
      {/* <PWAInstallPrompt /> */}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Logo & Mission */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <img src="/icon_free.png" alt="Fish Trophy" className="w-14 h-14 rounded-2xl shadow-lg" />
                <div>
                  <span className="text-2xl md:text-3xl font-bold text-gray-900">Fish Trophy</span>
                  <p className="text-sm text-blue-600 font-medium">Platforma pentru recorduri de pescuit</p>
                </div>
              </div>
              <p className="text-gray-600 max-w-lg leading-relaxed mb-6">
                Urmărește recordurile, concurează cu alții pescari pasionați și contribuie la protejarea naturii prin pescuit responsabil.
              </p>
              <div className="flex space-x-4">
                <a href="mailto:contact@fishtrophy.ro" className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact
                </a>
                <a href="https://fishtrophy.ro" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="w-4 h-4 mr-2">🌐</span>
                  Website
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Navigare</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center group">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3 group-hover:bg-blue-600 transition-colors"></span>
                    Acasă
                  </Link>
                </li>
                <li>
                  <Link to="/species" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center group">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3 group-hover:bg-blue-600 transition-colors"></span>
                    Specii
                  </Link>
                </li>
                <li>
                  <Link to="/records" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center group">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3 group-hover:bg-blue-600 transition-colors"></span>
                    Recorduri
                  </Link>
                </li>
                <li>
                  <Link to="/black-sea" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center group">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3 group-hover:bg-blue-600 transition-colors"></span>
                    Marea Neagră
                  </Link>
                </li>
                <li>
                  <Link to="/submission-guide" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center group">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3 group-hover:bg-blue-600 transition-colors"></span>
                    Ghid Submisie
                  </Link>
                </li>
              </ul>
            </div>

            {/* Community & Support */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Comunitate</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/profile" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center group">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-3 group-hover:bg-green-600 transition-colors"></span>
                    Profilul meu
                  </Link>
                </li>
                <li>
                  <Link to="/leaderboards" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center group">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-3 group-hover:bg-yellow-600 transition-colors"></span>
                    Clasamente
                  </Link>
                </li>
                <li>
                  <Link to="/fishing-shops" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center group">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-3 group-hover:bg-purple-600 transition-colors"></span>
                    Magazine
                  </Link>
                </li>
              </ul>
              
              <div className="mt-8">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Urmărește-ne</h4>
                <div className="flex space-x-3">
                  <a href="#" className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors">
                    <span className="text-sm">📘</span>
                  </a>
                  <a href="#" className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-200 transition-colors">
                    <span className="text-sm">📷</span>
                  </a>
                  <a href="#" className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-200 transition-colors">
                    <span className="text-sm">📺</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-200 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span>© 2025 Fish Trophy</span>
                <span>•</span>
                <span>Toate drepturile rezervate</span>
                <span>•</span>
                <a href="#" className="hover:text-gray-700 transition-colors">Politica de confidențialitate</a>
                <span>•</span>
                <a href="#" className="hover:text-gray-700 transition-colors">Termeni și condiții</a>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Făcut cu</span>
                <span className="text-red-500">❤️</span>
                <span>în România</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Black Sea Coming Soon Popup */}
      {showBlackSeaPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBlackSeaPopup(false)} />
          <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-full mx-2 sm:mx-0 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Fish className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Marea Neagră</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                Această secțiune este în construcție și va fi disponibilă în curând. 
                Vom adăuga locații de pescuit, specii marine și recorduri din Marea Neagră.
              </p>
              <button
                onClick={() => setShowBlackSeaPopup(false)}
                className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                Înțeleg
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Prompt */}
      {showPWAInstallPrompt && (
        <PWAInstallPrompt
          onInstall={handleInstallPWA}
          onDismiss={() => setShowPWAInstallPrompt(false)}
        />
      )}
      {/* Global toast renderer (bottom-right, default styling) */}
      <Toaster position="bottom-right" />
    </div>
  );
}

