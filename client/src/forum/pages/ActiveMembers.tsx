import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { supabase } from '../../lib/supabase';
import { User, MessageSquare, Award, TrendingUp, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useForumStats } from '../hooks/useForumStats';
import { MemberListSkeleton } from '../../components/skeletons/MemberSkeleton';

export default function ActiveMembers() {
  const { forumUser } = useAuth();
  const { theme } = useTheme();
  const [members, setMembers] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [stats, setStats] = useState({
    membersToday: 0,
    membersThisWeek: 0,
    mostActiveMember: null as { username: string; postCount: number } | null,
    totalReputation: 0
  });
  const { stats: forumStats } = useForumStats();

  const MEMBERS_PER_PAGE = 20;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadActiveMembers = async () => {
      try {
        setLoading(true);
        const offset = (currentPage - 1) * MEMBERS_PER_PAGE;

        // Get total count first
        const { count: totalCount } = await supabase
          .from('forum_users')
          .select('*', { count: 'exact', head: true });

        setTotalMembers(totalCount || 0);

        // Get forum_users data (paginated)
        const { data: forumUsersData, error: forumUsersError } = await supabase
          .from('forum_users')
          .select('user_id, username, avatar_url, post_count, topic_count, reputation_points, rank, last_seen_at, is_online, created_at')
          .order('post_count', { ascending: false })
          .range(offset, offset + MEMBERS_PER_PAGE - 1);

        if (forumUsersError) throw forumUsersError;

        // Get user IDs
        const userIds = [...new Set((forumUsersData || []).map(u => u.user_id))];

        // Get profiles data (photo_url - real profile picture)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, photo_url')
          .in('id', userIds);

        const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

        // Combine data
        const data = (forumUsersData || []).map(member => {
          const profile = profilesMap.get(member.user_id);
          const photoUrl = profile?.photo_url || member.avatar_url || null;

          return {
            ...member,
            photo_url: photoUrl,
            username: member.username || 'Anonim'
          };
        });

        setMembers(data || []);

        // Calculate additional statistics
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);

        // Get created_at from forum_users (reuse userIds from above)
        // Note: data is built from forumUsersData, so userIds already contains all needed IDs
        const { data: forumUsersWithDates } = await supabase
          .from('forum_users')
          .select('user_id, created_at, post_count')
          .in('user_id', userIds);

        const membersToday = forumUsersWithDates?.filter(u => {
          const created = new Date(u.created_at);
          return created >= todayStart;
        }).length || 0;

        const membersThisWeek = forumUsersWithDates?.filter(u => {
          const created = new Date(u.created_at);
          return created >= weekStart;
        }).length || 0;

        // Find most active member (by post_count)
        let mostActiveMember: { username: string; postCount: number } | null = null;
        data.forEach(member => {
          if (!mostActiveMember || (member.post_count || 0) > mostActiveMember.postCount) {
            mostActiveMember = {
              username: member.username,
              postCount: member.post_count || 0
            };
          }
        });

        // Calculate total reputation
        const totalReputation = data.reduce((sum, m) => sum + (m.reputation_points || 0), 0);

        setStats({
          membersToday,
          membersThisWeek,
          mostActiveMember,
          totalReputation
        });
      } catch (error) {
        console.error('Error loading active members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActiveMembers();
  }, [currentPage]);

  const getRankDisplay = (rank: string) => {
    const rankMap: Record<string, { label: string; emoji: string; color: string }> = {
      'ou_de_peste': { label: 'Ou de Pește', emoji: '🥚', color: '#9ca3af' },
      'puiet': { label: 'Puiet', emoji: '🐟', color: '#60a5fa' },
      'pui_de_crap': { label: 'Pui de Crap', emoji: '🐠', color: '#34d399' },
      'crap_junior': { label: 'Crap Junior', emoji: '🎣', color: '#fbbf24' },
      'crap_senior': { label: 'Crap Senior', emoji: '🏆', color: '#fb923c' },
      'maestru_pescar': { label: 'Maestru Pescar', emoji: '💎', color: '#f472b6' },
      'legenda_apelor': { label: 'Legenda Apelor', emoji: '👑', color: '#a78bfa' }
    };
    return rankMap[rank] || { label: rank, emoji: '🎣', color: theme.textSecondary };
  };

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

  const formatSmartDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();

    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (isToday) {
      return `Astăzi ${hours}:${minutes}`;
    } else {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }
  };

  return (
    <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isMobile ? '0.75rem 0.75rem' : '1rem 1rem',
        width: '100%',
        overflowX: 'hidden'
      }}>
        <h1 style={{
          fontSize: isMobile ? '1.25rem' : '1.75rem',
          fontWeight: '700',
          color: theme.text,
          marginBottom: isMobile ? '1rem' : '1.5rem'
        }}>
          👥 Membri Activi
        </h1>

        {loading ? (
          <MemberListSkeleton count={MEMBERS_PER_PAGE} />
        ) : members.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '2rem 1rem' : '4rem',
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👤</div>
            <div style={{ color: theme.textSecondary }}>Nu există membri înregistrați</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: isMobile ? '0.5rem' : '0.75rem'
          }}>
            {members.map((member) => {
              const rankInfo = getRankDisplay(member.rank || 'ou_de_peste');

              return (
                <div
                  key={member.user_id || member.id}
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: isMobile ? '0.375rem' : '0.5rem',
                    border: `1px solid ${theme.border}`,
                    padding: isMobile ? '0.75rem' : '1rem',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.primary;
                    e.currentTarget.style.boxShadow = `0 2px 4px rgba(0, 0, 0, 0.1)`;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Online Status Indicator - Top Right */}
                  {member.is_online && (
                    <div style={{
                      position: 'absolute',
                      top: isMobile ? '0.5rem' : '0.75rem',
                      right: isMobile ? '0.5rem' : '0.75rem',
                      width: isMobile ? '0.5rem' : '0.625rem',
                      height: isMobile ? '0.5rem' : '0.625rem',
                      backgroundColor: '#10b981',
                      borderRadius: '50%',
                      border: `2px solid ${theme.surface}`,
                      zIndex: 10,
                      boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)'
                    }} />
                  )}

                  {/* Header: Avatar + Username + Rank */}
                  <div style={{
                    display: 'flex',
                    gap: isMobile ? '0.5rem' : '0.75rem',
                    marginBottom: isMobile ? '0.5rem' : '0.75rem',
                    alignItems: 'center'
                  }}>
                    {/* Avatar - Real profile picture */}
                    <div style={{
                      width: isMobile ? '2.5rem' : '3rem',
                      height: isMobile ? '2.5rem' : '3rem',
                      borderRadius: '50%',
                      background: member.photo_url
                        ? `url(${member.photo_url}) center/cover`
                        : member.avatar_url
                          ? `url(${member.avatar_url}) center/cover`
                          : generateUserColor(member.username || 'User'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      fontWeight: '600',
                      flexShrink: 0,
                      border: `2px solid ${theme.border}`,
                      position: 'relative'
                    }}>
                      {!member.photo_url && !member.avatar_url &&
                        (member.username?.charAt(0).toUpperCase() || '?')}
                    </div>

                    {/* Username + Rank */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        to={`/forum/user/${member.username}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontWeight: '600',
                          color: theme.text,
                          fontSize: isMobile ? '0.875rem' : '1rem',
                          marginBottom: '0.125rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textDecoration: 'none',
                          display: 'block'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = theme.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = theme.text;
                        }}
                      >
                        {member.username}
                      </Link>
                      <div style={{
                        fontSize: isMobile ? '0.6875rem' : '0.75rem',
                        color: rankInfo.color,
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <span>{rankInfo.emoji}</span>
                        <span>{rankInfo.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid - Compact */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: isMobile ? '0.5rem' : '0.75rem',
                    padding: isMobile ? '0.5rem' : '0.75rem',
                    backgroundColor: theme.background,
                    borderRadius: '0.375rem',
                    marginBottom: isMobile ? '0.5rem' : '0.75rem'
                  }}>
                    {/* Postări */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        color: theme.textSecondary,
                        marginBottom: '0.125rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}>
                        <MessageSquare size={isMobile ? 12 : 14} />
                        <span>Postări</span>
                      </div>
                      <div style={{
                        fontSize: isMobile ? '1rem' : '1.125rem',
                        fontWeight: '700',
                        color: theme.text
                      }}>
                        {member.post_count || 0}
                      </div>
                    </div>

                    {/* Topicuri */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        color: theme.textSecondary,
                        marginBottom: '0.125rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}>
                        <User size={isMobile ? 12 : 14} />
                        <span>Topicuri</span>
                      </div>
                      <div style={{
                        fontSize: isMobile ? '1rem' : '1.125rem',
                        fontWeight: '700',
                        color: theme.text
                      }}>
                        {member.topic_count || 0}
                      </div>
                    </div>

                    {/* Reputație */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        color: theme.textSecondary,
                        marginBottom: '0.125rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}>
                        <Award size={isMobile ? 12 : 14} />
                        <span>Rep.</span>
                      </div>
                      <div style={{
                        fontSize: isMobile ? '1rem' : '1.125rem',
                        fontWeight: '700',
                        color: member.reputation_points >= 0 ? theme.primary : '#ef4444'
                      }}>
                        {member.reputation_points >= 0 ? '+' : ''}{member.reputation_points || 0}
                      </div>
                    </div>
                  </div>

                  {/* Last Seen - Compact */}
                  {member.last_seen_at && (
                    <div style={{
                      fontSize: isMobile ? '0.625rem' : '0.6875rem',
                      color: theme.textSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      paddingTop: isMobile ? '0.25rem' : '0.375rem',
                      borderTop: `1px solid ${theme.border}`
                    }}>
                      <Clock size={isMobile ? 9 : 10} />
                      <span>
                        {member.is_online ? (
                          <span style={{ color: '#10b981', fontWeight: '600' }}>Online acum</span>
                        ) : (
                          formatSmartDateTime(member.last_seen_at)
                        )}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && members.length > 0 && totalMembers > MEMBERS_PER_PAGE && (
          <div style={{
            marginTop: isMobile ? '1.5rem' : '2rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.75rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                backgroundColor: currentPage === 1 ? theme.surfaceHover : theme.surface,
                color: currentPage === 1 ? theme.textSecondary : theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.375rem',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'all 0.2s',
                opacity: currentPage === 1 ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (currentPage > 1) {
                  e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  e.currentTarget.style.borderColor = theme.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage > 1) {
                  e.currentTarget.style.backgroundColor = theme.surface;
                  e.currentTarget.style.borderColor = theme.border;
                }
              }}
            >
              <ChevronLeft size={isMobile ? 16 : 18} />
              <span>Anterior</span>
            </button>

            {/* Page Numbers */}
            <div style={{
              display: 'flex',
              gap: '0.25rem',
              alignItems: 'center'
            }}>
              {Array.from({ length: Math.min(5, Math.ceil(totalMembers / MEMBERS_PER_PAGE)) }, (_, i) => {
                const totalPages = Math.ceil(totalMembers / MEMBERS_PER_PAGE);
                let pageNum: number;

                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      minWidth: isMobile ? '2rem' : '2.5rem',
                      height: isMobile ? '2rem' : '2.5rem',
                      padding: '0.5rem',
                      backgroundColor: currentPage === pageNum ? theme.primary : theme.surface,
                      color: currentPage === pageNum ? 'white' : theme.text,
                      border: `1px solid ${currentPage === pageNum ? theme.primary : theme.border}`,
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      fontWeight: currentPage === pageNum ? '600' : '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== pageNum) {
                        e.currentTarget.style.backgroundColor = theme.surfaceHover;
                        e.currentTarget.style.borderColor = theme.primary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== pageNum) {
                        e.currentTarget.style.backgroundColor = theme.surface;
                        e.currentTarget.style.borderColor = theme.border;
                      }
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalMembers / MEMBERS_PER_PAGE), p + 1))}
              disabled={currentPage >= Math.ceil(totalMembers / MEMBERS_PER_PAGE)}
              style={{
                padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                backgroundColor: currentPage >= Math.ceil(totalMembers / MEMBERS_PER_PAGE) ? theme.surfaceHover : theme.surface,
                color: currentPage >= Math.ceil(totalMembers / MEMBERS_PER_PAGE) ? theme.textSecondary : theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.375rem',
                cursor: currentPage >= Math.ceil(totalMembers / MEMBERS_PER_PAGE) ? 'not-allowed' : 'pointer',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'all 0.2s',
                opacity: currentPage >= Math.ceil(totalMembers / MEMBERS_PER_PAGE) ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (currentPage < Math.ceil(totalMembers / MEMBERS_PER_PAGE)) {
                  e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  e.currentTarget.style.borderColor = theme.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage < Math.ceil(totalMembers / MEMBERS_PER_PAGE)) {
                  e.currentTarget.style.backgroundColor = theme.surface;
                  e.currentTarget.style.borderColor = theme.border;
                }
              }}
            >
              <span>Următor</span>
              <ChevronRight size={isMobile ? 16 : 18} />
            </button>
          </div>
        )}

        {/* Page Info */}
        {!loading && members.length > 0 && (
          <div style={{
            marginTop: isMobile ? '0.75rem' : '1rem',
            textAlign: 'center',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            color: theme.textSecondary
          }}>
            Afișând {members.length} din {totalMembers} membri
          </div>
        )}

        {/* Statistics Section - Bottom */}
        {!loading && members.length > 0 && (
          <div style={{
            marginTop: isMobile ? '1.5rem' : '2rem',
            padding: isMobile ? '1rem' : '1.5rem',
            backgroundColor: theme.surface,
            borderRadius: isMobile ? '0.5rem' : '0.75rem',
            border: `1px solid ${theme.border}`
          }}>
            <h2 style={{
              fontSize: isMobile ? '1rem' : '1.25rem',
              fontWeight: '600',
              color: theme.text,
              marginBottom: isMobile ? '1rem' : '1.5rem'
            }}>
              📊 Statistici Membri Activi
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? '0.75rem' : '1rem'
            }}>
              {/* Total Membri Afișați */}
              <div style={{
                textAlign: 'center',
                padding: isMobile ? '0.75rem' : '1rem',
                backgroundColor: theme.background,
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  color: theme.textSecondary,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}>
                  <Users size={isMobile ? 14 : 16} />
                  <span>Total Afișați</span>
                </div>
                <div style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '700',
                  color: theme.text
                }}>
                  {members.length}
                </div>
              </div>

              {/* Membri Noi Astăzi */}
              <div style={{
                textAlign: 'center',
                padding: isMobile ? '0.75rem' : '1rem',
                backgroundColor: theme.background,
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  color: theme.textSecondary,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}>
                  <Clock size={isMobile ? 14 : 16} />
                  <span>Noi Astăzi</span>
                </div>
                <div style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '700',
                  color: theme.primary
                }}>
                  {stats.membersToday}
                </div>
              </div>

              {/* Membri Noi Săptămâna Aceasta */}
              <div style={{
                textAlign: 'center',
                padding: isMobile ? '0.75rem' : '1rem',
                backgroundColor: theme.background,
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  color: theme.textSecondary,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}>
                  <TrendingUp size={isMobile ? 14 : 16} />
                  <span>Noi Săptămâna</span>
                </div>
                <div style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '700',
                  color: theme.secondary
                }}>
                  {stats.membersThisWeek}
                </div>
              </div>

              {/* Cel Mai Activ Membru */}
              {stats.mostActiveMember && (
                <div style={{
                  textAlign: 'center',
                  padding: isMobile ? '0.75rem' : '1rem',
                  backgroundColor: theme.background,
                  borderRadius: '0.5rem'
                }}>
                  <div style={{
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    color: theme.textSecondary,
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem'
                  }}>
                    <Award size={isMobile ? 14 : 16} />
                    <span>Cel Mai Activ</span>
                  </div>
                  <Link
                    to={`/forum/user/${stats.mostActiveMember.username}`}
                    style={{
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      fontWeight: '600',
                      color: theme.primary,
                      textDecoration: 'none',
                      display: 'block'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {stats.mostActiveMember.username}
                  </Link>
                  <div style={{
                    fontSize: isMobile ? '0.6875rem' : '0.75rem',
                    color: theme.textSecondary,
                    marginTop: '0.25rem'
                  }}>
                    {stats.mostActiveMember.postCount} postări
                  </div>
                </div>
              )}
            </div>

            {/* Forum-wide Stats */}
            {forumStats && (
              <div style={{
                marginTop: isMobile ? '1rem' : '1.5rem',
                paddingTop: isMobile ? '1rem' : '1.5rem',
                borderTop: `1px solid ${theme.border}`,
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: isMobile ? '0.75rem' : '1rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: isMobile ? '0.6875rem' : '0.75rem',
                    color: theme.textSecondary,
                    marginBottom: '0.25rem'
                  }}>
                    Total Membri
                  </div>
                  <div style={{
                    fontSize: isMobile ? '1rem' : '1.25rem',
                    fontWeight: '700',
                    color: theme.text
                  }}>
                    {forumStats.total_users.toLocaleString('ro-RO')}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: isMobile ? '0.6875rem' : '0.75rem',
                    color: theme.textSecondary,
                    marginBottom: '0.25rem'
                  }}>
                    Total Topicuri
                  </div>
                  <div style={{
                    fontSize: isMobile ? '1rem' : '1.25rem',
                    fontWeight: '700',
                    color: theme.text
                  }}>
                    {forumStats.total_topics.toLocaleString('ro-RO')}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: isMobile ? '0.6875rem' : '0.75rem',
                    color: theme.textSecondary,
                    marginBottom: '0.25rem'
                  }}>
                    Total Postări
                  </div>
                  <div style={{
                    fontSize: isMobile ? '1rem' : '1.25rem',
                    fontWeight: '700',
                    color: theme.text
                  }}>
                    {forumStats.total_posts.toLocaleString('ro-RO')}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: isMobile ? '0.6875rem' : '0.75rem',
                    color: theme.textSecondary,
                    marginBottom: '0.25rem'
                  }}>
                    Online Acum
                  </div>
                  <div style={{
                    fontSize: isMobile ? '1rem' : '1.25rem',
                    fontWeight: '700',
                    color: '#10b981'
                  }}>
                    {forumStats.online_users}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ForumLayout>
  );
}
