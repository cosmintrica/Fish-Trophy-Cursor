/**
 * ForumLayout - SINGURUL layout și header de navigare pentru toate paginile forum
 * 
 * IMPORTANT: Acesta este SINGURUL header de navigare folosit în întregul forum.
 * Toate paginile forum (ForumHome, CategoryPage, TopicPage, etc.) folosesc acest layout.
 * 
 * Redesign complet - Mobile-first, profesional, compact
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, User, Bell, Settings, LogOut, MessageSquare, Home, Users, FileText, Moon, Sun, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import UnifiedAuthModal from '@/components/UnifiedAuthModal';
import BackToTop from '@/components/BackToTop';
import ForumSearch from './ForumSearch';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { registerUnreadCountCallback } from '../../hooks/useRealtimeMessages';

export interface ForumUser {
  id: string;
  username: string;
  email?: string;
  photo_url?: string;
  isAdmin?: boolean;
}

/**
 * Helper function pentru a converti forumUser din useAuth în ForumUser pentru ForumLayout
 */
export function forumUserToLayoutUser(forumUser: any): ForumUser | null {
  if (!forumUser) return null;

  const photoUrl = forumUser.photo_url || forumUser.avatar_url || null;

  return {
    id: forumUser.id || forumUser.user_id,
    username: forumUser.username || 'Unknown',
    email: forumUser.email || '',
    photo_url: photoUrl,
    isAdmin: forumUser.isAdmin || false
  };
}

interface ForumLayoutProps {
  children: React.ReactNode;
  user?: ForumUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function ForumLayout({ children, user, onLogin, onLogout, showWelcomeBanner = false }: ForumLayoutProps & { showWelcomeBanner?: boolean }) {
  // useForumRealtime(); // Activează ascultarea evenimentelor realtime - Mutat în ForumRoutes
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Get loading state directly from auth context
  const { loading: authLoading, forumUser: authForumUser } = useAuth();

  // User is loaded when auth loading is complete
  const userLoaded = !authLoading;

  // Unread messages count for forum context
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Load unread messages count
  useEffect(() => {
    if (!authForumUser?.id) {
      setUnreadMessagesCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('private_messages')
          .select('id', { count: 'exact', head: false })
          .eq('recipient_id', authForumUser.id)
          .eq('is_read', false)
          .eq('is_deleted_by_recipient', false)
          .eq('is_archived_by_recipient', false)
          .eq('context', 'forum');

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
  }, [authForumUser?.id]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const generateUserColor = (name: string) => {
    const colors = [
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #10b981, #047857)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #ef4444, #dc2626)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #06b6d4, #0891b2)'
    ];
    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh + env(safe-area-inset-bottom, 0px))',
      height: 'auto',
      backgroundColor: theme.background,
      transition: 'all 0.3s ease',
      overflowY: 'auto',
      overflowX: 'hidden',
      width: '100%',
      position: 'relative',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      marginBottom: 0
    }}>
      {/* HEADER - Redesign complet, Mobile-first */}
      <header style={{
        backgroundColor: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
          width: '100%'
        }}>
          {/* Main Header Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            minHeight: isMobile ? '3rem' : '3.5rem'
          }}>
            {/* Logo + Text - COMPLET VIZIBIL PE MOBIL */}
            <Link
              to="/forum"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0.5rem' : '0.75rem',
                textDecoration: 'none',
                minWidth: 0,
                flex: '0 0 auto',
                flexShrink: 0
              }}
            >
              <img
                src="/icon_free.png"
                alt="Fish Trophy Forum"
                style={{
                  width: isMobile ? '2rem' : '2.5rem',
                  height: isMobile ? '2rem' : '2.5rem',
                  borderRadius: '0.5rem',
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                <div style={{
                  fontSize: isMobile ? 'clamp(0.875rem, 3vw, 1rem)' : '1.125rem',
                  fontWeight: '700',
                  color: theme.text,
                  whiteSpace: 'nowrap',
                  lineHeight: '1.2'
                }}>
                  Fish Trophy Forum
                </div>
                <div style={{
                  fontSize: isMobile ? 'clamp(0.5rem, 1.5vw, 0.625rem)' : '0.625rem',
                  color: theme.textSecondary,
                  lineHeight: '1.2'
                }}>
                  Comunitatea pescarilor
                </div>
              </div>
            </Link>

            {/* Right Side - Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.5rem' : '0.75rem',
              flexShrink: 0,
              marginLeft: 'auto',
              marginRight: isMobile ? '-5px' : '0'
            }}>
              {/* Search - Desktop only */}
              {!isMobile && (
                <div style={{ width: '200px', flexShrink: 0 }}>
                  <ForumSearch />
                </div>
              )}

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                style={{
                  padding: isMobile ? '0.375rem' : '0.5rem',
                  color: theme.textSecondary,
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                title={isDarkMode ? "Comută la modul luminos" : "Comută la modul întunecat"}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  e.currentTarget.style.color = theme.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.textSecondary;
                }}
              >
                {isDarkMode ? <Sun size={isMobile ? 18 : 20} /> : <Moon size={isMobile ? 18 : 20} />}
              </button>

              {/* User Section - Show only after user state is determined */}
              {!userLoaded ? (
                // Loading placeholder - same size as avatar to prevent layout shift
                <div style={{
                  width: isMobile ? '2rem' : '2.25rem',
                  height: isMobile ? '2rem' : '2.25rem',
                  borderRadius: '50%',
                  backgroundColor: theme.surfaceHover,
                  flexShrink: 0
                }} />
              ) : user ? (
                <div style={{ position: 'relative' }} ref={userMenuRef}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Admin Badge - Desktop only */}
                    {user.isAdmin && !isMobile && (
                      <Link
                        to="/forum/admin"
                        style={{ textDecoration: 'none' }}
                        onClick={() => setShowUserMenu(false)}
                      >
                        <div style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#b91c1c';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}>
                          🔧 ADMIN
                        </div>
                      </Link>
                    )}

                    {/* Messages - Desktop only */}
                    {!isMobile && userLoaded && user && (
                      <Link
                        to="/messages?context=forum"
                        style={{
                          position: 'relative',
                          padding: '0.5rem',
                          color: theme.textSecondary,
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.surfaceHover;
                          e.currentTarget.style.color = theme.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = theme.textSecondary;
                        }}
                      >
                        <MessageSquare size={18} />
                        {unreadMessagesCount > 0 && (
                          <span style={{
                            position: 'absolute',
                            top: '0.25rem',
                            right: '0.25rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            fontSize: '0.625rem',
                            fontWeight: '700',
                            borderRadius: '9999px',
                            minWidth: '1.125rem',
                            height: '1.125rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 0.25rem',
                            border: `2px solid ${theme.background}`,
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                          }}>
                            {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                          </span>
                        )}
                      </Link>
                    )}

                    {/* User Avatar - Clickable for menu */}
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      style={{
                        width: isMobile ? '2rem' : '2.25rem',
                        height: isMobile ? '2rem' : '2.25rem',
                        borderRadius: '50%',
                        background: user.photo_url
                          ? `url(${user.photo_url}) center/cover`
                          : (user.isAdmin ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : generateUserColor(user.username)),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: user.isAdmin ? '2px solid #fbbf24' : `2px solid ${theme.border}`,
                        transition: 'all 0.2s',
                        overflow: 'hidden',
                        flexShrink: 0,
                        padding: 0
                      }}
                    >
                      {!user.photo_url && user.username.charAt(0).toUpperCase()}
                    </button>

                    {/* Mobile Menu Button - În dreapta avatar-ului utilizatorului logat */}
                    {isMobile && (
                      <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        style={{
                          display: 'flex',
                          padding: '0.625rem',
                          color: theme.textSecondary,
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                          marginLeft: '0.125rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.surfaceHover;
                          e.currentTarget.style.color = theme.text;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = theme.textSecondary;
                        }}
                      >
                        {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
                      </button>
                    )}
                  </div>

                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div style={{
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
                    }}>
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
                          background: user.photo_url
                            ? `url(${user.photo_url}) center/cover`
                            : (user.isAdmin ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : generateUserColor(user.username)),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          {!user.photo_url && user.username.charAt(0).toUpperCase()}
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
                            {user.username}
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
                        <Link
                          to={`/forum/user/${user.username}`}
                          onClick={() => setShowUserMenu(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            color: theme.text,
                            textDecoration: 'none',
                            borderRadius: '0.375rem',
                            transition: 'all 0.2s',
                            fontSize: '0.875rem'
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
                        </Link>

                        {user.isAdmin && (
                          <Link
                            to="/forum/admin"
                            onClick={() => setShowUserMenu(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.75rem 1rem',
                              color: '#dc2626',
                              textDecoration: 'none',
                              borderRadius: '0.375rem',
                              transition: 'all 0.2s',
                              fontSize: '0.875rem',
                              fontWeight: '600'
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
                          </Link>
                        )}

                        <button
                          onClick={() => {
                            onLogout();
                            setShowUserMenu(false);
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
              ) : (
                <>
                  <button
                    onClick={handleLogin}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                      background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8, #4338ca)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #4f46e5)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <User size={isMobile ? 14 : 16} />
                    <span>Conectare</span>
                  </button>

                  {/* Mobile Menu Button - În dreapta butonului Conectare, aproape de el */}
                  {isMobile && (
                    <button
                      onClick={() => setShowMobileMenu(!showMobileMenu)}
                      style={{
                        display: 'flex',
                        padding: '0.625rem',
                        color: theme.textSecondary,
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                        marginLeft: '0.125rem'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.surfaceHover;
                        e.currentTarget.style.color = theme.text;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = theme.textSecondary;
                      }}
                    >
                      {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
                    </button>
                  )}
                </>
              )}

            </div>
          </div>

          {/* Mobile Menu Overlay */}
          {showMobileMenu && isMobile && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: theme.surface,
              borderBottom: `1px solid ${theme.border}`,
              padding: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 40,
              maxHeight: 'calc(100vh - 4rem)',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Mobile Search */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <ForumSearch />
                </div>

                {/* Navigation Links */}
                <Link
                  to="/forum"
                  onClick={() => setShowMobileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: theme.text,
                    textDecoration: 'none',
                    padding: '0.75rem',
                    fontWeight: '500',
                    borderRadius: '0.375rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Home size={18} />
                  <span>Acasă Forum</span>
                </Link>

                <Link
                  to="/forum/recent"
                  onClick={() => setShowMobileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: theme.text,
                    textDecoration: 'none',
                    padding: '0.75rem',
                    fontWeight: '500',
                    borderRadius: '0.375rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <MessageSquare size={18} />
                  <span>Postări Recente</span>
                </Link>

                <Link
                  to="/forum/members"
                  onClick={() => setShowMobileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: theme.text,
                    textDecoration: 'none',
                    padding: '0.75rem',
                    fontWeight: '500',
                    borderRadius: '0.375rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Users size={18} />
                  <span>Membri Activi</span>
                </Link>

                <Link
                  to="/forum/rules"
                  onClick={() => setShowMobileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: theme.text,
                    textDecoration: 'none',
                    padding: '0.75rem',
                    fontWeight: '500',
                    borderRadius: '0.375rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <FileText size={18} />
                  <span>Regulament</span>
                </Link>

                <Link
                  to="/"
                  onClick={() => setShowMobileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: theme.secondary,
                    textDecoration: 'none',
                    padding: '0.75rem',
                    fontWeight: '500',
                    borderRadius: '0.375rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>🎣</span>
                  <span>Fish Trophy</span>
                </Link>

                {user?.isAdmin && (
                  <Link
                    to="/forum/admin"
                    onClick={() => setShowMobileMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      color: '#dc2626',
                      textDecoration: 'none',
                      padding: '0.75rem',
                      fontWeight: '600',
                      borderRadius: '0.375rem',
                      transition: 'all 0.2s'
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
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Desktop Navigation Bar */}
          {!isMobile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: `1px solid ${theme.border}`,
              fontSize: '0.875rem'
            }}>
              <Link
                to="/forum"
                style={{
                  color: location.pathname === '/forum' ? theme.primary : theme.text,
                  textDecoration: 'none',
                  fontWeight: location.pathname === '/forum' ? '600' : '500',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                  padding: '0.25rem 0',
                  borderBottom: location.pathname === '/forum' ? `2px solid ${theme.primary}` : '2px solid transparent'
                }}
              >
                Acasă
              </Link>
              <Link
                to="/forum/recent"
                style={{
                  color: location.pathname === '/forum/recent' ? theme.primary : theme.text,
                  textDecoration: 'none',
                  fontWeight: location.pathname === '/forum/recent' ? '600' : '500',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                  padding: '0.25rem 0',
                  borderBottom: location.pathname === '/forum/recent' ? `2px solid ${theme.primary}` : '2px solid transparent'
                }}
              >
                Postări Recente
              </Link>
              <Link
                to="/forum/members"
                style={{
                  color: location.pathname === '/forum/members' ? theme.primary : theme.text,
                  textDecoration: 'none',
                  fontWeight: location.pathname === '/forum/members' ? '600' : '500',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                  padding: '0.25rem 0',
                  borderBottom: location.pathname === '/forum/members' ? `2px solid ${theme.primary}` : '2px solid transparent'
                }}
              >
                Membri Activi
              </Link>
              <Link
                to="/forum/rules"
                style={{
                  color: location.pathname === '/forum/rules' ? theme.primary : theme.text,
                  textDecoration: 'none',
                  fontWeight: location.pathname === '/forum/rules' ? '600' : '500',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                  padding: '0.25rem 0',
                  borderBottom: location.pathname === '/forum/rules' ? `2px solid ${theme.primary}` : '2px solid transparent'
                }}
              >
                Regulament
              </Link>
              <Link
                to="/"
                style={{
                  color: theme.secondary,
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                  padding: '0.25rem 0'
                }}
              >
                Fish Trophy
              </Link>
            </div>
          )}
        </div>

        {/* Welcome Banner - doar pe homepage - Aliniat cu header */}
        {showWelcomeBanner && (
          <div style={{
            background: isDarkMode
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)'
              : 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)',
            borderTop: `1px solid ${theme.border}`,
            padding: 0 // Remove padding from outer container
          }}>
            <div style={{
              maxWidth: '1200px',
              margin: '0 auto',
              textAlign: 'left',
              padding: isMobile ? '1.5rem 0.75rem' : '2rem 1rem' // Same horizontal padding as header
            }}>
              <h1 style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: '700',
                color: theme.text,
                marginBottom: '0.5rem'
              }}>
                Bine ai venit pe Forumul Fish Trophy
              </h1>
              <p style={{
                fontSize: isMobile ? '0.875rem' : '1.125rem',
                color: theme.textSecondary,
                maxWidth: '800px'
              }}>
                Împărtășește experiențe, găsește sfaturi și conectează-te cu alți pescari pasionați din România.
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{
        minHeight: 'calc(100vh - 200px)',
        backgroundColor: theme.background
      }}>
        {children}
      </main>

      {/* Footer - Simplificat */}
      <footer style={{
        borderTop: `1px solid ${theme.border}`,
        marginTop: '4rem',
        padding: isMobile ? '1rem 0.75rem' : '1.5rem 0.75rem',
        paddingBottom: `max(${isMobile ? '1rem' : '1.5rem'}, calc(${isMobile ? '1rem' : '1.5rem'} + env(safe-area-inset-bottom, 0px)))`,
        color: theme.text,
        width: '100%',
        overflowX: 'hidden',
        backgroundColor: theme.background,
        position: 'relative',
        zIndex: 1,
        marginBottom: 0
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignItems: 'center',
            textAlign: 'center',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            color: theme.textSecondary
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
              <span>© 2025 Fish Trophy</span>
              <span style={{ color: theme.border }}>•</span>
              <span>Toate drepturile rezervate</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
              <Link to="/privacy" style={{ color: theme.textSecondary, textDecoration: 'none' }}>Politica de confidențialitate</Link>
              <span style={{ color: theme.border }}>•</span>
              <Link to="/terms" style={{ color: theme.textSecondary, textDecoration: 'none' }}>Termeni și condiții</Link>
              <span style={{ color: theme.border }}>•</span>
              <a href="mailto:contact@fishtrophy.ro" style={{ color: theme.textSecondary, textDecoration: 'none' }}>Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <UnifiedAuthModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        initialMode="login"
        redirectAfterLogin={null} // Rămâne pe pagina curentă după login
        theme={theme}
      />

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
