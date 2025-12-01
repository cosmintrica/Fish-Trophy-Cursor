import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Search, User, Bell, Settings, LogOut, MessageSquare } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import SimpleLoginModal from './SimpleLoginModal';
import BackToTop from '@/components/BackToTop';
import ForumSearch from './ForumSearch';
import { useToast } from '../contexts/ToastContext';

export interface ForumUser {
  id: string;
  username: string;
  email?: string; // Optional pentru compatibilitate cu forum/types/forum.ts
  photo_url?: string; // Avatar din profiles
  isAdmin?: boolean;
}

/**
 * Helper function pentru a converti forumUser din useAuth în ForumUser pentru ForumLayout
 * Asigură consistența și evită duplicarea codului
 * 
 * IMPORTANT: Această funcție este folosită de TOATE paginile forum pentru a asigura
 * că header-ul este identic peste tot (inclusiv avatar-ul).
 */
export function forumUserToLayoutUser(forumUser: any): ForumUser | null {
  if (!forumUser) return null;
  
  // Folosește photo_url din profiles (avatar_url din forumUser sau user_metadata)
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

/**
 * ForumLayout - SINGURUL layout și header de navigare pentru toate paginile forum
 * 
 * IMPORTANT: Acesta este SINGURUL header de navigare folosit în întregul forum.
 * Toate paginile forum (ForumHome, CategoryPage, TopicPage, etc.) folosesc acest layout.
 * 
 * NU crea alte header-uri de navigare! Orice modificare la header trebuie făcută AICI.
 * 
 * Header-ul include:
 * - Logo și titlu forum
 * - Navigare principală
 * - Search bar
 * - User menu / Login
 * - Dark mode toggle
 */
export default function ForumLayout({ children, user, onLogin, onLogout, showWelcomeBanner = false }: ForumLayoutProps & { showWelcomeBanner?: boolean }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  // Toast is now provided globally via ToastProvider

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
    <div style={{ minHeight: '100vh', backgroundColor: theme.background, transition: 'all 0.3s ease', overflowY: 'auto' }}>
      {/* SINGURUL HEADER DE NAVIGARE PENTRU TOATE PAGINILE FORUM */}
      <header style={{ backgroundColor: theme.surface, borderBottom: `1px solid ${theme.border}`, position: 'sticky', top: 0, zIndex: 40 }}>
        {/* Top Navigation */}
        <nav style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' }}>
            {/* Logo */}
            <Link to="/forum" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
              <img
                src="/icon_free.png"
                alt="Fish Trophy Forum"
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem'
                }}
              />
              <div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: theme.text
                }}>
                  Fish Trophy Forum
                </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                  Comunitatea pescarilor din România
                </div>
              </div>
            </Link>

            {/* Search Bar - Hidden on mobile */}
            <div className="hidden md:block" style={{ flex: 1, maxWidth: '400px', margin: '0 2rem' }}>
              {/* Search will be in navigation bar below */}
            </div>

            {/* User Menu / Login */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                style={{
                  padding: '0.5rem',
                  color: theme.textSecondary,
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '1.25rem'
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
                {isDarkMode ? '🐟' : '🌙'}
              </button>

              {user ? (
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Admin Badge & Link */}
                    {user.isAdmin && (
                      <Link to="/admin" style={{ textDecoration: 'none' }}>
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
                          cursor: 'pointer'
                        }}>
                          🔧 ADMIN
                        </div>
                      </Link>
                    )}

                    <Bell
                      onClick={() => alert('Notificări - în dezvoltare')}
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        color: '#6b7280',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = theme.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#6b7280';
                      }}
                    />
                    <Link
                      to={`/forum/user/${user.id}`}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: user.photo_url 
                          ? `url(${user.photo_url}) center/cover`
                          : (user.isAdmin ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : generateUserColor(user.username)),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: user.isAdmin ? '2px solid #fbbf24' : 'none',
                        transition: 'all 0.2s',
                        textDecoration: 'none',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {!user.photo_url && user.username.charAt(0).toUpperCase()}
                    </Link>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <User style={{ width: '1rem', height: '1rem' }} />
                  Conectare
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                style={{
                  display: 'flex',
                  padding: '0.5rem',
                  color: '#6b7280',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                {showMobileMenu ? <X style={{ width: '1.5rem', height: '1.5rem' }} /> : <Menu style={{ width: '1.5rem', height: '1.5rem' }} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Overlay */}
          {showMobileMenu && (
            <div className="lg:hidden" style={{
              position: 'absolute',
              top: '4rem',
              left: 0,
              right: 0,
              backgroundColor: theme.surface,
              borderBottom: `1px solid ${theme.border}`,
              padding: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 50
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <ForumSearch />
                </div>
                <Link to="/forum" onClick={() => setShowMobileMenu(false)} style={{ color: theme.text, textDecoration: 'none', padding: '0.5rem', fontWeight: '500' }}>🏠 Acasă Forum</Link>
                <Link to="/forum/recent" onClick={() => setShowMobileMenu(false)} style={{ color: theme.text, textDecoration: 'none', padding: '0.5rem', fontWeight: '500' }}>📝 Postări Recente</Link>
                <Link to="/forum/members" onClick={() => setShowMobileMenu(false)} style={{ color: theme.text, textDecoration: 'none', padding: '0.5rem', fontWeight: '500' }}>👥 Membri Activi</Link>
                <Link to="/forum/rules" onClick={() => setShowMobileMenu(false)} style={{ color: theme.text, textDecoration: 'none', padding: '0.5rem', fontWeight: '500' }}>📜 Regulament</Link>
                <a href="https://fishtrophy.ro" style={{ color: theme.secondary, textDecoration: 'none', padding: '0.5rem', fontWeight: '500' }}>🎣 Fish Trophy</a>
                {user?.isAdmin && (
                  <Link to="/admin" onClick={() => setShowMobileMenu(false)} style={{ color: '#dc2626', textDecoration: 'none', padding: '0.5rem', fontWeight: '600' }}>🔧 Admin Panel</Link>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section - doar pe homepage */}
        {showWelcomeBanner && (
          <div style={{
            background: isDarkMode
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)'
              : 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)',
            borderTop: `1px solid ${theme.border}`
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', textAlign: 'left' }}>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: theme.text,
                marginBottom: '0.5rem'
              }}>
                Bine ai venit pe Forumul Fish Trophy
              </h1>
              <p style={{
                fontSize: '1.125rem',
                color: theme.textSecondary,
                maxWidth: '800px'
              }}>
                Împărtășește experiențe, găsește sfaturi și conectează-te cu alți pescari pasionați din România.
              </p>
            </div>
          </div>
        )}

      </header>

      {/* Navigation Bar with Search */}
      <div style={{
        backgroundColor: theme.background,
        borderBottom: `1px solid ${theme.border}`,
        padding: '0.75rem 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap'
          }}>
            {/* Menu Links */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              fontSize: '0.875rem',
              flex: 1
            }}>
              <Link
                to="/forum"
                style={{
                  color: theme.primary,
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                🏠 Acasă Forum
              </Link>
              <Link
                to="/forum/recent"
                style={{
                  color: theme.text,
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                📝 Postări Recente
              </Link>
              <Link
                to="/forum/members"
                style={{
                  color: theme.text,
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                👥 Membri Activi
              </Link>
              <Link
                to="/forum/rules"
                style={{
                  color: theme.text,
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                📜 Regulament
              </Link>
              <a
                href="https://fishtrophy.ro"
                style={{
                  color: theme.secondary,
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                🎣 Fish Trophy
              </a>
            </div>
            
            {/* Search Bar */}
            <div style={{ flex: '0 0 300px', minWidth: '200px' }}>
              <ForumSearch />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer - Modern Design (same as main site) */}
      <footer style={{
        background: `linear-gradient(to bottom, ${theme.surface}, ${theme.background})`,
        borderTop: `1px solid ${theme.border}`,
        marginTop: '4rem',
        color: theme.text
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {/* Logo & Mission */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <img src="/icon_free.png" alt="Fish Trophy" style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }} />
                <div>
                  <span style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>Fish Trophy</span>
                  <p style={{ fontSize: '0.875rem', color: theme.textSecondary, marginTop: '0.25rem' }}>Platforma pescarilor din România</p>
                </div>
              </div>
              <p style={{ color: theme.textSecondary, maxWidth: '32rem', lineHeight: '1.6', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Urmărește recordurile, concurează cu alții pescari pasionați și contribuie la protejarea naturii prin pescuit responsabil.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a
                  href="mailto:contact@fishtrophy.ro"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.5rem 1rem',
                    backgroundColor: theme.surface,
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    textDecoration: 'none',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                    e.currentTarget.style.borderColor = theme.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surface;
                    e.currentTarget.style.borderColor = theme.border;
                  }}
                >
                  <svg style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: theme.text, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navigare</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li>
                  <a
                    href="/"
                    style={{
                      fontSize: '0.875rem',
                      color: theme.textSecondary,
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.primary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.textSecondary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '0';
                    }}
                  >
                    <span className="hover-dot" style={{ width: '0.375rem', height: '0.375rem', backgroundColor: theme.primary, borderRadius: '50%', marginRight: '0.5rem', opacity: 0, transition: 'opacity 0.2s' }}></span>
                    Acasă
                  </a>
                </li>
                <li>
                  <a
                    href="/species"
                    style={{
                      fontSize: '0.875rem',
                      color: theme.textSecondary,
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.primary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.textSecondary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '0';
                    }}
                  >
                    <span className="hover-dot" style={{ width: '0.375rem', height: '0.375rem', backgroundColor: theme.primary, borderRadius: '50%', marginRight: '0.5rem', opacity: 0, transition: 'opacity 0.2s' }}></span>
                    Specii
                  </a>
                </li>
                <li>
                  <a
                    href="/records"
                    style={{
                      fontSize: '0.875rem',
                      color: theme.textSecondary,
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.primary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.textSecondary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '0';
                    }}
                  >
                    <span className="hover-dot" style={{ width: '0.375rem', height: '0.375rem', backgroundColor: theme.primary, borderRadius: '50%', marginRight: '0.5rem', opacity: 0, transition: 'opacity 0.2s' }}></span>
                    Recorduri
                  </a>
                </li>
                <li>
                  <a
                    href="/submission-guide"
                    style={{
                      fontSize: '0.875rem',
                      color: theme.textSecondary,
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.primary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.textSecondary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '0';
                    }}
                  >
                    <span className="hover-dot" style={{ width: '0.375rem', height: '0.375rem', backgroundColor: theme.primary, borderRadius: '50%', marginRight: '0.5rem', opacity: 0, transition: 'opacity 0.2s' }}></span>
                    Ghid Submisie
                  </a>
                </li>
              </ul>
            </div>

            {/* Community & Social */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: theme.text, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comunitate</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li>
                  <a
                    href="/profile"
                    style={{
                      fontSize: '0.875rem',
                      color: theme.textSecondary,
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.primary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.textSecondary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '0';
                    }}
                  >
                    <span className="hover-dot" style={{ width: '0.375rem', height: '0.375rem', backgroundColor: theme.primary, borderRadius: '50%', marginRight: '0.5rem', opacity: 0, transition: 'opacity 0.2s' }}></span>
                    Profilul meu
                  </a>
                </li>
                <li>
                  <a
                    href="/leaderboards"
                    style={{
                      fontSize: '0.875rem',
                      color: theme.textSecondary,
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.primary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.textSecondary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '0';
                    }}
                  >
                    <span className="hover-dot" style={{ width: '0.375rem', height: '0.375rem', backgroundColor: theme.primary, borderRadius: '50%', marginRight: '0.5rem', opacity: 0, transition: 'opacity 0.2s' }}></span>
                    Clasamente
                  </a>
                </li>
                <li>
                  <a
                    href="/fishing-shops"
                    style={{
                      fontSize: '0.875rem',
                      color: theme.textSecondary,
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.primary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.textSecondary;
                      const dot = e.currentTarget.querySelector('.hover-dot') as HTMLElement;
                      if (dot) dot.style.opacity = '0';
                    }}
                  >
                    <span className="hover-dot" style={{ width: '0.375rem', height: '0.375rem', backgroundColor: theme.primary, borderRadius: '50%', marginRight: '0.5rem', opacity: 0, transition: 'opacity 0.2s' }}></span>
                    Magazine
                  </a>
                </li>
              </ul>

              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: theme.text, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Urmărește-ne</h4>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <a
                    href="https://www.facebook.com/fishtrophy.ro"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      backgroundColor: '#1877F2',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      textDecoration: 'none',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#166FE5';
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1877F2';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.instagram.com/fishtrophy.ro"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      background: 'linear-gradient(to right, #E4405F, #C13584)',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      textDecoration: 'none',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #D7356A, #B02A73)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #E4405F, #C13584)';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a
                    href="https://x.com/fishtrophy_ro"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      backgroundColor: '#000000',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      textDecoration: 'none',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1f2937';
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#000000';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '1.5rem', marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem', color: theme.textSecondary }}>
                <span style={{ fontWeight: '500' }}>© 2025 Fish Trophy</span>
                <span style={{ color: theme.border }}>•</span>
                <span>Toate drepturile rezervate</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: theme.textSecondary }}>
                <span>Făcut cu</span>
                <span style={{ color: '#ef4444', fontSize: '1.125rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>❤️</span>
                <span>în România</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <SimpleLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
