import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, User, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/lib/auth';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check if user is admin
  const isAdmin = user?.email === 'cosmin.trica@outlook.com';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Modern, Centered */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <img src="/icon_free.png" alt="Fish Trophy" className="w-8 h-8" onError={(e) => {
                  console.error('Failed to load icon:', e);
                  e.currentTarget.style.display = 'none';
                }} />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Fish Trophy
              </span>
            </Link>

            {/* Navigation - Clean, Modern */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className={`text-sm font-medium transition-all duration-200 hover:text-blue-600 ${
                  isActive('/') ? 'text-blue-600' : 'text-slate-700'
                }`}
              >
                Acasă
              </Link>
              <Link
                to="/black-sea"
                className={`text-sm font-medium transition-all duration-200 hover:text-blue-600 ${
                  isActive('/black-sea') ? 'text-blue-600' : 'text-slate-700'
                }`}
              >
                Marea Neagră
              </Link>
              <Link
                to="/species"
                className={`text-sm font-medium transition-all duration-200 hover:text-blue-600 ${
                  isActive('/species') ? 'text-blue-600' : 'text-slate-700'
                }`}
              >
                Specii
              </Link>
              <Link
                to="/leaderboards"
                className={`text-sm font-medium transition-all duration-200 hover:text-blue-600 flex items-center space-x-2 ${
                  isActive('/leaderboards') ? 'text-blue-600' : 'text-slate-700'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Recorduri</span>
              </Link>
              <Link
                to="/submission-guide"
                className={`text-sm font-medium transition-all duration-200 hover:text-blue-600 ${
                  isActive('/submission-guide') ? 'text-blue-600' : 'text-slate-700'
                }`}
              >
                Ghid Submisie
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-all duration-200 hover:text-blue-600 ${
                    isActive('/admin') ? 'text-blue-600' : 'text-slate-700'
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* User Menu - Modern Design */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded-xl">
                    {user.email}
                  </span>
                  <Link
                    to="/profile"
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100"
                  >
                    Profilul meu
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center space-x-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 rounded-xl"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Ieșire</span>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <User className="h-4 w-4 mr-2" />
                  Conectare / Înregistrare
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer - Modern, Clean */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-white/20 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Logo & Description */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <img src="/icon_free.png" alt="Fish Trophy" className="w-8 h-8" onError={(e) => {
                    console.error('Failed to load footer icon:', e);
                    e.currentTarget.style.display = 'none';
                  }} />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                  Fish Trophy
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Platformă completă pentru pescarii din România
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Link-uri rapide</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/" className="text-slate-600 hover:text-blue-600 transition-colors duration-200 hover:translate-x-1 inline-block">
                    Acasă
                  </Link>
                </li>
                <li>
                  <Link to="/species" className="text-slate-600 hover:text-blue-600 transition-colors duration-200 hover:translate-x-1 inline-block">
                    Specii
                  </Link>
                </li>
                <li>
                  <Link to="/leaderboards" className="text-slate-600 hover:text-blue-600 transition-colors duration-200 hover:translate-x-1 inline-block">
                    Recorduri
                  </Link>
                </li>
                <li>
                  <Link to="/submission-guide" className="text-slate-600 hover:text-blue-600 transition-colors duration-200 hover:translate-x-1 inline-block">
                    Ghid Submisie
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Contact</h3>
              <p className="text-slate-600 mb-4">
                Pentru suport și sugestii
              </p>
              <p className="text-slate-600 bg-slate-100 px-4 py-2 rounded-xl inline-block">
                contact@fishtrophy.ro
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-slate-200 pt-8 mt-12 text-center">
            <p className="text-slate-500">&copy; 2025 Fish Trophy. Toate drepturile rezervate.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};
export default Layout;
