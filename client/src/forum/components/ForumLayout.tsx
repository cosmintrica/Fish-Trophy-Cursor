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
    <div style={{ minHeight: '100vh', backgroundColor: theme.background, transition: 'all 0.3s ease', overflowY: 'auto', overflowX: 'hidden', width: '100%' }}>
      {/* SINGURUL HEADER DE NAVIGARE PENTRU TOATE PAGINILE FORUM */}
      <header style={{ backgroundColor: theme.surface, borderBottom: `1px solid ${theme.border}`, position: 'sticky', top: 0, zIndex: 40, width: '100%' }}>
        {/* Top Navigation */}
        <nav style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 0.75rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '3.5rem', gap: '0.5rem' }}>
            {/* Logo - Optimizat pentru mobil */}
            <Link to="/forum" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', minWidth: 0, flex: '0 0 auto' }}>
              <img
                src="/icon_free.png"
                alt="Fish Trophy Forum"
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '0.5rem',
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 'clamp(0.875rem, 2.5vw, 1.25rem)',
                  fontWeight: '700',
                  color: theme.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  <span className="hidden sm:inline">Fish Trophy Forum</span>
                  <span className="sm:hidden">Forum</span>
                </div>
                <div className="hidden sm:block" style={{ fontSize: '0.625rem', color: theme.textSecondary }}>
                  Comunitatea pescarilor
                </div>
              </div>
            </Link>

            {/* User Menu / Login - Optimizat pentru mobil */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
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
                  if (e.currentTarget) {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                    e.currentTarget.style.color = theme.text;
                  }
                }}
                onMouseLeave={(e) => {
                  if (e.currentTarget) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.textSecondary;
                  }
                }}
              >
                {isDarkMode ? '🐟' : '🌙'}
              </button>

              {user ? (
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Admin Badge & Link - Ascuns pe mobil mic */}
                    {user.isAdmin && (
                      <Link to="/admin" className="hidden sm:block" style={{ textDecoration: 'none' }}>
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

                    {/* Bell - Ascuns pe mobil mic */}
                    <Bell
                      onClick={() => alert('Notificări - în dezvoltare')}
                      className="hidden sm:block"
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        color: '#6b7280',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (e.currentTarget) {
                          e.currentTarget.style.color = theme.primary;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (e.currentTarget) {
                          e.currentTarget.style.color = '#6b7280';
                        }
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
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        if (e.currentTarget) {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (e.currentTarget) {
                          e.currentTarget.style.transform = 'scale(1)';
                        }
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
                    padding: '0.5rem 0.75rem',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <User style={{ width: '0.875rem', height: '0.875rem' }} />
                  <span className="hidden sm:inline">Conectare</span>
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

      {/* Navigation Bar with Search - Ascuns pe mobil (doar în meniu) */}
      <div className="hidden lg:block" style={{
        backgroundColor: theme.background,
        borderBottom: `1px solid ${theme.border}`,
        padding: '0.75rem 0',
        width: '100%'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', width: '100%' }}>
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

      {/* Footer - Simplificat */}
      <footer style={{
        borderTop: `1px solid ${theme.border}`,
        marginTop: '4rem',
        padding: '1.5rem 0.75rem',
        color: theme.text,
        width: '100%',
        overflowX: 'hidden',
        backgroundColor: theme.background
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            alignItems: 'center',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: theme.textSecondary
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
              <span>© 2025 Fish Trophy</span>
              <span style={{ color: theme.border }}>•</span>
              <span>Toate drepturile rezervate</span>
              <span style={{ color: theme.border }}>•</span>
              <span>Făcut cu</span>
              <span style={{ color: '#ef4444', fontSize: '1.125rem' }}>❤️</span>
              <span>în România</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'center' }}>
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
      <SimpleLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
