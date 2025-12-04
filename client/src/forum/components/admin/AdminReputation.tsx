/**
 * Admin Reputation Panel Component
 * Panel pentru acordare reputație de către admin și vizualizare toate log-urile
 * Mobile-first design optimizat
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/query-client';
import { adminAwardReputation, getUserReputationLogs } from '../../../services/forum/reputation';
import { Search, Award, TrendingUp, TrendingDown, History, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ForumUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  rank: string;
  reputation_points: number;
  reputation_power: number;
  post_count: number;
  topic_count: number;
}

interface ReputationLog {
  id: string;
  giver_user_id: string;
  receiver_user_id: string;
  post_id?: string | null;
  points: number;
  comment?: string | null;
  giver_power: number;
  is_admin_award: boolean;
  created_at: string;
  giver_username?: string;
  receiver_username?: string;
  post_title?: string;
}

export default function AdminReputation() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ForumUser | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [awardType, setAwardType] = useState<'award' | 'remove'>('award');
  const [points, setPoints] = useState<number>(1);
  const [comment, setComment] = useState('');

  // Căutare utilizatori
  const { data: searchResults = [], isLoading: searching } = useQuery<ForumUser[]>({
    queryKey: queryKeys.adminUserSearch(searchQuery),
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('forum_users')
        .select('user_id, username, avatar_url, rank, reputation_points, reputation_power, post_count, topic_count')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  // Log-uri reputație pentru utilizatorul selectat
  const { data: reputationLogs = [], isLoading: loadingLogs } = useQuery<ReputationLog[]>({
    queryKey: queryKeys.adminUserReputationLogs(selectedUser?.user_id || ''),
    queryFn: async () => {
      if (!selectedUser) return [];

      // Pentru admini, RLS policy va returna toate log-urile (via get_visible_reputation_log_ids)
      // Folosim un limit mare pentru a obține toate log-urile
      const result = await getUserReputationLogs(selectedUser.user_id, 1000); // Limit mare pentru admini
      if (result.error) {
        console.error('Error fetching reputation logs:', result.error);
        throw new Error(result.error.message);
      }
      return result.data?.data || [];
    },
    enabled: !!selectedUser,
    staleTime: 30 * 1000,
  });

  // Mutation pentru acordare reputație cu optimistic updates
  const awardReputationMutation = useMutation({
    mutationFn: async ({ userId, points, comment }: { userId: string; points: number; comment?: string }) => {
      // Validări
      if (!userId || userId.trim() === '') {
        throw new Error('ID utilizator invalid');
      }

      if (points === 0) {
        throw new Error('Punctele trebuie să fie diferite de 0');
      }

      if (points < -1000 || points > 1000) {
        throw new Error('Punctele trebuie să fie între -1000 și 1000');
      }

      if (comment && comment.trim().length > 500) {
        throw new Error('Comentariul nu poate depăși 500 de caractere');
      }

      const result = await adminAwardReputation({
        receiverUserId: userId,
        points,
        comment: comment?.trim() || '',
        reason: comment?.trim() || 'Admin award'
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return { points, comment: comment?.trim() || '' };
    },
    // Optimistic update - actualizează UI-ul instant înainte de răspunsul serverului
    onMutate: async ({ userId, points, comment }) => {
      if (!selectedUser || selectedUser.user_id !== userId) return;

      const finalPoints = awardType === 'remove' ? -points : points;
      
      // Anulează query-urile în curs pentru a preveni overwrite
      await queryClient.cancelQueries({ queryKey: queryKeys.adminUserReputationLogs(userId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.adminUserSearch(searchQuery) });

      // Snapshot pentru rollback în caz de eroare
      const previousLogs = queryClient.getQueryData<ReputationLog[]>(queryKeys.adminUserReputationLogs(userId));
      const previousSearchResults = queryClient.getQueryData<ForumUser[]>(queryKeys.adminUserSearch(searchQuery));

      // Optimistic update pentru log-uri - adaugă log-ul nou imediat
      queryClient.setQueryData<ReputationLog[]>(queryKeys.adminUserReputationLogs(userId), (old = []) => {
        const newLog: ReputationLog = {
          id: `temp-${Date.now()}`,
          giver_user_id: 'current-user', // Va fi înlocuit la refetch
          receiver_user_id: userId,
          post_id: null,
          points: finalPoints,
          comment: comment?.trim() || null,
          giver_power: 7,
          is_admin_award: true,
          created_at: new Date().toISOString(),
          giver_username: 'Tu', // Va fi înlocuit la refetch
        };
        return [newLog, ...old];
      });

      // Optimistic update pentru reputația utilizatorului în search results
      queryClient.setQueryData<ForumUser[]>(queryKeys.adminUserSearch(searchQuery), (old = []) => {
        return old.map(user => 
          user.user_id === userId
            ? { ...user, reputation_points: user.reputation_points + finalPoints }
            : user
        );
      });

      // Actualizează și selectedUser local pentru UI instant
      setSelectedUser(prev => prev ? {
        ...prev,
        reputation_points: prev.reputation_points + finalPoints
      } : null);

      return { previousLogs, previousSearchResults };
    },
    onSuccess: (data, variables) => {
      // Refetch pentru a obține datele reale (cu ID-uri corecte, etc.)
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUserReputationLogs(variables.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUserSearch(searchQuery) });
      
      setShowAwardModal(false);
      setPoints(1);
      setComment('');
      const finalPoints = awardType === 'remove' ? -variables.points : variables.points;
      showToast(`Reputație ${awardType === 'award' ? 'acordată' : 'retrasă'} cu succes: ${finalPoints > 0 ? '+' : ''}${finalPoints} puncte!`, 'success');
    },
    onError: (error: Error, variables, context) => {
      // Rollback în caz de eroare
      if (context?.previousLogs) {
        queryClient.setQueryData(queryKeys.adminUserReputationLogs(variables.userId), context.previousLogs);
      }
      if (context?.previousSearchResults) {
        queryClient.setQueryData(queryKeys.adminUserSearch(searchQuery), context.previousSearchResults);
      }
      // Rollback selectedUser
      if (selectedUser) {
        const finalPoints = awardType === 'remove' ? -variables.points : variables.points;
        setSelectedUser(prev => prev ? {
          ...prev,
          reputation_points: prev.reputation_points - finalPoints
        } : null);
      }
      showToast(error.message || 'Eroare la acordarea reputației', 'error');
    },
  });

  const handleUserSelect = (user: ForumUser) => {
    setSelectedUser(user);
    setSearchQuery('');
  };

  const handleAwardClick = (type: 'award' | 'remove') => {
    if (!selectedUser) {
      showToast('Selectează un utilizator mai întâi', 'error');
      return;
    }
    setAwardType(type);
    setPoints(1);
    setComment('');
    setShowAwardModal(true);
  };

  const handleAwardSubmit = () => {
    if (!selectedUser) return;
    
    if (points <= 0) {
      showToast('Punctele trebuie să fie mai mari decât 0', 'error');
      return;
    }

    // Dacă e "remove", facem punctele negative
    const finalPoints = awardType === 'remove' ? -points : points;

    awardReputationMutation.mutate({
      userId: selectedUser.user_id,
      points: finalPoints,
      comment: comment.trim() || undefined
    });
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

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ 
        fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
        fontWeight: '700', 
        color: theme.text, 
        marginBottom: '1.5rem' 
      }}>
        Gestionare Reputație
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
                        {user.rank} • {user.reputation_points} puncte (Putere: {user.reputation_power})
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
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
                  {selectedUser.rank} • {selectedUser.reputation_points} puncte (Putere: {selectedUser.reputation_power})
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleAwardClick('award')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <TrendingUp size={18} />
                Acordă
              </button>
              <button
                onClick={() => handleAwardClick('remove')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <TrendingDown size={18} />
                Retrage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Istoric log-uri reputație */}
      {selectedUser && (
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <History size={20} color={theme.textSecondary} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: theme.text }}>
              Istoric Reputație ({reputationLogs.length})
            </h3>
          </div>

          {loadingLogs ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>
              Se încarcă...
            </div>
          ) : reputationLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>
              Nu există log-uri de reputație pentru acest utilizator.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {reputationLogs.map((log) => {
                const isPositive = log.points > 0;
                const pointColor = isPositive ? '#10b981' : '#ef4444';
                const bgColor = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                
                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '0.75rem',
                      border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                      borderRadius: '0.5rem',
                      backgroundColor: bgColor
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          {isPositive ? (
                            <TrendingUp size={16} color={pointColor} />
                          ) : (
                            <TrendingDown size={16} color={pointColor} />
                          )}
                          <span style={{ 
                            fontWeight: '700', 
                            fontSize: '0.9375rem',
                            color: pointColor
                          }}>
                            {isPositive ? '+' : ''}{log.points} puncte
                          </span>
                          {log.is_admin_award && (
                            <span style={{
                              padding: '0.125rem 0.375rem',
                              backgroundColor: pointColor,
                              color: 'white',
                              borderRadius: '0.25rem',
                              fontSize: '0.6875rem',
                              fontWeight: '600'
                            }}>
                              Admin
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: theme.textSecondary, marginLeft: 'auto' }}>
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: theme.textSecondary, marginBottom: log.comment ? '0.25rem' : 0 }}>
                          De la: <strong style={{ color: theme.text }}>{log.giver_username || 'Unknown'}</strong>
                          {log.giver_power > 0 && ` (P:${log.giver_power})`}
                        </div>
                        {log.comment && (
                          <div style={{ 
                            fontSize: '0.8125rem', 
                            color: theme.text,
                            marginTop: '0.25rem',
                            padding: '0.375rem',
                            backgroundColor: theme.background,
                            borderRadius: '0.25rem',
                            fontStyle: 'italic',
                            lineHeight: '1.4'
                          }}>
                            "{log.comment}"
                          </div>
                        )}
                        {log.post_title && (
                          <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '0.25rem' }}>
                            📝 {log.post_title}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal acordare reputație */}
      {showAwardModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAwardModal(false);
          }
        }}
        >
          <div style={{
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            border: `1px solid ${theme.border}`,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: theme.text }}>
                {awardType === 'award' ? 'Acordă Reputație' : 'Retrage Reputație'}
              </h3>
              <button
                onClick={() => setShowAwardModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.textSecondary,
                  padding: '0.25rem'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                Utilizator
              </label>
              <div style={{
                padding: '0.75rem',
                backgroundColor: theme.background,
                borderRadius: '0.5rem',
                color: theme.text
              }}>
                {selectedUser.username} ({selectedUser.reputation_points} puncte)
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                Puncte {awardType === 'award' ? '(pozitiv)' : '(va fi scăzut)'}
              </label>
              <input
                type="number"
                value={points}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (value >= 1 && value <= 1000) {
                    setPoints(value);
                  }
                }}
                min={1}
                max={1000}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  backgroundColor: theme.background,
                  color: theme.text,
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: '0.875rem', color: theme.textSecondary, marginTop: '0.25rem' }}>
                Valoare între 1 și 1000 puncte
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                Comentariu (opțional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex: Contribuție excelentă la forum..."
                maxLength={500}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  backgroundColor: theme.background,
                  color: theme.text,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ fontSize: '0.875rem', color: theme.textSecondary, marginTop: '0.25rem' }}>
                {comment.length}/500 caractere
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAwardModal(false);
                  setPoints(1);
                  setComment('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Anulează
              </button>
              <button
                onClick={handleAwardSubmit}
                disabled={awardReputationMutation.isPending || points <= 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: points <= 0 ? theme.border : (awardType === 'award' ? '#10b981' : '#ef4444'),
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: points <= 0 ? 'not-allowed' : 'pointer',
                  opacity: points <= 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {awardReputationMutation.isPending ? (
                  <>Se procesează...</>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    {awardType === 'award' ? 'Acordă' : 'Retrage'} Reputație
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

