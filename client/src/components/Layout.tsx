import { useState, useEffect, ReactNode, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Fish, Menu, X, Home, User, Trophy, FileText, Mail, Sun, Moon, Settings, LogOut, MessageSquare, Anchor } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/lib/supabase';
import { registerUnreadCountCallback } from '@/hooks/useRealtimeMessages';
import { usePrefetch } from '@/hooks/usePrefetch';
import AuthModal from './AuthModal';
import PWAInstallPrompt from './PWAInstallPrompt';
import BackToTop from './BackToTop';
import { useTheme } from '@/contexts/ThemeContext';


export default function Layout({ children }: { children: ReactNode }) {
  const { theme, toggleDarkMode, isDarkMode } = useTheme();
  const { user, logout, loading } = useAuth();
  const { trackUserAction } = useAnalytics();
  const { prefetchProfile, prefetchRecords, prefetchSpecies } = usePrefetch();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [isExtremelyNarrow, setIsExtremelyNarrow] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  // PWA Install Prompt - folosim hook-ul
  const location = useLocation();

  // Hide footer on privacy and cookies pages to avoid duplication
  const hideFooter = location.pathname === '/privacy' || location.pathname === '/cookies';

  // Check if user is admin using the admin hook
  const { isAdmin: userIsAdmin } = useAdmin();
  const isAdmin = userIsAdmin;

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

  // Get user display name - prioritize display_name from profile, never show email
  const getUserDisplayName = () => {
    if (!user) return '';
    // Always prioritize display_name from profile database
    if (userDisplayName) {
      return userDisplayName;
    }
    // Fallback to metadata
    return user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      userUsername ||
      'Utilizator';
  };

  // Load username and display_name from profile
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            if (data.username) {
              setUserUsername(data.username);
            }
            // Always set display_name from profile
            if (data.display_name) {
              setUserDisplayName(data.display_name);
              // Update user metadata with display_name if it exists and is not already set
              if (!user.user_metadata?.display_name) {
                supabase.auth.updateUser({
                  data: { display_name: data.display_name }
                }).catch(() => {
                  // Ignore errors
                });
              }
            }
          }
        });
    } else {
      setUserUsername(null);
      setUserDisplayName(null);
      setUnreadMessagesCount(0);
    }
  }, [user?.id]);

  // Load unread messages count
  useEffect(() => {
    if (!user?.id) {
      setUnreadMessagesCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('private_messages')
          .select('id', { count: 'exact', head: false })
          .eq('recipient_id', user.id)
          .eq('is_read', false)
          .eq('is_deleted_by_recipient', false)
          .eq('is_archived_by_recipient', false)
          .eq('context', 'site');

        if (error) {
          return;
        }

        setUnreadMessagesCount(data?.length || 0);
      } catch (error) {
        // Silent fail
      }
    };

    loadUnreadCount();

    // Register for instant updates via Realtime
    const unregister = registerUnreadCountCallback(loadUnreadCount);

    return () => {
      unregister();
    };
  }, [user?.id]);

  // Detect scrollbar width and extremely narrow viewport
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      setIsExtremelyNarrow(width < 250);
      
      // Calculate scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      setScrollbarWidth(scrollbarWidth);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    // Re-enable body scroll
    document.body.classList.remove('mobile-menu-open');
  };

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Check if click is outside the menu
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        // Small delay to allow button clicks to process first
        setTimeout(() => {
          setShowUserMenu(false);
        }, 100);
      }
    };

    // Use click instead of mousedown to allow button clicks to process
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [showUserMenu]);

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

  // Nu mai blocăm render-ul pentru loading - afișăm direct conținutul
  // React Query cache-ul asigură datele instant, iar loading-ul se face în background

  return (
    <div className="min-h-screen min-h-[100vh] min-h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 bg-fixed transition-colors duration-200">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-blue-200/50 dark:border-slate-700/50 shadow-lg transition-colors duration-200" role="banner">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Title */}
            {!isExtremelyNarrow && (
              <Link
                to="/"
                className="flex items-center space-x-3 group"
                aria-label="Acasă"
                onClick={(e) => {
                  // If already on homepage, refresh the page
                  if (location.pathname === '/') {
                    e.preventDefault();
                    window.location.reload();
                  }
                }}
              >
                <img
                  src="/icon_free.png"
                  alt="Fish Trophy"
                  className="w-12 h-12 rounded-xl group-hover:scale-110 transition-transform duration-300"
                />
                <span className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:via-indigo-700 group-hover:to-purple-700 transition-all duration-300">
                  Fish Trophy
                </span>
              </Link>
            )}

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8" role="navigation" aria-label="Navigația principală">
              <Link
                to="/"
                onClick={(e) => {
                  // If already on homepage, refresh the page
                  if (location.pathname === '/') {
                    e.preventDefault();
                    window.location.reload();
                  }
                }}
                className={`text-sm font-medium transition-colors ${location.pathname === '/'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                aria-current={location.pathname === '/' ? 'page' : undefined}
              >
                Acasă
              </Link>
              <Link
                to="/species"
                className="text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onMouseEnter={() => prefetchSpecies()}
              >
                Specii
              </Link>
              <Link
                to="/records"
                className="text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onMouseEnter={() => prefetchRecords()}
              >
                Recorduri
              </Link>
              <Link
                to="/submission-guide"
                className="text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Ghid Submisie
              </Link>
              <Link
                to="/forum"
                className="text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Forum
              </Link>
            </nav>

            {/* User Section */}
            <div className="flex items-center space-x-4" style={{ marginLeft: isExtremelyNarrow ? 'auto' : undefined }}>
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleDarkMode();
                }}
                className="p-2 transition-transform hover:scale-110 active:scale-95 bg-transparent border-none"
                style={{ backgroundColor: 'transparent', border: 'none' }}
                aria-label={isDarkMode ? "Activează modul lumină" : "Activează modul întunecat"}
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
              </button>

              {user ? (
                <>
                  {/* Messages Button - Visible on all devices */}
                  <Link
                    to="/messages?context=site"
                    className="relative p-2 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-all duration-200"
                    title="Mesaje private"
                  >
                    <MessageSquare className="w-5 h-5" />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 border-2 border-white dark:border-slate-900 shadow-lg">
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                      </span>
                    )}
                  </Link>

                  <div className="hidden sm:flex items-center relative" ref={userMenuRef}>
                    {/* User Avatar - Clickable for menu */}
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold border-2 transition-all ${
                        isAdmin ? 'border-yellow-400' : 'border-gray-300 dark:border-slate-600'
                      } ${generateUserColor(getUserDisplayName()).replace('from-', 'bg-gradient-to-r from-').replace('to-', ' to-')}`}
                      style={{
                        backgroundImage: user.user_metadata?.avatar_url
                          ? `url(${user.user_metadata.avatar_url})`
                          : undefined,
                        backgroundSize: user.user_metadata?.avatar_url ? 'cover' : undefined,
                        backgroundPosition: user.user_metadata?.avatar_url ? 'center' : undefined
                      }}
                      onError={(e) => {
                        // Fallback dacă avatar-ul nu se încarcă (ex: 429 rate limit)
                        const target = e.target as HTMLElement;
                        target.style.backgroundImage = 'none';
                      }}
                    >
                      {!user.user_metadata?.avatar_url && getUserDisplayName().charAt(0).toUpperCase()}
                    </button>

                    {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        backgroundColor: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 100,
                        minWidth: '200px',
                        overflow: 'hidden'
                      }}
                    >
                      {/* User Info */}
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: `1px solid ${theme.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '50%',
                          background: user.user_metadata?.avatar_url
                            ? `url(${user.user_metadata.avatar_url}) center/cover`
                            : (isAdmin ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : generateUserColor(getUserDisplayName())),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          {!user.user_metadata?.avatar_url && getUserDisplayName().charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: theme.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {getUserDisplayName()}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: theme.textSecondary
                          }}>
                            {user.email || 'Utilizator'}
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div style={{ padding: '0.25rem' }}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowUserMenu(false);
                            navigate(userUsername ? `/profile/${userUsername}` : '/profile');
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            color: theme.text,
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.875rem',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.surfaceHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <User size={18} />
                          <span>Profilul meu</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowUserMenu(false);
                            navigate('/profile');
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            color: theme.text,
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.875rem',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.surfaceHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Settings size={18} />
                          <span>Setări</span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowUserMenu(false);
                              navigate('/admin');
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.75rem 1rem',
                              color: '#dc2626',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.surfaceHover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Settings size={18} />
                            <span>Admin Panel</span>
                          </button>
                        )}

                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowUserMenu(false);
                            trackUserAction('logout', { method: 'email' });
                            const result = await logout();
                            if (result?.error) {
                              console.error('Logout error:', result.error);
                            }
                            window.location.replace('/');
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            color: '#ef4444',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.875rem',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.surfaceHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <LogOut size={18} />
                          <span>Deconectare</span>
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                </>
              ) : (
                <>
                  {/* Desktop: Autentificare button */}
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="hidden sm:inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Autentificare
                  </button>
                  
                  {/* Mobile: Conectare button */}
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="lg:hidden inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg"
                    style={{
                      marginRight: `${Math.max(0, scrollbarWidth)}px`
                    }}
                  >
                    <User size={16} />
                    <span>Conectare</span>
                  </button>
                </>
              )}

              {/* Mobile: Avatar with dropdown (before hamburger) */}
              {user && (
                <div className="lg:hidden flex items-center space-x-2">
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-blue-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-slate-500 transition-colors"
                    >
                      {user.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt={getUserDisplayName()}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = document.createElement('div');
                              fallback.className = "w-full h-full bg-blue-600 rounded-full flex items-center justify-center";
                              fallback.innerHTML = `<span class="text-white font-semibold text-sm">${getUserDisplayName().charAt(0).toUpperCase()}</span>`;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">{getUserDisplayName().charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </button>
                    {/* User Dropdown Menu - Mobile - Identic cu forum */}
                    {showUserMenu && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '0.5rem',
                          backgroundColor: theme.surface,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          zIndex: 100,
                          minWidth: '200px',
                          overflow: 'hidden'
                        }}
                      >
                        {/* User Info */}
                        <div style={{
                          padding: '0.75rem 1rem',
                          borderBottom: `1px solid ${theme.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}>
                          <div style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '50%',
                            background: user.user_metadata?.avatar_url
                              ? `url(${user.user_metadata.avatar_url}) center/cover`
                              : (isAdmin ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : generateUserColor(getUserDisplayName())),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: '600',
                            flexShrink: 0
                          }}>
                            {!user.user_metadata?.avatar_url && getUserDisplayName().charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: theme.text,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {getUserDisplayName()}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: theme.textSecondary
                            }}>
                              {user.email || 'Utilizator'}
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div style={{ padding: '0.25rem' }}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowUserMenu(false);
                              navigate(userUsername ? `/profile/${userUsername}` : '/profile');
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.75rem 1rem',
                              color: theme.text,
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              fontSize: '0.875rem',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.surfaceHover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <User size={18} />
                            <span>Profilul meu</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowUserMenu(false);
                              navigate('/profile');
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.75rem 1rem',
                              color: theme.text,
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              fontSize: '0.875rem',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.surfaceHover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Settings size={18} />
                            <span>Setări</span>
                          </button>

                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowUserMenu(false);
                                navigate('/admin');
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                color: '#dc2626',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.surfaceHover;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <Settings size={18} />
                              <span>Admin Panel</span>
                            </button>
                          )}

                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowUserMenu(false);
                              trackUserAction('logout', { method: 'email' });
                              const result = await logout();
                              if (result?.error) {
                                console.error('Logout error:', result.error);
                              }
                              window.location.replace('/');
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.75rem 1rem',
                              color: '#ef4444',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              fontSize: '0.875rem',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.surfaceHover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <LogOut size={18} />
                            <span>Deconectare</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={isMobileMenuOpen ? closeMobileMenu : openMobileMenu}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-slate-200 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200"
                style={{
                  marginRight: `${Math.max(0, scrollbarWidth)}px`,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                aria-label={isMobileMenuOpen ? 'Închide meniul' : 'Deschide meniul'}
              >
                {isMobileMenuOpen ? (
                  <X size={20} />
                ) : (
                  <Menu size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay - Sidebar */}
      <div className={`lg:hidden fixed inset-0 z-[60] transition-all duration-300 ease-out ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 dark:bg-black/50 transition-opacity duration-300 ease-out ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
          onClick={closeMobileMenu}
        />

        {/* Menu Card */}
        <div
          className={`mobile-menu-card absolute right-0 top-0 h-full bg-white dark:bg-slate-900 rounded-l-2xl shadow-2xl flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          style={{
            width: '300px',
            maxWidth: 'none'
          }}
        >
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <img
                src="/icon_free.png"
                alt="Fish Trophy"
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Meniu</span>
            </div>
            <button
              onClick={closeMobileMenu}
              className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Închide meniul"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Items - Scrollable */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <Link
              to="/"
              className={`flex items-center space-x-3 px-4 py-3 transition-colors ${location.pathname === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              onClick={closeMobileMenu}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium text-base">Acasă</span>
            </Link>

            <Link
              to="/species"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={closeMobileMenu}
            >
              <Anchor className="w-5 h-5" />
              <span className="font-medium text-base">Specii</span>
            </Link>

            <Link
              to="/records"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={closeMobileMenu}
            >
              <Trophy className="w-5 h-5" />
              <span className="font-medium text-base">Recorduri</span>
            </Link>

            <Link
              to="/submission-guide"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={closeMobileMenu}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium text-base">Ghid Submisie</span>
            </Link>

            <Link
              to="/forum"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={closeMobileMenu}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium text-base">Forum</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={closeMobileMenu}
              >
                <User className="w-5 h-5" />
                <span className="font-medium text-base">Admin</span>
              </Link>
            )}

            {/* Theme Toggle in Mobile Menu */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleDarkMode();
              }}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full text-left bg-transparent"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
              <span className="font-medium text-base">{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </nav>

          {/* Footer - Fixed at bottom */}
          <div className="mt-auto p-4 border-t border-gray-100 dark:border-slate-800">
            {/* Social Links */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 text-center">Urmărește-ne</h4>
              <div className="flex justify-center space-x-2">
                <a href="https://www.facebook.com/fishtrophy.ro" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-[#1877F2] rounded-md flex items-center justify-center text-white hover:bg-[#166FE5] transition-colors" onClick={closeMobileMenu}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a href="https://www.instagram.com/fishtrophy.ro" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-gradient-to-r from-[#E4405F] to-[#C13584] rounded-md flex items-center justify-center text-white hover:from-[#D7356A] hover:to-[#B02A73] transition-colors" onClick={closeMobileMenu}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a href="https://x.com/fishtrophy_ro" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-black rounded-md flex items-center justify-center text-white hover:bg-gray-800 transition-colors" onClick={closeMobileMenu}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-slate-400">Făcut cu ❤️ în România</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-16">
        {children}
      </main>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt
        onInstall={() => { }}
        onDismiss={() => { }}
      />

      {/* Footer - Modern Design */}
      {!hideFooter && (
        <footer className="bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 border-t border-gray-200 dark:border-slate-800 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
              {/* Logo & Mission */}
              <div className="lg:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <img src="/icon_free.png" alt="Fish Trophy" className="w-12 h-12 rounded-xl shadow-lg" />
                  <div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Fish Trophy</span>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">Platforma pescarilor din România</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-slate-400 max-w-lg leading-relaxed mb-6 text-sm">
                  Urmărește recordurile, concurează cu alții pescari pasionați și contribuie la protejarea naturii prin pescuit responsabil.
                </p>
                <div className="flex gap-3">
                  <a
                    href="mailto:contact@fishtrophy.ro"
                    className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all duration-200 text-sm font-medium shadow-sm"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Contact
                  </a>
                </div>
              </div>

              {/* Navigation */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">Navigare</h3>
                <ul className="space-y-3">
                  <li>
                    <Link to="/" className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center group">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      Acasă
                    </Link>
                  </li>
                  <li>
                    <Link to="/species" className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center group">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      Specii
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/records"
                      className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center group"
                      onMouseEnter={() => prefetchRecords()}
                    >
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      Recorduri
                    </Link>
                  </li>
                  <li>
                    <Link to="/submission-guide" className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center group">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      Ghid Submisie
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Community & Social */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">Comunitate</h3>
                <ul className="space-y-3 mb-6">
                  <li>
                    <Link to="/profile" className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center group">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      Profilul meu
                    </Link>
                  </li>
                  <li>
                    <Link to="/fishing-shops" className="text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center group">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      Magazine
                    </Link>
                  </li>
                </ul>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">Urmărește-ne</h4>
                  <div className="flex space-x-3">
                    <a
                      href="https://www.facebook.com/fishtrophy.ro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center text-white hover:bg-[#166FE5] hover:scale-110 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                    <a
                      href="https://www.instagram.com/fishtrophy.ro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-gradient-to-r from-[#E4405F] to-[#C13584] rounded-lg flex items-center justify-center text-white hover:from-[#D7356A] hover:to-[#B02A73] hover:scale-110 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                    <a
                      href="https://x.com/fishtrophy_ro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white hover:bg-gray-800 hover:scale-110 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="border-t border-gray-200 dark:border-slate-800 mt-10 pt-6">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
                <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500 dark:text-slate-400">
                  <span className="font-medium">© 2025 Fish Trophy</span>
                  <span className="hidden sm:inline text-gray-300 dark:text-slate-600">•</span>
                  <span>Toate drepturile rezervate</span>
                </div>
                <div className="flex items-center space-x-1.5 text-sm text-gray-600 dark:text-slate-400">
                  <span>Făcut cu</span>
                  <span className="text-red-500 text-lg animate-pulse">❤️</span>
                  <span>în România</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Back to Top Button */}
      <BackToTop />

      {/* Global toast renderer (bottom-right, default styling) */}
    </div>
  );
}

