import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LogOut, User, Trophy } from 'lucide-react';
import AuthModal from './AuthModal';

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
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <img src="/icon_free.png" alt="Fish Trophy" className="h-10 w-10"/>
              <span className="text-2xl font-bold text-blue-800">Fish Trophy</span>
            </Link>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isActive('/') ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                Acasă
              </Link>
              <Link
                to="/black-sea"
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isActive('/black-sea') ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                Marea Neagră
              </Link>
              <Link
                to="/species"
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isActive('/species') ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                Specii
              </Link>
              <Link
                to="/leaderboards"
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isActive('/leaderboards') ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                <Trophy className="h-4 w-4 inline mr-1" />
                Recorduri
              </Link>
              <Link
                to="/submission-guide"
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isActive('/submission-guide') ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                Ghid Submisie
              </Link>
              {user && (
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    isActive('/admin') ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {user.email}
                  </span>
                  <Link
                    to="/profile"
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
                  >
                    Profilul meu
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center space-x-2 border-gray-300 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Ieșire</span>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
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
      
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="/icon_free.png" alt="Fish Trophy" className="h-8 w-8"/>
                <span className="text-xl font-bold text-blue-800">Fish Trophy</span>
              </div>
              <p className="text-gray-600">
                Platformă completă pentru pescarii din România
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Link-uri rapide</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Acasă
                  </Link>
                </li>
                <li>
                  <Link to="/species" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Specii
                  </Link>
                </li>
                <li>
                  <Link to="/leaderboards" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Recorduri
                  </Link>
                </li>
                <li>
                  <Link to="/submission-guide" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Ghid Submisie
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
              <p className="text-gray-600">
                Pentru suport și sugestii
              </p>
              <p className="text-gray-600 mt-2">
                contact@fishtrophy.ro
              </p>
            </div>
          </div>
          <div className="border-t pt-8 mt-8 text-center text-gray-500">
            <p>&copy; 2024 Fish Trophy. Toate drepturile rezervate.</p>
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
