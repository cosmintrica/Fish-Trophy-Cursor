import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

import { useCategories } from '../hooks/useCategories';
import { useForumStats } from '../hooks/useForumStats';
import { useOnlineUsers } from '../hooks/useOnlineUsers';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import MobileOptimizedCategories from '../components/MobileOptimizedCategories';
import ForumSeeder from '../components/ForumSeeder';
import ActiveViewers from '../components/ActiveViewers';

export default function ForumHome() {
  const { forumUser, signOut } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Use Supabase categories
  const { categories, loading, error } = useCategories();
  
  // Real stats from database
  const { stats: forumStatsData, loading: statsLoading } = useForumStats();
  const { users: onlineUsers, loading: onlineUsersLoading } = useOnlineUsers();

  // Categories loaded

  // Real stats from database
  const forumStats = {
    totalTopics: forumStatsData?.total_topics || 0,
    totalPosts: forumStatsData?.total_posts || 0,
    totalMembers: forumStatsData?.total_users || 0,
    onlineUsers: forumStatsData?.online_users || 0
  };

  const handleLogin = () => {
    // Login handled by ForumLayout
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleSubcategoryClick = (subcategoryId: string) => {
    // subcategoryId este de fapt slug-ul acum - URL clean
    navigate(`/forum/${subcategoryId}`);
  };

  return (
    <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={handleLogin} onLogout={handleLogout} showWelcomeBanner={true}>
      {/* Main Content - Optimizat pentru mobil */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 0.75rem', width: '100%', overflowX: 'hidden' }}>


        {/* Mobile Optimized Forum Categories */}
        <MobileOptimizedCategories onSubcategoryClick={handleSubcategoryClick} />

        {/* Auto-Seeder for empty database */}
        <ForumSeeder />

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
                  {forumStats.onlineUsers}
                </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontWeight: '500' }}>Online Acum</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
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
                  Utilizatori Online ({forumStats.onlineUsers})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {onlineUsers.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Niciun utilizator online momentan</div>
                  ) : (
                    onlineUsers.map((user) => (
                      <div
                        key={user.id}
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
                          if (e.currentTarget) {
                            e.currentTarget.style.backgroundColor = '#dbeafe';
                            e.currentTarget.style.borderColor = '#3b82f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (e.currentTarget) {
                            e.currentTarget.style.backgroundColor = '#f0f9ff';
                            e.currentTarget.style.borderColor = '#bfdbfe';
                          }
                        }}
                      >
                        <span style={{ fontWeight: '500', color: '#1e40af' }}>{user.username}</span>
                        <span className={`user-rank rank-${user.rank}`} style={{ fontSize: '0.625rem' }}>
                          {user.rank}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                  {forumStatsData?.newest_user && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Cel mai nou membru:</strong> {forumStatsData.newest_user.username}
                    </div>
                  )}
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
                    { rank: 'ou_de_peste', label: '🥚 Ou de Pește', desc: '0-10 postări', color: '#9ca3af' },
                    { rank: 'puiet', label: '🐟 Puiet', desc: '11-50 postări', color: '#60a5fa' },
                    { rank: 'pui_de_crap', label: '🐠 Pui de Crap', desc: '51-100 postări', color: '#34d399' },
                    { rank: 'crap_junior', label: '🎣 Crap Junior', desc: '101-500 postări', color: '#fbbf24' },
                    { rank: 'crap_senior', label: '🏆 Crap Senior', desc: '501-1000 postări', color: '#fb923c' },
                    { rank: 'maestru_pescar', label: '💎 Maestru Pescar', desc: '1001-5000 postări', color: '#f472b6' },
                    { rank: 'legenda_apelor', label: '👑 Legenda Apelor', desc: '5001+ postări', color: '#a78bfa' }
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
                  {forumStatsData?.newest_user && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Cel mai nou membru:</strong> {forumStatsData.newest_user.username}
                    </div>
                  )}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Total membri înregistrați:</strong> {forumStats.totalMembers.toLocaleString('ro-RO')}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Utilizatori online:</strong> {forumStats.onlineUsers}
                  </div>
                  <div>
                    <strong>Total postări:</strong> {forumStats.totalPosts.toLocaleString('ro-RO')}
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
