/**
 * Admin Badges Panel Component
 * Panel pentru acordare badge-uri manuale utilizatorilor
 * Mobile-first design optimizat
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/query-client';
import { Search, Award, X, CheckCircle } from 'lucide-react';

interface ForumUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  rank: string;
  reputation_points: number;
  badges: string[];
  post_count: number;
  topic_count: number;
}

// Badge-uri disponibile cu descrieri
const AVAILABLE_BADGES = [
  { id: 'record_holder', label: 'Record Holder', icon: '🏆', description: 'Deține recorduri de pescuit' },
  { id: 'contest_winner', label: 'Câștigător Concurs', icon: '🥇', description: 'A câștigat concursuri' },
  { id: 'verified_seller', label: 'Vânzător Verificat', icon: '✅', description: 'Vânzător verificat pe piață' },
  { id: 'eco_warrior', label: 'Eco Warrior', icon: '🌱', description: 'Implicat în acțiuni ecologice' },
  { id: 'moderator', label: 'Moderator', icon: '🛡️', description: 'Moderator forum' },
  { id: 'admin', label: 'Administrator', icon: '👑', description: 'Administrator forum' },
  { id: 'contributor', label: 'Contribuitor', icon: '⭐', description: 'Contribuie activ la forum' },
  { id: 'mentor', label: 'Mentor', icon: '🎓', description: 'Ajută alți pescari' },
] as const;

export default function AdminBadges() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ForumUser | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  // Căutare utilizatori
  const { data: searchResults = [], isLoading: searching } = useQuery<ForumUser[]>({
    queryKey: queryKeys.adminUserSearch(searchQuery),
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('forum_users')
        .select('user_id, username, avatar_url, rank, reputation_points, badges, post_count, topic_count')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  // Mutation pentru actualizare badge-uri
  const updateBadgesMutation = useMutation({
    mutationFn: async ({ userId, badges }: { userId: string; badges: string[] }) => {
      const { error } = await supabase
        .from('forum_users')
        .update({ badges })
        .eq('user_id', userId);

      if (error) throw error;
      return { badges };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUserSearch(searchQuery) });
      setShowBadgeModal(false);
      showToast('Badge-uri actualizate cu succes!', 'success');
      
      // Actualizează selectedUser local
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, badges: data.badges });
      }
    },
    onError: (error: Error) => {
      showToast(error.message || 'Eroare la actualizarea badge-urilor', 'error');
    },
  });

  const handleUserSelect = (user: ForumUser) => {
    setSelectedUser(user);
    setSearchQuery('');
  };

  const handleBadgeToggle = (badgeId: string) => {
    if (!selectedUser) return;

    const currentBadges = selectedUser.badges || [];
    const hasBadge = currentBadges.includes(badgeId);
    
    const newBadges = hasBadge
      ? currentBadges.filter(b => b !== badgeId)
      : [...currentBadges, badgeId];

    updateBadgesMutation.mutate({
      userId: selectedUser.user_id,
      badges: newBadges
    });
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ 
        fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
        fontWeight: '700', 
        color: theme.text, 
        marginBottom: '1.5rem' 
      }}>
        Gestionare Badge-uri
      </h2>

      {/* Căutare utilizator */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ 
          position: 'relative', 
          marginBottom: '1rem' 
        }}>
          <Search 
            size={20} 
            style={{ 
              position: 'absolute', 
              left: '0.75rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: theme.textSecondary,
              pointerEvents: 'none'
            }} 
          />
          <input
            type="text"
            placeholder="Caută utilizator după username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              fontSize: '1rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              backgroundColor: theme.surface,
              color: theme.text,
              outline: 'none'
            }}
          />
        </div>

        {/* Rezultate căutare */}
        {searchQuery.length >= 2 && (
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '0.5rem',
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: '0.5rem'
          }}>
            {searching ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: theme.textSecondary }}>
                Căutare...
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: theme.textSecondary }}>
                Nu s-au găsit utilizatori
              </div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.user_id}
                  onClick={() => handleUserSelect(user)}
                  style={{
                    padding: '1rem',
                    borderBottom: `1px solid ${theme.border}`,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    backgroundColor: selectedUser?.user_id === user.user_id ? theme.primary + '20' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedUser?.user_id !== user.user_id) {
                      e.currentTarget.style.backgroundColor = theme.primary + '10';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedUser?.user_id !== user.user_id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username}
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: theme.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '1rem'
                      }}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: theme.text }}>
                        {user.username}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: theme.textSecondary }}>
                        {user.rank} • {user.reputation_points} puncte
                        {user.badges && user.badges.length > 0 && (
                          <span> • {user.badges.length} badge-uri</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Utilizator selectat */}
      {selectedUser && (
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {selectedUser.avatar_url ? (
                <img 
                  src={selectedUser.avatar_url} 
                  alt={selectedUser.username}
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: theme.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '1.5rem'
                }}>
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: theme.text }}>
                  {selectedUser.username}
                </div>
                <div style={{ fontSize: '0.875rem', color: theme.textSecondary }}>
                  {selectedUser.rank} • {selectedUser.reputation_points} puncte
                </div>
              </div>
            </div>
          </div>

          {/* Badge-uri curente */}
          {(selectedUser.badges || []).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, marginBottom: '0.75rem' }}>
                Badge-uri Active ({selectedUser.badges.length})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedUser.badges.map((badgeId) => {
                  const badge = AVAILABLE_BADGES.find(b => b.id === badgeId);
                  if (!badge) return null;
                  
                  return (
                    <div
                      key={badgeId}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: theme.primary + '20',
                        border: `1px solid ${theme.primary}`,
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: theme.text
                      }}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Listă badge-uri disponibile */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, marginBottom: '0.75rem' }}>
              Badge-uri Disponibile
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {AVAILABLE_BADGES.map((badge) => {
                const hasBadge = (selectedUser.badges || []).includes(badge.id);
                const isUpdating = updateBadgesMutation.isPending;
                
                return (
                  <button
                    key={badge.id}
                    onClick={() => handleBadgeToggle(badge.id)}
                    disabled={isUpdating}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: hasBadge ? theme.primary + '20' : theme.background,
                      border: `2px solid ${hasBadge ? theme.primary : theme.border}`,
                      borderRadius: '0.5rem',
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      opacity: isUpdating ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!isUpdating) {
                        e.currentTarget.style.backgroundColor = hasBadge ? theme.primary + '30' : theme.surfaceHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isUpdating) {
                        e.currentTarget.style.backgroundColor = hasBadge ? theme.primary + '20' : theme.background;
                      }
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{badge.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: theme.text,
                        fontSize: '0.875rem'
                      }}>
                        {badge.label}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: theme.textSecondary,
                        marginTop: '0.125rem'
                      }}>
                        {badge.description}
                      </div>
                    </div>
                    {hasBadge && (
                      <CheckCircle size={18} color={theme.primary} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!selectedUser && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: theme.textSecondary,
          backgroundColor: theme.surface,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <Award size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <div>Caută un utilizator pentru a gestiona badge-urile sale</div>
        </div>
      )}
    </div>
  );
}

