import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Search, User, Bell, Settings, LogOut, MessageSquare } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import SimpleLoginModal from './SimpleLoginModal';

export interface ForumUser {
  id: string;
  username: string;
  email: string;
  isAdmin?: boolean;
}

interface ForumLayoutProps {
  children: React.ReactNode;
  user?: ForumUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function ForumLayout({ children, user, onLogin, onLogout }: ForumLayoutProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isDarkMode, toggleDarkMode, theme } = useTheme();

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
    <div style={{ minHeight: '100vh', backgroundColor: theme.background, transition: 'all 0.3s ease' }}>
      {/* Header */}
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

            {/* Search Bar */}
            <div style={{ flex: 1, maxWidth: '400px', margin: '0 2rem' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1rem',
                  height: '1rem',
                  color: '#9ca3af'
                }} />
                <input
                  type="text"
                  placeholder="Caută în forum..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: theme.background,
                    color: theme.text
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.primary;
                    e.target.style.backgroundColor = theme.surface;
                    e.target.style.boxShadow = `0 0 0 3px ${theme.primary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.border;
                    e.target.style.backgroundColor = theme.background;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
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
                    {/* Admin Badge */}
                    {user.isAdmin && (
                      <div style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        🔧 ADMIN
                      </div>
                    )}

                    <Bell style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280', cursor: 'pointer' }} />
                    <div
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: user.isAdmin ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : generateUserColor(user.username),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: user.isAdmin ? '2px solid #fbbf24' : 'none'
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </div>
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
        </nav>

        {/* Hero Section */}
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

      </header>

      {/* Navigation Bar */}
      <div style={{
        backgroundColor: theme.background,
        borderBottom: `1px solid ${theme.border}`,
        padding: '0.75rem 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            fontSize: '0.875rem'
          }}>
            <Link
              to="/forum"
              style={{
                color: theme.primary,
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'color 0.2s'
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
                transition: 'color 0.2s'
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
                transition: 'color 0.2s'
              }}
            >
              👥 Membri Activi
            </Link>
            <a
              href="https://fishtrophy.ro"
              style={{
                color: theme.secondary,
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'color 0.2s'
              }}
            >
              🎣 Fish Trophy
            </a>
            <div
              className="mobile-hidden"
              style={{
                marginLeft: 'auto',
                fontSize: '0.75rem',
                color: theme.textSecondary
              }}
            >
              Bun venit pe forumul oficial Fish Trophy
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: theme.surface,
        borderTop: `1px solid ${theme.border}`,
        marginTop: '4rem',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1rem 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {/* Logo și descriere */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <img
                  src="/icon_free.png"
                  alt="Fish Trophy Forum"
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '0.375rem'
                  }}
                />
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: theme.text }}>
                  Fish Trophy Forum
                </span>
              </div>
              <p style={{ color: theme.textSecondary, fontSize: '0.875rem', lineHeight: '1.5' }}>
                Comunitatea pescarilor pasionați din România. Împărtășim experiențe,
                sfaturi și pasiunea pentru pescuit.
              </p>
            </div>

            {/* Linkuri rapide */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: theme.text, marginBottom: '1rem' }}>
                Linkuri Rapide
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link to="/forum" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: '0.875rem' }}>
                  Acasă Forum
                </Link>
                <Link to="/forum" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: '0.875rem' }}>
                  Categorii
                </Link>
                <Link to="/forum" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: '0.875rem' }}>
                  Membri
                </Link>
                <a href="https://fishtrophy.ro" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: '0.875rem' }}>
                  Fish Trophy
                </a>
              </div>
            </div>

            {/* Suport */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: theme.text, marginBottom: '1rem' }}>
                Suport
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="mailto:contact@fishtrophy.ro" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: '0.875rem' }}>
                  Contact
                </a>
                <Link to="/forum" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: '0.875rem' }}>
                  Regulament
                </Link>
                <Link to="/forum" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: '0.875rem' }}>
                  Confidențialitate
                </Link>
                <Link to="/forum" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: '0.875rem' }}>
                  Termeni
                </Link>
              </div>
            </div>

            {/* Social Media */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: theme.text, marginBottom: '1rem' }}>
                Urmărește-ne
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a
                  href="https://facebook.com/fishtrophy"
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    backgroundColor: '#3b5998',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '1rem',
                    transition: 'transform 0.2s'
                  }}
                >
                  📘
                </a>
                <a
                  href="https://instagram.com/fishtrophy"
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    background: 'linear-gradient(135deg, #e1306c, #fd1d1d)',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '1rem',
                    transition: 'transform 0.2s'
                  }}
                >
                  📷
                </a>
                <a
                  href="https://youtube.com/fishtrophy"
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    backgroundColor: '#ff0000',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '1rem',
                    transition: 'transform 0.2s'
                  }}
                >
                  📺
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div style={{
            borderTop: `1px solid ${theme.border}`,
            paddingTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{
              fontSize: '0.875rem',
              color: theme.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              © 2025 Fish Trophy Forum. Made with ❤️ in România.
            </div>
            <div style={{ fontSize: '0.875rem', color: theme.textSecondary }}>
              Toate drepturile rezervate.
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <SimpleLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
