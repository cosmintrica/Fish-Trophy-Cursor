import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Fish, Menu, X, Home, MapPin, User, Trophy, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth-supabase';
import AuthModal from './AuthModal';
// import PWAInstallPrompt from './PWAInstallPrompt'; // Temporarily disabled

// PWA Install Prompt Event interface - temporarily disabled
/*
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
*/

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // PWA Install Prompt temporarily disabled
  // const [showPWAInstallPrompt, setShowPWAInstallPrompt] = useState(false);
  // const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const location = useLocation();

  // Check if user is admin - use environment variable for security
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;
  const [showBlackSeaPopup, setShowBlackSeaPopup] = useState(false);

  // PWA Install Prompt Logic temporarily disabled
  /*
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
  */

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

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
              <span className="font-medium">Acasă</span>
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
                Adaugă pe ecranul principal
              </button>
            </div>
          )} */}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* PWA Install Prompt - temporarily disabled */}
      {/* <PWAInstallPrompt /> */}

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img src="/icon_free.png" alt="Fish Trophy" className="w-12 h-12 rounded-2xl" />
                <span className="text-2xl md:text-3xl font-bold">Fish Trophy</span>
              </div>
              <p className="text-gray-300 max-w-md">
                Descoperă cele mai bune locații de pescuit din România, urmărește recordurile și concurează cu alții pescari pasionați.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Link-uri Rapide</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                    Acasă
                  </Link>
                </li>
                <li>
                  <Link to="/species" className="text-gray-300 hover:text-white transition-colors">
                    Specii
                  </Link>
                </li>
                <li>
                  <Link to="/records" className="text-gray-300 hover:text-white transition-colors">
                    Recorduri
                  </Link>
                </li>
                <li>
                  <Link to="/black-sea" className="text-gray-300 hover:text-white transition-colors">
                    Marea Neagră
                  </Link>
                </li>
                <li>
                  <Link to="/submission-guide" className="text-gray-300 hover:text-white transition-colors">
                    Ghid Submisie
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="text-gray-300 hover:text-white transition-colors">
                    Profilul meu
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="text-gray-300">
                  <a href="mailto:contact@fishtrophy.ro" className="hover:text-white transition-colors">
                    Email: contact@fishtrophy.ro
                  </a>
                </li>
                <li className="text-gray-300">
                  <a href="https://fishtrophy.ro" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Website: fishtrophy.ro
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 Fish Trophy. Toate drepturile rezervate.
            </p>
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
    </div>
  );
}

