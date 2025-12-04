/**
 * Forum User Profile Page
 * Displays user profile with header, tabs, and detailed information
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/query-client';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { getUserReputationLogs } from '../../services/forum/reputation';
import { getAllUserRestrictions } from '../../services/forum/moderation';
import {
  User,
  Award,
  MessageSquare,
  TrendingUp,
  Shield,
  ShoppingBag,
  Calendar,
  Clock,
  Trophy,
  Activity,
  ChevronDown,
  Fish,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  CheckCircle,
  X
} from 'lucide-react';

interface ForumUserProfileData {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  signature?: string;
  post_count: number;
  topic_count: number;
  reputation_points: number;
  reputation_power: number;
  rank: string;
  badges: string[];
  is_online: boolean;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export default function ForumUserProfile() {
  const { username } = useParams<{ username: string }>();
  const { theme } = useTheme();
  const { forumUser: currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'posts' | 'reputation' | 'sanctions' | 'marketplace'>('info');
  const [showMobileTabMenu, setShowMobileTabMenu] = useState(false);

  // Detect mobile screen size
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!showMobileTabMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-mobile-tab-menu]')) {
        setShowMobileTabMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileTabMenu]);

  const handleLogin = () => {
    // Login handled by ForumLayout
  };

  const handleLogout = async () => {
    await signOut();
  };

  // Fetch user profile data by username
  const { data: userProfile, isLoading, error } = useQuery<ForumUserProfileData>({
    queryKey: queryKeys.forumUserProfile(username || ''),
    queryFn: async () => {
      if (!username) throw new Error('Username is required');

      // No need to check for category/subcategory conflicts anymore
      // The /user/ prefix in the route ensures this is always a user profile
      
      // Fetch by username (case-insensitive)
      const { data: userByUsername, error: errorByUsername } = await supabase
        .from('forum_users')
        .select('*')
        .ilike('username', username)
        .maybeSingle();

      if (errorByUsername) {
        throw new Error(errorByUsername.message);
      }

      if (!userByUsername) {
        throw new Error('User not found');
      }

      return userByUsername;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


  // Get rank icon helper
  const getRankIcon = (rank: string) => {
    const rankIcons: { [key: string]: string } = {
      'ou_de_peste': '🥚',
      'pui_de_peste': '🐟',
      'pescar_incepator': '🎣',
      'pescar_experimentat': '🐠',
      'pescar_expert': '🦈',
      'maestru_pescuit': '👑',
    };
    return rankIcons[rank] || '🎣';
  };

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format relative time helper
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Niciodată';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Acum';
    if (diffMins < 60) return `Acum ${diffMins} min`;
    if (diffHours < 24) return `Acum ${diffHours} ore`;
    if (diffDays < 7) return `Acum ${diffDays} zile`;
    return formatDate(dateString);
  };

  // Fără loading - afișăm direct conținutul (datele se încarcă în background)

  if (error || !userProfile) {

    return (
      <ForumLayout
        user={forumUserToLayoutUser(currentUser)}
        onLogin={handleLogin}
        onLogout={handleLogout}
      >
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          color: theme.textSecondary
        }}>
          <div>Eroare la încărcarea profilului: {error?.message || 'Utilizatorul nu a fost găsit'}</div>
          <button
            onClick={() => navigate('/forum')}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Înapoi la Forum
          </button>
        </div>
      </ForumLayout>
    );
  }

  const isOwnProfile = currentUser?.id === userProfile.user_id;

  return (
    <ForumLayout
      user={forumUserToLayoutUser(currentUser)}
      onLogin={handleLogin}
      onLogout={handleLogout}
    >
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Header Profil - Compact și Mobile-Friendly */}
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: 'clamp(0.75rem, 2vw, 1rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {/* Top Section: Avatar, Username, Rank - Compact */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            {/* Avatar - Mai mic pe mobile */}
            <div style={{
              width: 'clamp(60px, 12vw, 80px)',
              height: 'clamp(60px, 12vw, 80px)',
              borderRadius: '50%',
              background: userProfile.avatar_url
                ? `url(${userProfile.avatar_url}) center/cover`
                : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: '700',
              border: `2px solid ${theme.border}`,
              flexShrink: 0
            }}>
              {!userProfile.avatar_url && (
                userProfile.username.charAt(0).toUpperCase()
              )}
            </div>

            {/* Username and Rank - Compact */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginBottom: '0.25rem'
              }}>
                <h1 style={{
                  fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                  fontWeight: '700',
                  color: theme.text,
                  margin: 0,
                  lineHeight: '1.2'
                }}>
                  {userProfile.username}
                </h1>
                <span style={{
                  fontSize: 'clamp(1rem, 2.5vw, 1.25rem)'
                }}>
                  {getRankIcon(userProfile.rank)}
                </span>
                <span style={{
                  fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                  color: theme.textSecondary,
                  fontWeight: '500'
                }}>
                  {userProfile.rank.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                {userProfile.is_online && (
                  <span style={{
                    fontSize: '0.625rem',
                    color: '#10b981',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981'
                    }} />
                    Online
                  </span>
                )}
              </div>

              {/* Signature - Compact */}
              {userProfile.signature && (
                <div style={{
                  fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                  color: theme.textSecondary,
                  fontStyle: 'italic',
                  marginTop: '0.25rem',
                  lineHeight: '1.3'
                }}>
                  {userProfile.signature}
                </div>
              )}
            </div>
          </div>

          {/* Stats Section: Reputation, Power, Posts, Topics - Compact Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: `1px solid ${theme.border}`
          }}>
            {/* Reputație Totală */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: theme.textSecondary,
                fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)'
              }}>
                <Award size={12} />
                <span>Rep.</span>
              </div>
              <div style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                fontWeight: '700',
                color: theme.text
              }}>
                {userProfile.reputation_points.toLocaleString('ro-RO')}
              </div>
            </div>

            {/* Putere Reputație */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: theme.textSecondary,
                fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)'
              }}>
                <TrendingUp size={12} />
                <span>Putere</span>
              </div>
              <div style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                fontWeight: '700',
                color: theme.primary
              }}>
                {userProfile.reputation_power}/7
              </div>
            </div>

            {/* Postări */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: theme.textSecondary,
                fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)'
              }}>
                <MessageSquare size={12} />
                <span>Post.</span>
              </div>
              <div style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                fontWeight: '700',
                color: theme.text
              }}>
                {userProfile.post_count.toLocaleString('ro-RO')}
              </div>
            </div>

            {/* Topicuri */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: theme.textSecondary,
                fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)'
              }}>
                <Activity size={12} />
                <span>Top.</span>
              </div>
              <div style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                fontWeight: '700',
                color: theme.text
              }}>
                {userProfile.topic_count.toLocaleString('ro-RO')}
              </div>
            </div>
          </div>

          {/* Badges Section - Compact */}
          {userProfile.badges && userProfile.badges.length > 0 && (
            <div style={{
              paddingTop: '0.75rem',
              borderTop: `1px solid ${theme.border}`
            }}>
              <div style={{
                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                color: theme.textSecondary,
                marginBottom: '0.5rem',
                fontWeight: '500'
              }}>
                Badge-uri:
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.375rem'
              }}>
                {userProfile.badges.map((badge, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '0.125rem 0.5rem',
                      backgroundColor: theme.primary + '20',
                      color: theme.primary,
                      borderRadius: '9999px',
                      fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
                      fontWeight: '600'
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs Navigation - Desktop: Tabs, Mobile: Dropdown */}
        {!isMobile ? (
          /* Desktop Tabs - Full Labels */
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: `2px solid ${theme.border}`,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {(['info', 'posts', 'reputation', 'sanctions', 'marketplace'] as const).map((tab) => {
              const tabConfig = {
                info: { label: 'Informații', icon: User },
                posts: { label: 'Postări', icon: MessageSquare },
                reputation: { label: 'Reputație', icon: Award },
                sanctions: { label: 'Sancțiuni', icon: Shield },
                marketplace: { label: 'Piață', icon: ShoppingBag }
              }[tab];

              const Icon = tabConfig.icon;
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? theme.primary : 'transparent'}`,
                    color: isActive ? theme.primary : theme.textSecondary,
                    fontSize: '0.875rem',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    marginBottom: '-2px',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = theme.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = theme.textSecondary;
                    }
                  }}
                >
                  <Icon size={16} />
                  <span>{tabConfig.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Mobile Dropdown */
          <div style={{ position: 'relative' }} data-mobile-tab-menu>
            <button
              onClick={() => setShowMobileTabMenu(!showMobileTabMenu)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                color: theme.text,
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {{
                  info: <User size={16} />,
                  posts: <MessageSquare size={16} />,
                  reputation: <Award size={16} />,
                  sanctions: <Shield size={16} />,
                  marketplace: <ShoppingBag size={16} />
                }[activeTab]}
                <span>
                  {{
                    info: 'Informații',
                    posts: 'Postări',
                    reputation: 'Reputație',
                    sanctions: 'Sancțiuni',
                    marketplace: 'Piață'
                  }[activeTab]}
                </span>
              </div>
              <ChevronDown
                size={16}
                style={{
                  transform: showMobileTabMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            </button>

            {showMobileTabMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 50,
                overflow: 'hidden'
              }}>
                {(['info', 'posts', 'reputation', 'sanctions', 'marketplace'] as const).map((tab) => {
                  const tabConfig = {
                    info: { label: 'Informații', icon: User },
                    posts: { label: 'Postări', icon: MessageSquare },
                    reputation: { label: 'Reputație', icon: Award },
                    sanctions: { label: 'Sancțiuni', icon: Shield },
                    marketplace: { label: 'Piață', icon: ShoppingBag }
                  }[tab];

                  const Icon = tabConfig.icon;
                  const isActive = activeTab === tab;

                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setShowMobileTabMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        backgroundColor: isActive ? theme.primary + '20' : 'transparent',
                        border: 'none',
                        color: isActive ? theme.primary : theme.text,
                        fontSize: '0.875rem',
                        fontWeight: isActive ? '600' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        textAlign: 'left',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Icon size={16} />
                      <span>{tabConfig.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content - Compact */}
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: 'clamp(0.75rem, 2vw, 1rem)',
          minHeight: '300px'
        }}>
          {activeTab === 'info' && (
            <GeneralInfoTab 
              userId={userProfile.user_id}
              userProfile={userProfile}
              theme={theme}
              isMobile={isMobile}
            />
          )}
          {activeTab === 'posts' && (
            <PostsHistoryTab 
              userId={userProfile.user_id}
              theme={theme}
              isMobile={isMobile}
            />
          )}
          {activeTab === 'reputation' && (
            <ReputationHistoryTab 
              userId={userProfile.user_id}
              theme={theme}
              isMobile={isMobile}
            />
          )}
          {activeTab === 'sanctions' && (
            <SanctionsTab
              userId={userProfile.user_id}
              theme={theme}
              isMobile={isMobile}
            />
          )}
          {activeTab === 'marketplace' && (
            <MarketplaceTab
              userId={userProfile.user_id}
              theme={theme}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>
    </ForumLayout>
  );
}

// General Info Tab Component
function GeneralInfoTab({ 
  userId, 
  userProfile, 
  theme, 
  isMobile 
}: { 
  userId: string; 
  userProfile: ForumUserProfileData; 
  theme: any; 
  isMobile: boolean;
}) {
  // Fetch records count
  const { data: recordsCount = 0 } = useQuery({
    queryKey: ['user-records-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // Fetch gear count
  const { data: gearCount = 0 } = useQuery({
    queryKey: ['user-gear-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('user_gear')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // Format date helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format last seen
  const formatLastSeen = (lastSeenAt: string | undefined) => {
    if (!lastSeenAt) return 'Niciodată';
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Acum';
    if (diffMins < 60) return `Acum ${diffMins} min`;
    if (diffHours < 24) return `Acum ${diffHours} ${diffHours === 1 ? 'oră' : 'ore'}`;
    if (diffDays < 7) return `Acum ${diffDays} ${diffDays === 1 ? 'zi' : 'zile'}`;
    return formatDate(lastSeenAt);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '1rem' : '1.5rem'
    }}>
      {/* Section Title */}
      <h2 style={{
        fontSize: isMobile ? '1rem' : '1.25rem',
        fontWeight: '600',
        color: theme.text,
        margin: 0,
        paddingBottom: '0.75rem',
        borderBottom: `1px solid ${theme.border}`
      }}>
        Informații Generale
      </h2>

      {/* Info Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: isMobile ? '0.75rem' : '1rem'
      }}>
        {/* Data Înregistrării */}
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          backgroundColor: theme.background,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            color: theme.textSecondary,
            fontSize: isMobile ? '0.75rem' : '0.875rem'
          }}>
            <Calendar size={isMobile ? 14 : 16} />
            <span>Data Înregistrării</span>
          </div>
          <div style={{
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: '600',
            color: theme.text
          }}>
            {formatDate(userProfile.created_at)}
          </div>
        </div>

        {/* Ultima Activitate */}
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          backgroundColor: theme.background,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            color: theme.textSecondary,
            fontSize: isMobile ? '0.75rem' : '0.875rem'
          }}>
            <Clock size={isMobile ? 14 : 16} />
            <span>Ultima Activitate</span>
          </div>
          <div style={{
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: '600',
            color: theme.text
          }}>
            {formatLastSeen(userProfile.last_seen_at)}
          </div>
        </div>

        {/* Postări Totale */}
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          backgroundColor: theme.background,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            color: theme.textSecondary,
            fontSize: isMobile ? '0.75rem' : '0.875rem'
          }}>
            <MessageSquare size={isMobile ? 14 : 16} />
            <span>Postări Totale</span>
          </div>
          <div style={{
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: '600',
            color: theme.text
          }}>
            {userProfile.post_count.toLocaleString('ro-RO')}
          </div>
        </div>

        {/* Topicuri Create */}
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          backgroundColor: theme.background,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            color: theme.textSecondary,
            fontSize: isMobile ? '0.75rem' : '0.875rem'
          }}>
            <Activity size={isMobile ? 14 : 16} />
            <span>Topicuri Create</span>
          </div>
          <div style={{
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: '600',
            color: theme.text
          }}>
            {userProfile.topic_count.toLocaleString('ro-RO')}
          </div>
        </div>

        {/* Echipamente */}
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          backgroundColor: theme.background,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            color: theme.textSecondary,
            fontSize: isMobile ? '0.75rem' : '0.875rem'
          }}>
            <Trophy size={isMobile ? 14 : 16} />
            <span>Echipamente</span>
          </div>
          <div style={{
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: '600',
            color: theme.text
          }}>
            {gearCount.toLocaleString('ro-RO')}
          </div>
        </div>

        {/* Recorduri */}
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          backgroundColor: theme.background,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            color: theme.textSecondary,
            fontSize: isMobile ? '0.75rem' : '0.875rem'
          }}>
            <Fish size={isMobile ? 14 : 16} />
            <span>Recorduri</span>
          </div>
          <div style={{
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: '600',
            color: theme.text
          }}>
            {recordsCount.toLocaleString('ro-RO')}
          </div>
        </div>
      </div>
    </div>
  );
}

// Posts History Tab Component
function PostsHistoryTab({ 
  userId, 
  theme, 
  isMobile 
}: { 
  userId: string; 
  theme: any; 
  isMobile: boolean;
}) {
  const [filter, setFilter] = useState<'topics' | 'replies' | 'mentions' | 'quotes'>('topics');
  const [isMobileState, setIsMobileState] = useState(isMobile);

  useEffect(() => {
    const checkMobile = () => setIsMobileState(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch user posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      const { data: postsData, error } = await supabase
        .from('forum_posts')
        .select(`
          id,
          content,
          created_at,
          topic_id,
          post_number,
          topic:forum_topics!topic_id(
            id,
            title,
            slug,
            user_id,
            subcategory_id,
            subcategory:forum_subcategories!subcategory_id(
              slug,
              category_id,
              category:forum_categories!category_id(slug)
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get subcategory and category slugs for all posts
      const subcategoryIds = [...new Set((postsData || []).map(p => {
        const topic = Array.isArray(p.topic) ? p.topic[0] : p.topic;
        return topic?.subcategory_id;
      }).filter(Boolean))];

      const { data: subcategoriesData } = await supabase
        .from('forum_subcategories')
        .select('id, slug, category_id')
        .in('id', subcategoryIds);

      const subcategoriesMap = new Map((subcategoriesData || []).map(sc => [sc.id, sc]));
      
      const categoryIds = [...new Set((subcategoriesData || []).map(sc => sc.category_id).filter(Boolean))];
      const { data: categoriesData } = await supabase
        .from('forum_categories')
        .select('id, slug')
        .in('id', categoryIds);
      
      const categoriesMap = new Map((categoriesData || []).map(c => [c.id, c]));

      // Process posts and determine if they're topic creators or replies
      const processedPosts = (postsData || []).map(post => {
        const topic = Array.isArray(post.topic) ? post.topic[0] : post.topic;
        const subcategory = topic?.subcategory_id ? subcategoriesMap.get(topic.subcategory_id) : null;
        const category = subcategory?.category_id ? categoriesMap.get(subcategory.category_id) : null;
        
        // Check if this is the first post in the topic (topic creator)
        // A topic creator is the user who created the topic AND has post_number === 1
        const isTopicCreator = topic?.user_id === userId && post.post_number === 1;

        return {
          ...post,
          topic: topic,
          categorySlug: category?.slug || null,
          subcategorySlug: subcategory?.slug || null,
          isTopicCreator
        };
      });

      return processedPosts;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });

  // Calculate counts for each filter type
  const filterCounts = useMemo(() => {
    const topicsCount = posts.filter(post => post.isTopicCreator).length;
    const repliesCount = posts.filter(post => !post.isTopicCreator).length;
    const mentionsCount = 0; // TODO: Implement when @username feature is ready
    const quotesCount = 0; // TODO: Implement when quote feature is ready
    
    return {
      topics: topicsCount,
      replies: repliesCount,
      mentions: mentionsCount,
      quotes: quotesCount
    };
  }, [posts]);

  // Filter posts based on selected filter
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (filter === 'topics') return post.isTopicCreator;
      if (filter === 'replies') return !post.isTopicCreator;
      if (filter === 'mentions') {
        // TODO: Implement mentions filter when @username feature is ready
        return false;
      }
      if (filter === 'quotes') {
        // TODO: Implement quotes filter when quote feature is ready
        return false;
      }
      return true; // 'all'
    });
  }, [posts, filter]);

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Acum';
    if (diffMins < 60) return `Acum ${diffMins} min`;
    if (diffHours < 24) return `Acum ${diffHours} ${diffHours === 1 ? 'oră' : 'ore'}`;
    if (diffDays < 7) return `Acum ${diffDays} ${diffDays === 1 ? 'zi' : 'zile'}`;
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Truncate content
  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Build topic URL
  const buildTopicUrl = (post: any) => {
    if (!post.topic || !post.subcategorySlug || !post.categorySlug) return '#';
    const topic = Array.isArray(post.topic) ? post.topic[0] : post.topic;
    if (!topic?.slug) return '#';
    return `/forum/${post.categorySlug}/${post.subcategorySlug}/${topic.slug}${post.post_number ? `#post_${post.post_number}` : ''}`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: isMobileState ? '1rem' : '1.5rem'
    }}>
      {/* Filter Buttons */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        paddingBottom: '0.75rem',
        borderBottom: `1px solid ${theme.border}`
      }}>
        {(['topics', 'replies', 'mentions', 'quotes'] as const).map((filterType) => {
          const labels = {
            topics: 'Topicuri Create',
            replies: 'Răspunsuri',
            mentions: 'Mentiuni',
            quotes: 'Citări'
          };
          const isActive = filter === filterType;
          const count = filterCounts[filterType];
          
          return (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              style={{
                padding: isMobileState ? '0.5rem 0.75rem' : '0.625rem 1rem',
                backgroundColor: isActive ? theme.primary : theme.surface,
                color: isActive ? 'white' : theme.text,
                border: `1px solid ${isActive ? theme.primary : theme.border}`,
                borderRadius: '0.375rem',
                fontSize: isMobileState ? '0.75rem' : '0.875rem',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  e.currentTarget.style.borderColor = theme.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = theme.surface;
                  e.currentTarget.style.borderColor = theme.border;
                }
              }}
            >
              {labels[filterType]} ({count})
            </button>
          );
        })}
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: theme.textSecondary
        }}>
          Se încarcă postările...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: theme.textSecondary
        }}>
          {filter === 'topics' ? 'Nu există topicuri create' : 
           filter === 'replies' ? 'Nu există răspunsuri' :
           filter === 'mentions' ? 'Nu există mențiuni (funcție în dezvoltare)' :
           'Nu există citări (funcție în dezvoltare)'}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobileState ? '0.75rem' : '1rem'
        }}>
          {filteredPosts.map((post) => {
            const topic = Array.isArray(post.topic) ? post.topic[0] : post.topic;
            const topicUrl = buildTopicUrl(post);

            return (
              <Link
                key={post.id}
                to={topicUrl}
                style={{
                  display: 'block',
                  padding: isMobileState ? '0.75rem' : '1rem',
                  backgroundColor: theme.background,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  e.currentTarget.style.borderColor = theme.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.background;
                  e.currentTarget.style.borderColor = theme.border;
                }}
              >
                {/* Topic Title and Type Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <h3 style={{
                    fontSize: isMobileState ? '0.875rem' : '1rem',
                    fontWeight: '600',
                    color: theme.text,
                    margin: 0,
                    flex: 1,
                    minWidth: 0
                  }}>
                    {topic?.title || 'Topic șters'}
                  </h3>
                  {post.isTopicCreator && (
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      backgroundColor: theme.primary + '20',
                      color: theme.primary,
                      borderRadius: '9999px',
                      fontSize: isMobileState ? '0.625rem' : '0.75rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>
                      Topic Creat
                    </span>
                  )}
                </div>

                {/* Post Content Preview */}
                <div style={{
                  fontSize: isMobileState ? '0.75rem' : '0.875rem',
                  color: theme.textSecondary,
                  marginBottom: '0.5rem',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}>
                  {truncateContent(post.content || '')}
                </div>

                {/* Post Meta */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobileState ? '0.5rem' : '0.75rem',
                  fontSize: isMobileState ? '0.625rem' : '0.75rem',
                  color: theme.textSecondary,
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} />
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  {post.post_number && (
                    <>
                      <span>•</span>
                      <span>Post #{post.post_number}</span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Reputation History Tab Component
function ReputationHistoryTab({ 
  userId, 
  theme, 
  isMobile 
}: { 
  userId: string; 
  theme: any; 
  isMobile: boolean;
}) {
  // Fetch reputation logs (RLS will limit to last 10 for non-admins)
  const { data: reputationData, isLoading } = useQuery({
    queryKey: ['user-reputation-logs', userId],
    queryFn: async () => {
      const result = await getUserReputationLogs(userId, 10);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data?.data || [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000
  });

  const logs = reputationData || [];

  // Calculate cumulative reputation over time for chart
  const chartData = useMemo(() => {
    if (logs.length === 0) return [];
    
    // Sort by date ascending for cumulative calculation
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let cumulative = 0;
    return sortedLogs.map(log => {
      cumulative += log.points;
      return {
        date: new Date(log.created_at),
        points: log.points,
        cumulative
      };
    });
  }, [logs]);

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Acum';
    if (diffMins < 60) return `Acum ${diffMins} min`;
    if (diffHours < 24) return `Acum ${diffHours} ${diffHours === 1 ? 'oră' : 'ore'}`;
    if (diffDays < 7) return `Acum ${diffDays} ${diffDays === 1 ? 'zi' : 'zile'}`;
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get max/min for chart scaling
  const maxCumulative = chartData.length > 0 
    ? Math.max(...chartData.map(d => d.cumulative), 0) 
    : 0;
  const minCumulative = chartData.length > 0 
    ? Math.min(...chartData.map(d => d.cumulative), 0) 
    : 0;
  const chartRange = maxCumulative - minCumulative || 1;

  // Fără loading - afișăm direct conținutul (datele se încarcă în background)

  if (logs.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        color: theme.textSecondary 
      }}>
        <Award size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
        <p>Nu există istoric reputație disponibil.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '1rem' : '1.5rem'
    }}>
      {/* Section Title */}
      <h2 style={{
        fontSize: isMobile ? '1rem' : '1.25rem',
        fontWeight: '600',
        color: theme.text,
        margin: 0,
        paddingBottom: '0.75rem',
        borderBottom: `1px solid ${theme.border}`
      }}>
        Istoric Reputație (Ultimele 10)
      </h2>

      {/* Chart - Simple Bar Chart */}
      {chartData.length > 0 && (
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          backgroundColor: theme.background,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            color: theme.textSecondary,
            marginBottom: '0.75rem',
            fontWeight: '500'
          }}>
            Evoluție Reputație
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.25rem',
            minHeight: '120px',
            paddingTop: '0.5rem',
            paddingBottom: '3rem',
            position: 'relative',
            marginBottom: '1rem'
          }}>
            {chartData.map((data, index) => {
              // Calculate bar height in pixels (not percentage)
              // Use the full height (120px - padding) for scaling
              const availableHeight = 110; // 120px - 10px padding
              const barHeightPx = chartRange > 0 
                ? Math.max(((data.cumulative - minCumulative) / chartRange) * availableHeight, 4)
                : 4;
              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    minHeight: '100%',
                    justifyContent: 'flex-end',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${barHeightPx}px`,
                      backgroundColor: data.cumulative >= 0 ? '#10b981' : '#ef4444',
                      borderRadius: '0.25rem 0.25rem 0 0',
                      minHeight: '4px',
                      transition: 'all 0.3s',
                      flexShrink: 0
                    }}
                    title={`${data.cumulative >= 0 ? '+' : ''}${data.cumulative}`}
                  />
                  <div style={{
                    fontSize: '0.625rem',
                    color: theme.textSecondary,
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                    textAlign: 'center',
                    width: '100%',
                    paddingTop: '0.25rem',
                    minHeight: '2.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    lineHeight: '1.2',
                    position: 'absolute',
                    bottom: '-2.5rem',
                    left: 0,
                    right: 0
                  }}>
                    <div style={{
                      transform: isMobile ? 'none' : 'rotate(-45deg)',
                      transformOrigin: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      {data.date.toLocaleDateString('ro-RO', { 
                        day: '2-digit', 
                        month: '2-digit'
                      })}
                      <br />
                      {data.date.toLocaleTimeString('ro-RO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reputation Logs List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {logs.map((log) => {
          const isPositive = log.points > 0;
          const isAdminAward = log.is_admin_award;

          return (
            <div
              key={log.id}
              style={{
                padding: isMobile ? '0.75rem' : '1rem',
                backgroundColor: theme.background,
                borderRadius: '0.5rem',
                border: `1px solid ${theme.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              {/* Header: Points, Giver, Date */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flex: 1,
                  minWidth: 0
                }}>
                  {/* Points Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: isPositive 
                      ? (isAdminAward ? '#3b82f6' : '#10b981') + '20'
                      : '#ef4444' + '20',
                    color: isPositive 
                      ? (isAdminAward ? '#3b82f6' : '#10b981')
                      : '#ef4444',
                    borderRadius: '0.375rem',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: '700',
                    flexShrink: 0
                  }}>
                    {isPositive ? (
                      <ArrowUp size={isMobile ? 12 : 14} />
                    ) : (
                      <ArrowDown size={isMobile ? 12 : 14} />
                    )}
                    {isPositive ? '+' : ''}{log.points}
                  </div>

                  {/* Giver Username */}
                  <div style={{
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    color: theme.text,
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    de la {log.giver_username || 'Utilizator necunoscut'}
                    {isAdminAward && (
                      <span style={{
                        marginLeft: '0.25rem',
                        fontSize: '0.625rem',
                        color: '#3b82f6',
                        fontWeight: '600'
                      }}>
                        (Admin)
                      </span>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div style={{
                  fontSize: isMobile ? '0.625rem' : '0.75rem',
                  color: theme.textSecondary,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  {formatRelativeTime(log.created_at)}
                </div>
              </div>

              {/* Comment */}
              {log.comment && (
                <div style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  color: theme.textSecondary,
                  fontStyle: 'italic',
                  paddingLeft: '0.5rem',
                  borderLeft: `2px solid ${theme.border}`
                }}>
                  "{log.comment}"
                </div>
              )}

              {/* Post Link */}
              {log.post_id && log.post_title && (
                <Link
                  to={`/forum/topic/${log.post_id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    color: theme.primary,
                    textDecoration: 'none',
                    marginTop: '0.25rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  <ExternalLink size={12} />
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: isMobile ? '200px' : '400px'
                  }}>
                    {log.post_title}
                  </span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sanctions Tab Component
function SanctionsTab({ 
  userId, 
  theme, 
  isMobile 
}: { 
  userId: string; 
  theme: any; 
  isMobile: boolean;
}) {
  // Fetch all restrictions (active + history)
  const { data: restrictionsData, isLoading } = useQuery({
    queryKey: ['user-restrictions', userId],
    queryFn: async () => {
      const result = await getAllUserRestrictions(userId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data || [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000
  });

  const restrictions = restrictionsData || [];

  // Get usernames for applied_by and deactivated_by
  const { data: usernamesMap } = useQuery({
    queryKey: ['restrictions-usernames', restrictions.map(r => r.issued_by).filter(Boolean)],
    queryFn: async () => {
      const userIds = [...new Set([
        ...restrictions.map(r => r.issued_by).filter(Boolean),
        ...restrictions.map(r => (r as any).deactivated_by).filter(Boolean)
      ])] as string[];

      if (userIds.length === 0) return new Map();

      const { data: usersData } = await supabase
        .from('forum_users')
        .select('user_id, username')
        .in('user_id', userIds);

      const map = new Map<string, string>();
      if (usersData) {
        usersData.forEach(u => map.set(u.user_id, u.username));
      }
      return map;
    },
    enabled: restrictions.length > 0,
    staleTime: 5 * 60 * 1000
  });

  const getRestrictionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'mute': 'Mute',
      'view_ban': 'Ban Vizualizare',
      'shadow_ban': 'Shadow Ban',
      'temp_ban': 'Ban Temporar',
      'permanent_ban': 'Ban Permanent'
    };
    return labels[type] || type;
  };

  const getRestrictionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'mute': '#f59e0b',
      'view_ban': '#ef4444',
      'shadow_ban': '#8b5cf6',
      'temp_ban': '#dc2626',
      'permanent_ban': '#991b1b'
    };
    return colors[type] || theme.textSecondary;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeRestrictions = restrictions.filter(r => r.is_active);
  const historyRestrictions = restrictions.filter(r => !r.is_active);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: theme.textSecondary }}>
        Se încarcă...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Active Restrictions */}
      {activeRestrictions.length > 0 && (
        <div>
          <h3 style={{
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: '600',
            color: theme.text,
            marginBottom: '0.75rem'
          }}>
            Restricții Active
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeRestrictions.map((restriction) => {
              const appliedByUsername = restriction.issued_by && usernamesMap?.get(restriction.issued_by);
              const isExpired = restriction.expires_at && new Date(restriction.expires_at) < new Date();
              
              return (
                <div
                  key={restriction.id}
                  style={{
                    padding: isMobile ? '0.75rem' : '1rem',
                    backgroundColor: theme.surface,
                    border: `1px solid ${getRestrictionTypeColor(restriction.restriction_type)}`,
                    borderRadius: '0.5rem',
                    borderLeftWidth: '4px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <Shield size={isMobile ? 16 : 18} color={getRestrictionTypeColor(restriction.restriction_type)} />
                    <span style={{
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      fontWeight: '600',
                      color: getRestrictionTypeColor(restriction.restriction_type)
                    }}>
                      {getRestrictionTypeLabel(restriction.restriction_type)}
                    </span>
                    {isExpired && (
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        backgroundColor: theme.error + '20',
                        color: theme.error,
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        Expirat
                      </span>
                    )}
                  </div>
                  
                  {restriction.reason && (
                    <div style={{
                      fontSize: isMobile ? '0.8125rem' : '0.875rem',
                      color: theme.text,
                      marginBottom: '0.5rem',
                      lineHeight: '1.5'
                    }}>
                      <strong>Motiv:</strong> {restriction.reason}
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    fontSize: isMobile ? '0.75rem' : '0.8125rem',
                    color: theme.textSecondary
                  }}>
                    <div>
                      <strong>Aplicat la:</strong> {formatDate(restriction.created_at)}
                    </div>
                    {appliedByUsername && (
                      <div>
                        <strong>Aplicat de:</strong> {appliedByUsername}
                      </div>
                    )}
                    {restriction.expires_at ? (
                      <div>
                        <strong>Expiră la:</strong> {formatDate(restriction.expires_at)}
                      </div>
                    ) : (
                      <div>
                        <strong>Durată:</strong> Permanentă
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h3 style={{
          fontSize: isMobile ? '1rem' : '1.125rem',
          fontWeight: '600',
          color: theme.text,
          marginBottom: '0.75rem'
        }}>
          Istoric Restricții {historyRestrictions.length > 0 && `(${historyRestrictions.length})`}
        </h3>
        {historyRestrictions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {historyRestrictions.map((restriction) => {
              const appliedByUsername = restriction.issued_by && usernamesMap?.get(restriction.issued_by);
              const deactivatedByUsername = (restriction as any).deactivated_by && usernamesMap?.get((restriction as any).deactivated_by);
              
              return (
                <div
                  key={restriction.id}
                  style={{
                    padding: isMobile ? '0.75rem' : '1rem',
                    backgroundColor: theme.background,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.5rem',
                    opacity: 0.7
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <Shield size={isMobile ? 14 : 16} color={theme.textSecondary} />
                    <span style={{
                      fontSize: isMobile ? '0.8125rem' : '0.875rem',
                      fontWeight: '600',
                      color: theme.textSecondary
                    }}>
                      {getRestrictionTypeLabel(restriction.restriction_type)}
                    </span>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      backgroundColor: theme.success + '20',
                      color: theme.success,
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      Dezactivată
                    </span>
                  </div>
                  
                  {restriction.reason && (
                    <div style={{
                      fontSize: isMobile ? '0.75rem' : '0.8125rem',
                      color: theme.textSecondary,
                      marginBottom: '0.5rem',
                      lineHeight: '1.5'
                    }}>
                      <strong>Motiv:</strong> {restriction.reason}
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    fontSize: isMobile ? '0.6875rem' : '0.75rem',
                    color: theme.textSecondary
                  }}>
                    <div>
                      <strong>Aplicat la:</strong> {formatDate(restriction.created_at)}
                    </div>
                    {appliedByUsername && (
                      <div>
                        <strong>Aplicat de:</strong> {appliedByUsername}
                      </div>
                    )}
                    {(restriction as any).deactivated_at && (
                      <div>
                        <strong>Dezactivată la:</strong> {formatDate((restriction as any).deactivated_at)}
                      </div>
                    )}
                    {deactivatedByUsername && (
                      <div>
                        <strong>Dezactivată de:</strong> {deactivatedByUsername}
                      </div>
                    )}
                    {(restriction as any).deactivation_reason && (
                      <div>
                        <strong>Motiv dezactivare:</strong> {(restriction as any).deactivation_reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: theme.textSecondary,
            backgroundColor: theme.background,
            borderRadius: '0.5rem',
            border: `1px solid ${theme.border}`
          }}>
            {activeRestrictions.length === 0 ? 'Nu există restricții' : 'Nu există istoric restricții'}
          </div>
        )}
      </div>
    </div>
  );
}

// Marketplace Tab Component
function MarketplaceTab({ 
  userId, 
  theme, 
  isMobile 
}: { 
  userId: string; 
  theme: any; 
  isMobile: boolean;
}) {
  // Fetch sales verification
  const { data: verificationData } = useQuery({
    queryKey: ['user-sales-verification', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_sales_verification')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch marketplace feedback
  const { data: feedbackData } = useQuery({
    queryKey: ['user-marketplace-feedback', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_marketplace_feedback')
        .select('*')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000
  });

  const feedback = feedbackData || [];
  const averageRating = feedback.length > 0
    ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
    : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sales Verification Status */}
      <div>
        <h3 style={{
          fontSize: isMobile ? '1rem' : '1.125rem',
          fontWeight: '600',
          color: theme.text,
          marginBottom: '0.75rem'
        }}>
          Status Vânzător
        </h3>
        {verificationData ? (
          <div style={{
            padding: isMobile ? '0.75rem' : '1rem',
            backgroundColor: verificationData.is_eligible ? theme.success + '20' : theme.error + '20',
            border: `1px solid ${verificationData.is_eligible ? theme.success : theme.error}`,
            borderRadius: '0.5rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              {verificationData.is_eligible ? (
                <>
                  <CheckCircle size={isMobile ? 18 : 20} color={theme.success} />
                  <span style={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: '600',
                    color: theme.success
                  }}>
                    Eligibil pentru vânzare
                  </span>
                </>
              ) : (
                <>
                  <X size={isMobile ? 18 : 20} color={theme.error} />
                  <span style={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: '600',
                    color: theme.error
                  }}>
                    Neeligibil pentru vânzare
                  </span>
                </>
              )}
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '0.75rem',
              fontSize: isMobile ? '0.75rem' : '0.8125rem',
              color: theme.text
            }}>
              <div>
                <strong>Vârsta cont:</strong> {verificationData.account_age_days} zile
              </div>
              <div>
                <strong>Reputație:</strong> {verificationData.reputation_points} puncte
              </div>
              <div>
                <strong>Postări:</strong> {verificationData.post_count}
              </div>
              <div>
                <strong>Vânzări reușite:</strong> {verificationData.successful_sales}
              </div>
              <div>
                <strong>Vânzări eșuate:</strong> {verificationData.failed_sales}
              </div>
              <div>
                <strong>Email verificat:</strong> {verificationData.email_verified ? 'Da' : 'Nu'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '1rem',
            textAlign: 'center',
            color: theme.textSecondary,
            backgroundColor: theme.background,
            borderRadius: '0.5rem',
            border: `1px solid ${theme.border}`
          }}>
            Nu există verificare de vânzător
          </div>
        )}
      </div>

      {/* Feedback Statistics */}
      {feedback.length > 0 && (
        <div>
          <h3 style={{
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: '600',
            color: theme.text,
            marginBottom: '0.75rem'
          }}>
            Feedback Vânzări
          </h3>
          <div style={{
            padding: isMobile ? '0.75rem' : '1rem',
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: theme.primary }}>
                {averageRating.toFixed(1)}
              </span>
              <span style={{ fontSize: '1.25rem' }}>⭐</span>
              <span style={{ fontSize: isMobile ? '0.8125rem' : '0.875rem', color: theme.textSecondary }}>
                ({feedback.length} {feedback.length === 1 ? 'recenzie' : 'recenzii'})
              </span>
            </div>
            <div style={{
              fontSize: isMobile ? '0.75rem' : '0.8125rem',
              color: theme.textSecondary
            }}>
              {feedback.filter(f => f.transaction_completed).length} tranzacții finalizate
            </div>
          </div>

          {/* Feedback List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {feedback.map((fb) => (
              <div
                key={fb.id}
                style={{
                  padding: isMobile ? '0.75rem' : '1rem',
                  backgroundColor: theme.background,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '0.125rem'
                  }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        style={{
                          fontSize: isMobile ? '0.875rem' : '1rem',
                          color: star <= fb.rating ? '#fbbf24' : theme.border
                        }}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                  <span style={{
                    fontSize: isMobile ? '0.75rem' : '0.8125rem',
                    color: theme.textSecondary
                  }}>
                    {formatDate(fb.created_at)}
                  </span>
                  {fb.transaction_completed && (
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      backgroundColor: theme.success + '20',
                      color: theme.success,
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      Finalizat
                    </span>
                  )}
                </div>
                {fb.review_text && (
                  <div style={{
                    fontSize: isMobile ? '0.8125rem' : '0.875rem',
                    color: theme.text,
                    lineHeight: '1.5',
                    marginTop: '0.5rem'
                  }}>
                    {fb.review_text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback.length === 0 && verificationData && (
        <div style={{
          padding: '1rem',
          textAlign: 'center',
          color: theme.textSecondary,
          backgroundColor: theme.background,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          Nu există feedback pentru vânzări
        </div>
      )}
    </div>
  );
}

