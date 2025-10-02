import { useState } from 'react';
import { Search, Menu, User, Bell, LogOut, Settings, X, MessageSquare } from 'lucide-react';

interface ForumHeaderProps {
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
    rank: string;
  } | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function ForumHeader({ user, onLogin, onLogout }: ForumHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results
      console.log('Searching for:', searchQuery);
    }
  };

  // Generate color from user name for dynamic border
  const generateUserColor = (name: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-orange-500 to-orange-600',
      'from-cyan-500 to-cyan-600'
    ];
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-b border-blue-200/50 shadow-lg" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Title - identic cu Fish Trophy */}
          <a href="/forum" className="flex items-center space-x-3 group" aria-label="Forum Acasă">
            <img
              src="/icon_free.png"
              alt="Fish Trophy Forum"
              className="w-12 h-12 rounded-xl group-hover:scale-110 transition-transform duration-300"
            />
            <div className="flex items-center space-x-2">
              <span className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:via-indigo-700 group-hover:to-purple-700 transition-all duration-300">
                Fish Trophy
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full">
                <MessageSquare className="w-3 h-3 mr-1" />
                FORUM
              </span>
            </div>
          </a>

          {/* Desktop Navigation - stil Fish Trophy */}
          <nav className="hidden lg:flex items-center space-x-8" role="navigation" aria-label="Navigația forum">
            <a
              href="/forum"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Forum Acasă
            </a>
            <a
              href="/forum/recent"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Postări Recente
            </a>
            <a
              href="/forum/members"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Membri
            </a>
            <a
              href="https://fishtrophy.ro"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              ← Înapoi la Fish Trophy
            </a>
          </nav>

          {/* User Section - identic cu Fish Trophy */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="hidden sm:flex items-center space-x-3">
                  <div className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${generateUserColor(user.username)} text-white text-sm font-medium shadow-sm`}>
                    {user.username}
                  </div>
                </div>
                <a
                  href={`/forum/user/${user.id}`}
                  className="hidden sm:inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profilul meu
                </a>
              </>
            ) : (
              <button
                onClick={onLogin}
                className="hidden sm:inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <User className="w-4 h-4 mr-2" />
                Autentificare
              </button>
            )}

            {/* Mobile Menu Button - identic cu Fish Trophy */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`lg:hidden inline-flex items-center justify-center p-3 rounded-xl text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 active:scale-95 ${
                showMobileMenu ? 'rotate-90' : 'rotate-0'
              }`}
              aria-label={showMobileMenu ? 'Închide meniul' : 'Deschide meniul'}
            >
              {showMobileMenu ? (
                <X className="w-6 h-6 transition-transform duration-300" />
              ) : (
                <Menu className="w-6 h-6 transition-transform duration-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay - identic cu Fish Trophy */}
      <div className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ease-out ${
        showMobileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ease-out ${
            showMobileMenu ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setShowMobileMenu(false)}
        />

        {/* Menu Card */}
        <div
          className={`absolute right-0 top-0 h-full bg-white rounded-l-2xl shadow-2xl flex flex-col ${
            showMobileMenu ? 'translate-x-0' : 'translate-x-full'
          } transition-transform duration-300 ease-out`}
          style={{
            width: '300px',
            maxWidth: 'none'
          }}
        >
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <img
                src="/icon_free.png"
                alt="Fish Trophy"
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-lg font-semibold text-gray-900">Forum Meniu</span>
            </div>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Închide meniul"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <a
              href="/forum"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium text-base">Forum Acasă</span>
            </a>

            <a
              href="/forum/recent"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              <Bell className="w-5 h-5" />
              <span className="font-medium text-base">Postări Recente</span>
            </a>

            <a
              href="/forum/members"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              <User className="w-5 h-5" />
              <span className="font-medium text-base">Membri</span>
            </a>

            <a
              href="https://fishtrophy.ro"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              <span className="w-5 h-5">🏠</span>
              <span className="font-medium text-base">Fish Trophy</span>
            </a>
          </nav>

          {/* User Section in Mobile Menu */}
          {user ? (
            <div className="p-4 border-t border-gray-100 space-y-1">
              <div className="flex items-center space-x-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500">
                    Rang: <span className={`user-rank rank-${user.rank}`}>{user.rank}</span>
                  </p>
                </div>
              </div>

              <a
                href={`/forum/user/${user.id}`}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <User className="w-5 h-5" />
                <span className="font-medium text-base">Profilul meu</span>
              </a>

              <button
                onClick={() => {
                  onLogout();
                  setShowMobileMenu(false);
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-red-600 transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-base">Ieșire</span>
              </button>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => {
                  onLogin();
                  setShowMobileMenu(false);
                }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 transition-colors w-full text-left"
              >
                <User className="w-5 h-5" />
                <span className="font-medium text-base">Autentificare</span>
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto p-4 border-t border-gray-100">
            <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
              <span>Făcut cu</span>
              <span className="text-red-500">❤️</span>
              <span>în România</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
