import { useState } from 'react';
import { Search, Menu, User, X, MessageSquare, TrendingUp, Users, Clock } from 'lucide-react';

interface SimpleForumLayoutProps {
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
    rank: string;
  } | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function SimpleForumLayout({ user, onLogin, onLogout }: SimpleForumLayoutProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching:', searchQuery);
  };

  const generateUserColor = (name: string) => {
    const colors = [
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #10b981, #047857)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #ec4899, #db2777)',
      'linear-gradient(135deg, #6366f1, #4f46e5)',
      'linear-gradient(135deg, #14b8a6, #0d9488)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #06b6d4, #0891b2)'
    ];
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)' }}>
      {/* Header - Fixed */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
            {/* Logo */}
            <a
              href="/forum"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none'
              }}
            >
              <img
                src="/icon_free.png"
                alt="Fish Trophy Forum"
                style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '0.75rem',
                  transition: 'transform 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '1.875rem',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  Fish Trophy
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.25rem 0.5rem',
                    background: 'linear-gradient(135deg, #f97316, #dc2626)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    borderRadius: '9999px',
                    gap: '0.25rem'
                  }}
                >
                  <MessageSquare style={{ width: '0.75rem', height: '0.75rem' }} />
                  FORUM
                </span>
              </div>
            </a>

            {/* Desktop Navigation */}
            <nav style={{ display: 'none', alignItems: 'center', gap: '2rem' }} className="lg:flex">
              <a href="/forum" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none', transition: 'color 0.2s' }}>
                Forum Acasă
              </a>
              <a href="/forum/recent" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none', transition: 'color 0.2s' }}>
                Postări Recente
              </a>
              <a href="/forum/members" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none', transition: 'color 0.2s' }}>
                Membri
              </a>
              <a href="https://fishtrophy.ro" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none', transition: 'color 0.2s' }}>
                ← Înapoi la Fish Trophy
              </a>
            </nav>

            {/* User Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: generateUserColor(user.username),
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                    className="hidden sm:block"
                  >
                    {user.username}
                  </div>
                  <a
                    href={`/forum/user/${user.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      borderRadius: '0.75rem',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    className="hidden sm:inline-flex"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8, #4338ca, #6d28d9)';
                      e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <User style={{ width: '1rem', height: '1rem' }} />
                    Profilul meu
                  </a>
                </div>
              ) : (
                <button
                  onClick={onLogin}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed)',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    borderRadius: '0.75rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  className="hidden sm:inline-flex"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8, #4338ca, #6d28d9)';
                    e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <User style={{ width: '1rem', height: '1rem' }} />
                  Autentificare
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  color: '#374151',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: showMobileMenu ? 'rotate(90deg)' : 'rotate(0deg)'
                }}
                className="lg:hidden"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#2563eb';
                  e.currentTarget.style.backgroundColor = '#dbeafe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {showMobileMenu ? (
                  <X style={{ width: '1.5rem', height: '1.5rem' }} />
                ) : (
                  <Menu style={{ width: '1.5rem', height: '1.5rem' }} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            transition: 'all 0.3s ease'
          }}
          className="lg:hidden"
        >
          {/* Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }}
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Menu Card */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              height: '100%',
              width: '300px',
              backgroundColor: 'white',
              borderRadius: '1rem 0 0 1rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Menu Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img
                  src="/icon_free.png"
                  alt="Fish Trophy"
                  style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem' }}
                />
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>Forum Meniu</span>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                style={{
                  padding: '0.5rem',
                  color: '#9ca3af',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '0.375rem',
                  transition: 'color 0.2s'
                }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            {/* Menu Items */}
            <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <a
                  href="/forum"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    color: '#374151',
                    textDecoration: 'none',
                    borderRadius: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <MessageSquare style={{ width: '1.25rem', height: '1.25rem' }} />
                  <span style={{ fontSize: '1rem', fontWeight: '500' }}>Forum Acasă</span>
                </a>

                <a
                  href="/forum/recent"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    color: '#374151',
                    textDecoration: 'none',
                    borderRadius: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Clock style={{ width: '1.25rem', height: '1.25rem' }} />
                  <span style={{ fontSize: '1rem', fontWeight: '500' }}>Postări Recente</span>
                </a>

                <a
                  href="/forum/members"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    color: '#374151',
                    textDecoration: 'none',
                    borderRadius: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Users style={{ width: '1.25rem', height: '1.25rem' }} />
                  <span style={{ fontSize: '1rem', fontWeight: '500' }}>Membri</span>
                </a>

                <a
                  href="https://fishtrophy.ro"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    color: '#374151',
                    textDecoration: 'none',
                    borderRadius: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <span style={{ width: '1.25rem', height: '1.25rem', fontSize: '1rem' }}>🏠</span>
                  <span style={{ fontSize: '1rem', fontWeight: '500' }}>Fish Trophy</span>
                </a>
              </div>
            </nav>

            {/* User Section */}
            {user ? (
              <div style={{ padding: '1rem', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }}>
                  <div
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      background: generateUserColor(user.username),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {user.username}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Rang: <span className={`user-rank rank-${user.rank}`}>{user.rank}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onLogout();
                    setShowMobileMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    color: '#374151',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'color 0.2s'
                  }}
                >
                  <X style={{ width: '1.25rem', height: '1.25rem' }} />
                  Ieșire
                </button>
              </div>
            ) : (
              <div style={{ padding: '1rem', borderTop: '1px solid #f3f4f6' }}>
                <button
                  onClick={() => {
                    onLogin();
                    setShowMobileMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    color: '#374151',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'color 0.2s'
                  }}
                >
                  <User style={{ width: '1.25rem', height: '1.25rem' }} />
                  Autentificare
                </button>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>Făcut cu</span>
                <span style={{ color: '#ef4444' }}>❤️</span>
                <span>în România</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, paddingTop: '4rem' }}>
        <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto', padding: '1rem', gap: '1.5rem' }}>
          {/* Sidebar stânga - Reclame */}
          <div style={{ width: '200px', display: 'none' }} className="xl:block">
            <div
              style={{
                position: 'sticky',
                top: '5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '1rem',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                padding: '1rem',
                textAlign: 'center',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                color: '#9ca3af'
              }}
            >
              <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: '600' }}>PUBLICITATE</div>
              <div style={{ border: '2px dashed #d1d5db', borderRadius: '0.5rem', padding: '2rem 1rem' }}>
                <div style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
                  Banner<br />
                  200x400<br />
                  <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Google Ads<br />
                    sau<br />
                    Bannere Custom
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content principal */}
          <div style={{ flex: 1, maxWidth: '900px' }}>
            {/* Categories */}
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Pescuit în Apă Dulce */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: 'white',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div
                  style={{
                    width: '3rem',
                    height: '3rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}
                >
                  🎣
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Pescuit în Apă Dulce
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                    Discuții despre pescuitul în râuri, lacuri și bălți din România
                  </p>
                </div>
              </div>

              {/* Subcategorii */}
              <div>
                <div
                  style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: '#059669',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    >
                      🐟
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                        Pescuit la Crap
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Tehnici, momeli și echipament pentru pescuitul la crap
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                      <span>234</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users style={{ width: '1rem', height: '1rem' }} />
                      <span>1,567</span>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '8rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>15m</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>de PescarExpert</div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: '#059669',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    >
                      🐠
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                        Pescuit la Păstrăv
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Locații, sezoane și tactici pentru păstrăv
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                      <span>89</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users style={{ width: '1rem', height: '1rem' }} />
                      <span>445</span>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '8rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>3h</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>de TroutMaster</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Marea Neagră - Coming Soon */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {/* Coming Soon Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  backdropFilter: 'blur(4px)'
                }}
              >
                <div style={{ textAlign: 'center', color: 'white' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Coming Soon
                  </h3>
                  <p style={{ fontSize: '1rem', opacity: 0.9 }}>
                    Secțiunea Marea Neagră va fi disponibilă în curând
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  color: 'white',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  filter: 'grayscale(0.3)'
                }}
              >
                <div
                  style={{
                    width: '3rem',
                    height: '3rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}
                >
                  🌊
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Pescuit în Marea Neagră
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                    Pescuit de la mal și din barcă pe litoralul românesc
                  </p>
                </div>
              </div>

              <div style={{ filter: 'grayscale(0.5)' }}>
                <div
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: '#6b7280',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    >
                      🏖️
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Pescuit de la Mal
                      </h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                        Surf casting și tehnici litorale
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                      <span>---</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users style={{ width: '1rem', height: '1rem' }} />
                      <span>---</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Echipament și Accesorii */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: 'white',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div
                  style={{
                    width: '3rem',
                    height: '3rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}
                >
                  🎯
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Echipament și Accesorii
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                    Reviews, recomandări și discuții despre echipamentul de pescuit
                  </p>
                </div>
              </div>

              <div>
                <div
                  style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: '#059669',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    >
                      🎣
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                        Lansete și Mulinete
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Reviews, comparații și recomandări
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                      <span>78</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users style={{ width: '1rem', height: '1rem' }} />
                      <span>334</span>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '8rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>1h</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>de EquipmentPro</div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: '#059669',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    >
                      🪱
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                        Momeli și Nade
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Artificiale, naturale și DIY
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                      <span>156</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users style={{ width: '1rem', height: '1rem' }} />
                      <span>892</span>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '8rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>4h</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>de MomeliMaster</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activitate Forum - ca în screenshot */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  padding: '1rem 1.5rem',
                  fontSize: '1.125rem',
                  fontWeight: '600'
                }}
              >
                📊 Activitate Forum
              </div>

              <div style={{ padding: '1.5rem' }}>
                {/* Utilizatori online */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                    Utilizatori online în acest moment: <span style={{ color: '#059669', fontWeight: '700' }}>214</span>
                    <span style={{ color: '#6b7280', fontWeight: '400' }}> (62 membri și 152 vizitatori)</span>
                  </h4>

                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Cei mai mulți utilizatori conectați: <strong>9,860</strong>, pe 11.07.2020 la <strong>19:24</strong>.
                  </div>

                  {/* Lista utilizatori online */}
                  <div style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                    <span style={{ color: '#6b7280' }}>Utilizatori conectați: </span>
                    <span style={{ color: '#2563eb' }}>adrian_buzau</span>,
                    <span style={{ color: '#7c3aed' }}> bestbattle</span>,
                    <span style={{ color: '#059669' }}> catalin_calina</span>,
                    <span style={{ color: '#dc2626' }}> dau1395</span>,
                    <span style={{ color: '#ea580c' }}> CristianFitz</span>,
                    <span style={{ color: '#0891b2' }}> crl</span>,
                    <span style={{ color: '#7c2d12' }}> Daniel.</span>,
                    <span style={{ color: '#166534' }}> Day</span>,
                    <span style={{ color: '#7c3aed' }}> DayStar</span>,
                    <span style={{ color: '#be185d' }}> deme</span>,
                    <span style={{ color: '#9333ea' }}> drunky</span>,
                    <span style={{ color: '#0369a1' }}> DUMY</span>,
                    <span style={{ color: '#dc2626' }}> elyenn</span>,
                    <span style={{ color: '#059669' }}> Euji.Mundeak</span>,
                    <span style={{ color: '#ea580c' }}> fr3312</span>
                    <span style={{ color: '#6b7280' }}> și alții...</span>
                  </div>
                </div>

                {/* Legendă ranguri */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                    Legendă:
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#dc2626', fontWeight: '700' }}>[Administratori]</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#7c3aed', fontWeight: '700' }}>[Super Moderatori]</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#059669', fontWeight: '700' }}>[Moderatori]</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#ea580c', fontWeight: '700' }}>[Echipa Folding@Home]</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#0891b2', fontWeight: '700' }}>[Producători]</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#f59e0b', fontWeight: '700' }}>[Fotografi Lunii]</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#8b5cf6', fontWeight: '700' }}>[Editorialiști Lunii]</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#374151', fontWeight: '500' }}>[Registered Users]</span>
                    </span>
                  </div>
                </div>

                {/* Status forum */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '50%',
                        backgroundColor: '#10b981'
                      }}
                    ></div>
                    <span style={{ color: '#374151' }}>Forumul <strong>conține</strong> posturi noi</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '50%',
                        backgroundColor: '#6b7280'
                      }}
                    ></div>
                    <span style={{ color: '#374151' }}>Forumul <strong>nu conține</strong> posturi noi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>

      {/* Footer - stil Fish Trophy */}
      <footer style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '4rem 1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            {/* Logo & Mission */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <img src="/icon_free.png" alt="Fish Trophy Forum" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem' }} />
                <div>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>Fish Trophy Forum</span>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Comunitatea pescarilor din România</p>
                </div>
              </div>
              <p style={{ color: '#4b5563', maxWidth: '32rem', lineHeight: '1.6', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Împărtășește experiențe, găsește sfaturi și conectează-te cu alți pescari pasionați din România.
              </p>
            </div>
          </div>

          {/* Bottom Section */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '2rem', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>© 2025 Fish Trophy Forum</span>
                <span>•</span>
                <span>Toate drepturile rezervate</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>Făcut cu</span>
                <span style={{ color: '#ef4444' }}>❤️</span>
                <span>în România</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

