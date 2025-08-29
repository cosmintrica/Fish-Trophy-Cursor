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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/icon_free.png" 
                alt="Fish Trophy" 
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-primary">
                Fish Trophy
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Acasă
              </Link>
              <Link
                to="/black-sea"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/black-sea') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Marea Neagră
              </Link>
              <Link
                to="/species"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/species') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Specii
              </Link>
              <Link
                to="/leaderboards"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/leaderboards') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Trophy className="h-4 w-4 inline mr-1" />
                Recorduri
              </Link>
              {user && (
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive('/admin') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground">
                    {user.email}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Ieșire</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Autentificare
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Fish Trophy</h3>
              <p className="text-muted-foreground">
                Platformă completă pentru pescarii din România
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Link-uri rapide</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-muted-foreground hover:text-primary">
                    Acasă
                  </Link>
                </li>
                <li>
                  <Link to="/species" className="text-muted-foreground hover:text-primary">
                    Specii
                  </Link>
                </li>
                <li>
                  <Link to="/leaderboards" className="text-muted-foreground hover:text-primary">
                    Recorduri
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-muted-foreground">
                Pentru suport și sugestii
              </p>
            </div>
          </div>
          <div className="border-t pt-8 mt-8 text-center text-muted-foreground">
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
