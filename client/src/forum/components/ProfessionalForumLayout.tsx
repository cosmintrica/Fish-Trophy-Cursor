import { useState, useEffect } from 'react';
import { Menu, User, X, MessageSquare, Users, Clock, TrendingUp, Eye } from 'lucide-react';
import { forumStorage } from '../services/forumService';

interface ProfessionalForumLayoutProps {
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
    rank: string;
  } | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function ProfessionalForumLayout({ user, onLogin, onLogout }: ProfessionalForumLayoutProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [forumStats, setForumStats] = useState({
    totalTopics: 0,
    totalPosts: 0,
    totalMembers: 1247,
    onlineUsers: 47
  });

  useEffect(() => {
    const stats = forumStorage.getForumStats();
    setForumStats(stats);
  }, []);

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
      {/* Header Unic pentru Forum */}
      <header 
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
            {/* Logo și Welcome Message */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem'
                  }}
                />
                <div>
                  <div 
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      lineHeight: '1.1'
                    }}
                  >
                    Fish Trophy Forum
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    Comunitatea pescarilor din România
                  </div>
                </div>
              </a>
            </div>

            {/* Navigation Links */}
            <nav style={{ display: 'none', alignItems: 'center', gap: '2rem' }} className="lg:flex">
              <a href="/forum" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none', transition: 'color 0.2s' }}>
                Acasă Forum
              </a>
              <a href="/forum/recent" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none', transition: 'color 0.2s' }}>
                Postări Recente
              </a>
              <a href="/forum/members" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none', transition: 'color 0.2s' }}>
                Membri Activi
              </a>
              <a href="https://fishtrophy.ro" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#2563eb', textDecoration: 'none', transition: 'color 0.2s' }}>
                ← Fish Trophy
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
                      background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      borderRadius: '0.5rem',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                    className="hidden sm:inline-flex"
                  >
                    <User style={{ width: '1rem', height: '1rem' }} />
                    Profil
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
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                  className="hidden sm:inline-flex"
                >
                  <User style={{ width: '1rem', height: '1rem' }} />
                  Conectare
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  color: '#374151',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                className="lg:hidden"
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

      {/* Main Content */}
      <main style={{ paddingTop: '4rem' }}>
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

          {/* Content principal - centrat */}
          <div style={{ flex: 1, maxWidth: '900px', margin: '0 auto' }}>
            {/* Categories */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Pescuit în Apă Dulce */}
              <div 
                style={{
                  backgroundColor: 'white',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div 
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem'
                    }}
                  >
                    🎣
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.125rem' }}>
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
                      padding: '1rem 1.5rem',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => window.location.href = '/forum/category/pescuit-crap'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div 
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          backgroundColor: '#059669',
                          borderRadius: '0.375rem',
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
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
                          Pescuit la Crap
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                          Tehnici, momeli și echipament pentru pescuitul la crap
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MessageSquare style={{ width: '0.875rem', height: '0.875rem' }} />
                        <span style={{ fontWeight: '600' }}>234</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users style={{ width: '0.875rem', height: '0.875rem' }} />
                        <span style={{ fontWeight: '600' }}>1,567</span>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '7rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>acum 15m</div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>de <span style={{ color: '#2563eb', fontWeight: '600' }}>PescarExpert</span></div>
                      </div>
                    </div>
                  </div>

                  <div 
                    style={{
                      padding: '1rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => window.location.href = '/forum/category/pescuit-pastrav'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div 
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          backgroundColor: '#059669',
                          borderRadius: '0.375rem',
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
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
                          Pescuit la Păstrăv
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                          Locații, sezoane și tactici pentru păstrăv
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MessageSquare style={{ width: '0.875rem', height: '0.875rem' }} />
                        <span style={{ fontWeight: '600' }}>89</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users style={{ width: '0.875rem', height: '0.875rem' }} />
                        <span style={{ fontWeight: '600' }}>445</span>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '7rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>acum 3h</div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>de <span style={{ color: '#059669', fontWeight: '600' }}>TroutMaster</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Echipament și Accesorii */}
              <div 
                style={{
                  backgroundColor: 'white',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div 
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem'
                    }}
                  >
                    🎯
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.125rem' }}>
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
                      padding: '1rem 1.5rem',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div 
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          backgroundColor: '#059669',
                          borderRadius: '0.375rem',
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
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
                          Lansete și Mulinete
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                          Reviews, comparații și recomandări pentru echipament
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MessageSquare style={{ width: '0.875rem', height: '0.875rem' }} />
                        <span style={{ fontWeight: '600' }}>78</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users style={{ width: '0.875rem', height: '0.875rem' }} />
                        <span style={{ fontWeight: '600' }}>334</span>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '7rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>acum 1h</div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>de <span style={{ color: '#7c3aed', fontWeight: '600' }}>EquipmentPro</span></div>
                      </div>
                    </div>
                  </div>

                  <div 
                    style={{
                      padding: '1rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div 
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          backgroundColor: '#059669',
                          borderRadius: '0.375rem',
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
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
                          Momeli și Nade
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                          Artificiale, naturale și DIY pentru toate speciile
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MessageSquare style={{ width: '0.875rem', height: '0.875rem' }} />
                        <span style={{ fontWeight: '600' }}>156</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users style={{ width: '0.875rem', height: '0.875rem' }} />
                        <span style={{ fontWeight: '600' }}>892</span>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '7rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>acum 4h</div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>de <span style={{ color: '#f59e0b', fontWeight: '600' }}>MomeliMaster</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activitate Forum - cu toate statisticile reale */}
              <div 
                style={{
                  backgroundColor: 'white',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    padding: '0.875rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <TrendingUp style={{ width: '1.125rem', height: '1.125rem' }} />
                  Activitate Forum
                </div>

                <div style={{ padding: '1.5rem' }}>
                  {/* Statistici generale */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2563eb' }}>{forumStats.totalMembers.toLocaleString('ro-RO')}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Membri Total</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>{forumStats.totalTopics}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Topicuri</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#fefce8', borderRadius: '0.5rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>{forumStats.totalPosts}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Postări</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: '0.5rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>{forumStats.onlineUsers}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Online Acum</div>
                    </div>
                  </div>

                  {/* Utilizatori online */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Eye style={{ width: '1rem', height: '1rem', color: '#10b981' }} />
                      Utilizatori online în acest moment: <span style={{ color: '#10b981', fontWeight: '700' }}>47</span> 
                      <span style={{ color: '#6b7280', fontWeight: '400' }}> (23 membri și 24 vizitatori)</span>
                    </h4>
                    
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                      Record utilizatori online: <strong>312</strong>, pe 15.08.2024 la <strong>20:45</strong>.
                    </div>

                    {/* Lista utilizatori online */}
                    <div style={{ fontSize: '0.75rem', lineHeight: '1.5', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem' }}>
                      <span style={{ color: '#6b7280', fontWeight: '600' }}>Membri conectați: </span>
                      <span style={{ color: '#dc2626', fontWeight: '600' }}>AdminPescuit</span>, 
                      <span style={{ color: '#7c3aed' }}> ModeratorCarp</span>, 
                      <span style={{ color: '#059669' }}> PescarExpert</span>, 
                      <span style={{ color: '#2563eb' }}> CrapMaster2024</span>, 
                      <span style={{ color: '#ea580c' }}> TroutHunter</span>, 
                      <span style={{ color: '#0891b2' }}> SomniferulRau</span>, 
                      <span style={{ color: '#7c2d12' }}> PlaticaMania</span>, 
                      <span style={{ color: '#166534' }}> SalauSpecialist</span>, 
                      <span style={{ color: '#be185d' }}> FeederPro</span>, 
                      <span style={{ color: '#9333ea' }}> SpinningFan</span>, 
                      <span style={{ color: '#0369a1' }}> MareaNegraPro</span>, 
                      <span style={{ color: '#dc2626' }}> DebutantFericit</span>, 
                      <span style={{ color: '#059669' }}> VeteranPescar</span>, 
                      <span style={{ color: '#ea580c' }}> EchipamentGuru</span>, 
                      <span style={{ color: '#6366f1' }}> MomeliArtist</span>
                      <span style={{ color: '#6b7280' }}> și încă 8 membri...</span>
                    </div>
                  </div>

                  {/* Legendă ranguri - adaptată pentru Fish Trophy */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                      Legendă Ranguri Fish Trophy Forum:
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#dc2626', fontWeight: '700' }}>[Admin Forum]</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#7c3aed', fontWeight: '700' }}>[Moderatori]</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#059669', fontWeight: '700' }}>[Maestru Pescar]</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#ea580c', fontWeight: '700' }}>[Expert Pescuit]</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#0891b2', fontWeight: '700' }}>[Pescar Experimentat]</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#2563eb', fontWeight: '700' }}>[Pescar Activ]</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#10b981', fontWeight: '700' }}>[Începător]</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#374151', fontWeight: '500' }}>[Vizitatori]</span>
                      </span>
                    </div>
                  </div>

                  {/* Status forum și ultimele activități */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div 
                          style={{
                            width: '0.75rem',
                            height: '0.75rem',
                            borderRadius: '50%',
                            backgroundColor: '#10b981'
                          }}
                        ></div>
                        <span style={{ color: '#374151' }}>Forum <strong>activ</strong> - posturi noi</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div 
                          style={{
                            width: '0.75rem',
                            height: '0.75rem',
                            borderRadius: '50%',
                            backgroundColor: '#6b7280'
                          }}
                        ></div>
                        <span style={{ color: '#374151' }}>Fără activitate recentă</span>
                      </div>
                    </div>

                    {/* Ultimele activități */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                      <h5 style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        🔥 Ultimele activități:
                      </h5>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', lineHeight: '1.4' }}>
                        • <span style={{ color: '#2563eb', fontWeight: '600' }}>PescarExpert</span> a postat în "Captură excepțională la Snagov" - acum 15m<br />
                        • <span style={{ color: '#059669', fontWeight: '600' }}>TroutMaster</span> a creat topicul "Păstrăvi pe Argeș" - acum 3h<br />
                        • <span style={{ color: '#7c3aed', fontWeight: '600' }}>EquipmentPro</span> a evaluat lanseta "Shimano Catana" - acum 1h<br />
                        • <span style={{ color: '#10b981', fontWeight: '600' }}>DebutantFericit</span> s-a înregistrat pe forum - acum 2h
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Marea Neagră - Coming Soon (secțiune mică, deasupra statisticilor) */}
              <div 
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  position: 'relative',
                  opacity: 0.8
                }}
              >
                {/* Coming Soon Overlay */}
                <div 
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    backdropFilter: 'blur(1px)'
                  }}
                >
                  <div style={{ textAlign: 'center', color: 'white' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🔒</div>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: '700' }}>
                      Coming Soon
                    </h3>
                  </div>
                </div>

                <div 
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <div 
                    style={{
                      width: '2rem',
                      height: '2rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem'
                    }}
                  >
                    🌊
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: '600' }}>
                      Pescuit în Marea Neagră
                    </h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.75rem' }}>
                      În dezvoltare - disponibil în curând
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar dreapta - Reclame */}
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
        </div>
      </main>

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
                  href="https://fishtrophy.ro"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    color: '#2563eb',
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
                  Conectare
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

      {/* Footer - stil Fish Trophy */}
      <footer style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', marginTop: '2rem' }}>
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
