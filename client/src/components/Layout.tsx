import { useState, useEffect, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Fish, Menu, X, Home, MapPin, User, Trophy, FileText, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import AuthModal from './AuthModal';
import PWAInstallPrompt from './PWAInstallPrompt';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, loading } = useAuth();
  const { trackUserAction } = useAnalytics();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // PWA Install Prompt - folosim hook-ul
  const location = useLocation();

  // Check if user is admin - use environment variable for security
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;
  // Removed Black Sea popup - now direct link

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
    // Re-enable body scroll
    document.body.classList.remove('mobile-menu-open');
  };

  const openMobileMenu = () => {
    setIsMobileMenuOpen(true);
    // Disable body scroll when menu is open
    document.body.classList.add('mobile-menu-open');
  };

  // PWA Install Prompt logic - folosim hook-ul din PWAInstallPrompt

  // Close mobile menu when route changes
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, []);

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
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-b border-blue-200/50 shadow-lg">
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
                Acasă
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
                <Link
                  to="/black-sea"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Marea Neagră
                </Link>
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
                onClick={isMobileMenuOpen ? closeMobileMenu : openMobileMenu}
                className={`lg:hidden inline-flex items-center justify-center p-3 rounded-xl text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 active:scale-95 ${
                  isMobileMenuOpen ? 'rotate-90' : 'rotate-0'
                }`}
                aria-label={isMobileMenuOpen ? 'Închide meniul' : 'Deschide meniul'}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 transition-transform duration-300" />
                ) : (
                  <Menu className="w-6 h-6 transition-transform duration-300" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={`lg:hidden fixed inset-0 z-50 transition-all duration-500 ease-out ${
        isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ease-out ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMobileMenu}
        />

        {/* Menu Panel */}
        <div className={`absolute right-0 top-0 h-full w-80 max-w-[85vw] sm:w-80 md:w-96 bg-white shadow-2xl transform transition-all duration-500 ease-out ${
          isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          {/* Menu Header */}
          <div className={`flex items-center justify-between p-6 border-b border-gray-200 transition-all duration-600 ease-out ${
            isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
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
              className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-300 active:scale-95 hover:rotate-90"
              aria-label="Închide meniul"
            >
              <X className="w-5 h-5 transition-transform duration-300" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className={`p-6 space-y-2 transition-all duration-700 ease-out ${
            isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <Link
              to="/"
              className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                location.pathname === '/'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 active:scale-95'
              }`}
              onClick={closeMobileMenu}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Acasă</span>
            </Link>

            <Link
              to="/species"
              className="flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 active:scale-95"
              onClick={closeMobileMenu}
            >
              <Fish className="w-5 h-5" />
              <span className="font-medium">Specii</span>
            </Link>

            <Link
              to="/records"
              className="flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 active:scale-95"
              onClick={closeMobileMenu}
            >
              <Trophy className="w-5 h-5" />
              <span className="font-medium">Recorduri</span>
            </Link>

            <Link
              to="/submission-guide"
              className="flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 active:scale-95"
              onClick={closeMobileMenu}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Ghid Submisie</span>
            </Link>

            {isAdmin ? (
              <Link
                to="/black-sea"
                className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                  location.pathname === '/black-sea'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 active:scale-95'
                }`}
                onClick={closeMobileMenu}
              >
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Marea Neagră</span>
              </Link>
            ) : (
              <Link
                to="/black-sea"
                className="flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 active:scale-95"
                onClick={closeMobileMenu}
              >
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Marea Neagră</span>
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 active:scale-95"
                onClick={closeMobileMenu}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Admin</span>
              </Link>
            )}
          </nav>

          {/* User Section in Mobile Menu */}
          {user ? (
            <div className={`p-6 border-t border-gray-200 space-y-3 transition-all duration-800 ease-out ${
              isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
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
                className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 active:scale-95"
                onClick={closeMobileMenu}
              >
                <User className="w-4 h-4 mr-2" />
                Profilul meu
              </Link>

              <button
                onClick={() => {
                  trackUserAction('logout', { method: 'email' });
                  logout();
                  closeMobileMenu();
                }}
                className="flex items-center justify-center w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200 active:scale-95"
              >
                <X className="w-4 h-4 mr-2" />
                                 Ieșire
              </button>
            </div>
          ) : (
            <div className={`p-6 border-t border-gray-200 transition-all duration-800 ease-out ${
              isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <button
                onClick={() => {
                  setIsAuthModalOpen(true);
                  closeMobileMenu();
                }}
                className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 active:scale-95"
              >
                <User className="w-4 h-4 mr-2" />
                Autentificare
              </button>
            </div>
          )}

          {/* Social Links */}
          <div className={`p-6 border-t border-gray-200 transition-all duration-900 ease-out ${
            isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Urmărește-ne</h3>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com/fishtrophy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                onClick={closeMobileMenu}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://instagram.com/fishtrophy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors"
                onClick={closeMobileMenu}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.647.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.281c-.49 0-.98-.49-.98-.98s.49-.98.98-.98.98.49.98.98-.49.98-.98.98z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com/fishtrophy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                onClick={closeMobileMenu}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>

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
      <main className="flex-1 pt-16">
        {children}
      </main>

      {/* PWA Install Prompt - temporarily disabled for mobile stability */}
      {/* <PWAInstallPrompt /> */}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Logo & Mission */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img src="/icon_free.png" alt="Fish Trophy" className="w-10 h-10 rounded-lg" />
                <div>
                  <span className="text-xl font-bold text-gray-900">Fish Trophy</span>
                  <p className="text-xs text-gray-500">Platforma pentru recorduri de pescuit</p>
                </div>
              </div>
              <p className="text-gray-600 max-w-lg leading-relaxed mb-4 text-sm">
                Urmărește recordurile, concurează cu alții pescari pasionați și contribuie la protejarea naturii prin pescuit responsabil.
              </p>
              <div className="flex gap-2">
                <a href="mailto:contact@fishtrophy.ro" className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-xs">
                  <Mail className="w-3 h-3 mr-1" />
                  Contact
                </a>
                <a href="https://fishtrophy.ro" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-xs">
                  <span className="w-3 h-3 mr-1">🌐</span>
                  Website
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Navigare</h3>
              <ul className="space-y-2">
                <li><Link to="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Acasă</Link></li>
                <li><Link to="/species" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Specii</Link></li>
                <li><Link to="/records" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Recorduri</Link></li>
                <li><Link to="/black-sea" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Marea Neagră</Link></li>
                <li><Link to="/submission-guide" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Ghid Submisie</Link></li>
              </ul>
            </div>

            {/* Community & Support */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Comunitate</h3>
              <ul className="space-y-2">
                <li><Link to="/profile" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Profilul meu</Link></li>
                <li><Link to="/leaderboards" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Clasamente</Link></li>
                <li><Link to="/fishing-shops" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Magazine</Link></li>
              </ul>

              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Urmărește-ne</h4>
                <div className="flex space-x-2">
                  <a href="https://www.facebook.com/fishtrophy.ro" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-[#1877F2] rounded-md flex items-center justify-center text-white hover:bg-[#166FE5] transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="https://www.instagram.com/fishtrophy.ro" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-gradient-to-r from-[#E4405F] to-[#C13584] rounded-md flex items-center justify-center text-white hover:from-[#D7356A] hover:to-[#B02A73] transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  <a href="https://x.com/fishtrophy_ro" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-black rounded-md flex items-center justify-center text-white hover:bg-gray-800 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-200 mt-8 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
              <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs text-gray-500">
                <span>© 2025 Fish Trophy</span>
                <span className="hidden sm:inline">•</span>
                <span>Toate drepturile rezervate</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
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

      {/* Black Sea popup removed - now direct link */}

      {/* PWA Install Prompt */}
      {showPWAInstallPrompt && (
        <PWAInstallPrompt
          onInstall={handleInstallPWA}
          onDismiss={() => setShowPWAInstallPrompt(false)}
        />
      )}
      {/* Global toast renderer (bottom-right, default styling) */}
    </div>
  );
}

