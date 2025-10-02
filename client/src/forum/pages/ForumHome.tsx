import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { forumStorage } from '../services/forumService';
import ForumLayout from '../components/ForumLayout';
import MobileOptimizedCategories from '../components/MobileOptimizedCategories';

export default function ForumHome() {
  const { forumUser, signOut } = useAuth();
  const { theme } = useTheme();
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

  const handleLogin = () => {
    // Login handled by ForumLayout
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleSubcategoryClick = (subcategoryId: string) => {
    window.location.href = `/forum/category/${subcategoryId}`;
  };

  return (
    <ForumLayout user={forumUser ? { id: forumUser.id, username: forumUser.username, email: '', isAdmin: false } : null} onLogin={handleLogin} onLogout={handleLogout}>
      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Mobile Optimized Forum Categories */}
        <MobileOptimizedCategories onSubcategoryClick={handleSubcategoryClick} />

        {/* Activitate și Statistici Forum */}
        <div style={{
          backgroundColor: theme.surface,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginTop: '2rem',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: theme.background,
            borderBottom: `1px solid ${theme.border}`,
            padding: '1rem 1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, margin: 0 }}>
              Activitate Forum
            </h3>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {/* Statistici generale într-o singură linie */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: theme.background,
              borderRadius: '0.5rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: theme.primary, marginBottom: '0.25rem' }}>
                  {forumStats.totalMembers.toLocaleString('ro-RO')}
                </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontWeight: '500' }}>Membri Total</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: theme.secondary, marginBottom: '0.25rem' }}>
                  {forumStats.totalTopics}
              </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontWeight: '500' }}>Topicuri</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: theme.accent, marginBottom: '0.25rem' }}>
                  {forumStats.totalPosts}
              </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontWeight: '500' }}>Postări</div>
            </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: theme.secondary, marginBottom: '0.25rem' }}>
                  {forumStats.onlineUsers + 3}
          </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontWeight: '500' }}>Online Acum</div>
            </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#7c3aed', marginBottom: '0.25rem' }}>
                  2,847
            </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontWeight: '500' }}>Record Online</div>
          </div>
        </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {/* Utilizatori Online */}
                <div>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    backgroundColor: theme.secondary,
                    borderRadius: '50%'
                  }} />
                  Utilizatori Online ({forumStats.onlineUsers + 3})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {[
                    { name: 'FishTrophyAdmin', rank: 'administrator' },
                    { name: 'ForumModerator', rank: 'moderator' },
                    { name: 'PescarExpert', rank: 'expert' },
                    { name: 'CrapMaster', rank: 'maestru' },
                    { name: 'TroutHunter', rank: 'pescar' },
                    { name: 'VIPAngler', rank: 'vip' },
                    { name: 'FeederPro', rank: 'expert' },
                    { name: 'SpinningAce', rank: 'pescar' },
                    { name: 'MomeliBoss', rank: 'maestru' },
                    { name: 'SnagovGuide', rank: 'expert' }
                  ].map((user) => (
                    <div
                      key={user.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.75rem',
                        padding: '0.375rem 0.5rem',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '0.375rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f9ff';
                        e.currentTarget.style.borderColor = '#bfdbfe';
                      }}
                    >
                      <span style={{ fontWeight: '500', color: '#1e40af' }}>{user.name}</span>
                      <span className={`user-rank rank-${user.rank}`} style={{ fontSize: '0.625rem' }}>
                        {user.rank}
                      </span>
                </div>
                  ))}
              </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                  Cei mai mulți utilizatori online: <strong>2,847</strong> (15 Aug 2024, 14:23)
              </div>
            </div>

              {/* Legendă Ranguri și Informații */}
            <div>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    backgroundColor: theme.accent,
                    borderRadius: '50%'
                  }} />
                  Ranguri pe Vechime Fish Trophy
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {[
                    { rank: 'pescar-nou', label: '🆕 Pescar Nou', desc: '0-1 lună', color: '#94a3b8' },
                    { rank: 'pescar-activ', label: '🎣 Pescar Activ', desc: '1-3 luni', color: '#059669' },
                    { rank: 'pescar-experimentat', label: '🐟 Pescar Experimentat', desc: '3-6 luni', color: '#0891b2' },
                    { rank: 'pescar-veteran', label: '🏆 Pescar Veteran', desc: '6-12 luni', color: '#d97706' },
                    { rank: 'pescar-senior', label: '👑 Pescar Senior', desc: '1-2 ani', color: '#dc2626' },
                    { rank: 'pescar-elite', label: '🌟 Pescar Elite', desc: '2-3 ani', color: '#7c3aed' },
                    { rank: 'maestru-pescar', label: '💎 Maestru Pescar', desc: '3+ ani', color: '#1e40af' },
                    { rank: 'legenda', label: '🔥 Legendă', desc: '5+ ani', color: '#ef4444' },
                    { rank: 'moderator', label: '🟣 Moderator', desc: 'Staff forum', color: '#7c3aed' },
                    { rank: 'administrator', label: '🔴 Administrator', desc: 'Fish Trophy Team', color: '#ef4444' },
                    { rank: 'vip', label: '🟡 VIP Member', desc: 'Membru premium', color: '#f59e0b' }
                  ].map((item) => (
                    <div key={item.rank} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        minWidth: '8rem',
                        color: item.color,
                        fontWeight: '600'
                      }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                        {item.desc}
                      </span>
                    </div>
                  ))}
            </div>

                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, lineHeight: '1.4' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Cel mai nou membru:</strong> DebutantFericit
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Total membri înregistrați:</strong> {forumStats.totalMembers.toLocaleString('ro-RO')}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Staff online:</strong> 2 (Admin + Moderator)
                  </div>
            <div>
                    <strong>Membri VIP activi:</strong> 1
                </div>
              </div>
            </div>
          </div>
              </div>
            </div>
          </div>
    </ForumLayout>
  );
}
