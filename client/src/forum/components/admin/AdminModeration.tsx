/**
 * Admin Moderation Panel Component
 * Panel pentru moderare: ban, mute, delete, shadow ban, view istoric restricții
 * Mobile-first design optimizat
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/query-client';
import { Search, Ban, VolumeX, EyeOff, History, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface UserRestriction {
  id: string;
  user_id: string;
  restriction_type: 'mute' | 'view_ban' | 'shadow_ban' | 'temp_ban' | 'permanent_ban';
  reason: string;
  applied_by: string | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  deactivated_at?: string | null;
  deactivated_by?: string | null;
  deactivation_reason?: string | null;
  applied_by_username?: string;
  deactivated_by_username?: string;
}

interface ForumUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  rank: string;
  post_count: number;
  topic_count: number;
}

export default function AdminModeration() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ForumUser | null>(null);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [restrictionToRemove, setRestrictionToRemove] = useState<UserRestriction | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [restrictionType, setRestrictionType] = useState<'mute' | 'view_ban' | 'shadow_ban' | 'temp_ban' | 'permanent_ban'>('mute');
  const [restrictionReason, setRestrictionReason] = useState('');
  const [restrictionDuration, setRestrictionDuration] = useState<number>(1); // zile
  const [isPermanent, setIsPermanent] = useState(false);

  // Detectare mobile
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  // Căutare utilizatori
  const { data: searchResults = [], isLoading: searching } = useQuery<ForumUser[]>({
    queryKey: queryKeys.adminUserSearch(searchQuery),
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('forum_users')
        .select('user_id, username, avatar_url, rank, post_count, topic_count')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  // Istoric restricții pentru utilizatorul selectat - FIXAT: obține username-urile separat
  const { data: restrictions = [], isLoading: loadingRestrictions } = useQuery<UserRestriction[]>({
    queryKey: queryKeys.adminUserRestrictions(selectedUser?.user_id || ''),
    queryFn: async () => {
      if (!selectedUser) return [];

      // Obține restricțiile
      const { data: restrictionsData, error } = await supabase
        .from('forum_user_restrictions')
        .select('*')
        .eq('user_id', selectedUser.user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!restrictionsData || restrictionsData.length === 0) return [];

      // Obține username-urile pentru applied_by și deactivated_by separat
      const appliedByIds = [...new Set(restrictionsData.map(r => r.applied_by).filter(Boolean))] as string[];
      const deactivatedByIds = [...new Set(restrictionsData.map(r => r.deactivated_by).filter(Boolean))] as string[];
      const allUserIds = [...new Set([...appliedByIds, ...deactivatedByIds])];
      
      let userMap = new Map<string, string>();
      if (allUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from('forum_users')
          .select('user_id, username')
          .in('user_id', allUserIds);

        if (usersData) {
          usersData.forEach(u => {
            userMap.set(u.user_id, u.username);
          });
        }
      }

      // Adaugă username-urile la restricții
      return restrictionsData.map((r) => ({
        ...r,
        applied_by_username: r.applied_by ? userMap.get(r.applied_by) : undefined,
        deactivated_by_username: r.deactivated_by ? userMap.get(r.deactivated_by) : undefined,
      }));
    },
    enabled: !!selectedUser,
    staleTime: 10 * 1000, // 10 secunde - se actualizează rapid după aplicare
  });

  // Mutation pentru aplicare restricție
  const applyRestrictionMutation = useMutation({
    mutationFn: async () => {
      // Validări stricte
      if (!selectedUser) {
        throw new Error('Utilizatorul nu este selectat');
      }
      
      if (!selectedUser.user_id) {
        throw new Error('ID utilizator invalid');
      }

      const trimmedReason = restrictionReason.trim();
      if (!trimmedReason || trimmedReason.length < 3) {
        throw new Error('Motivul trebuie să aibă minim 3 caractere');
      }

      if (trimmedReason.length > 1000) {
        throw new Error('Motivul nu poate depăși 1000 de caractere');
      }

      // Validare durată pentru restricții temporare
      if (!isPermanent && (restrictionDuration < 1 || restrictionDuration > 365)) {
        throw new Error('Durata trebuie să fie între 1 și 365 de zile');
      }

      const expiresAt = isPermanent 
        ? null 
        : new Date(Date.now() + restrictionDuration * 24 * 60 * 60 * 1000).toISOString();

      const { data: currentUser, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser.user) {
        throw new Error('Nu ești autentificat. Te rugăm să te reconectezi.');
      }

      // Verificare dacă utilizatorul nu încearcă să se muteze singur
      if (selectedUser.user_id === currentUser.user.id) {
        throw new Error('Nu poți aplica restricții asupra ta');
      }

      const { data: insertedData, error } = await supabase
        .from('forum_user_restrictions')
        .insert({
          user_id: selectedUser.user_id,
          restriction_type: restrictionType,
          reason: trimmedReason,
          applied_by: currentUser.user.id,
          starts_at: new Date().toISOString(),
          expires_at: expiresAt,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        // Mesaje de eroare mai clare
        if (error.code === '23505') {
          throw new Error('Această restricție există deja pentru acest utilizator');
        }
        if (error.code === '42501') {
          throw new Error('Nu ai permisiuni pentru a aplica restricții');
        }
        throw new Error(`Eroare la aplicarea restricției: ${error.message}`);
      }

      // Verificare că restricția a fost creată corect
      if (!insertedData || !insertedData.id) {
        throw new Error('Restricția nu a fost creată. Te rugăm să reîncerci.');
      }

      return insertedData;
    },
    onSuccess: () => {
      // Invalidează cache-ul pentru a actualiza instant istoricul
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUserRestrictions(selectedUser?.user_id || '') });
      setShowRestrictionModal(false);
      setRestrictionReason('');
      setRestrictionDuration(1);
      setIsPermanent(false);
      showToast(`Restricție "${getRestrictionTypeLabel(restrictionType)}" aplicată cu succes!`, 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Eroare la aplicarea restricției', 'error');
    },
  });

  // Mutation pentru dezactivare restricție
  const removeRestrictionMutation = useMutation({
    mutationFn: async ({ restrictionId, restrictionType, deactivationReason }: { restrictionId: string; restrictionType: string; deactivationReason?: string }) => {
      // Validări stricte
      if (!restrictionId || restrictionId.trim() === '') {
        throw new Error('ID restricție invalid');
      }

      const { data: currentUser, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser.user) {
        throw new Error('Nu ești autentificat. Te rugăm să te reconectezi.');
      }

      // Verifică mai întâi dacă restricția există și este activă
      const { data: existingRestriction, error: fetchError } = await supabase
        .from('forum_user_restrictions')
        .select('id, is_active, user_id, restriction_type')
        .eq('id', restrictionId)
        .single();

      if (fetchError) {
        console.error('Error fetching restriction:', fetchError);
        if (fetchError.code === 'PGRST116') {
          throw new Error('Restricția nu a fost găsită');
        }
        throw new Error(`Eroare la verificarea restricției: ${fetchError.message}`);
      }

      if (!existingRestriction) {
        throw new Error('Restricția nu există');
      }

      if (!existingRestriction.is_active) {
        throw new Error('Restricția este deja dezactivată');
      }

      // Validare motiv dezactivare
      const trimmedDeactivationReason = deactivationReason?.trim() || '';
      if (!trimmedDeactivationReason || trimmedDeactivationReason.length < 3) {
        throw new Error('Motivul dezactivării trebuie să aibă minim 3 caractere');
      }

      if (trimmedDeactivationReason.length > 500) {
        throw new Error('Motivul dezactivării nu poate depăși 500 de caractere');
      }

      // Actualizează restricția cu tracking dezactivare
      const { data: updatedData, error } = await supabase
        .from('forum_user_restrictions')
        .update({ 
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: currentUser.user.id,
          deactivation_reason: trimmedDeactivationReason
        })
        .eq('id', restrictionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating restriction:', error);
        if (error.code === '42501') {
          throw new Error('Nu ai permisiuni pentru a dezactiva restricții. Verifică dacă migration-ul 37 a fost rulat.');
        }
        if (error.code === 'PGRST116') {
          throw new Error('Restricția nu a fost găsită sau nu a fost actualizată');
        }
        throw new Error(`Eroare la dezactivarea restricției: ${error.message} (Code: ${error.code})`);
      }

      // Verificare că restricția a fost actualizată corect
      if (!updatedData || updatedData.is_active !== false) {
        throw new Error('Restricția nu a fost dezactivată. Te rugăm să reîncerci.');
      }

      return updatedData;
    },
    onSuccess: (_, variables) => {
      // Invalidează cache-ul pentru a actualiza instant istoricul
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUserRestrictions(selectedUser?.user_id || '') });
      const restrictionTypeLabel = getRestrictionTypeLabel(variables.restrictionType);
      setShowRemoveConfirmModal(false);
      setRestrictionToRemove(null);
      setDeactivationReason('');
      showToast(`Restricție "${restrictionTypeLabel}" dezactivată cu succes!`, 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Eroare la dezactivarea restricției', 'error');
      // Nu închide modal-ul la eroare - lasă utilizatorul să corecteze
    },
  });

  const handleUserSelect = (user: ForumUser) => {
    setSelectedUser(user);
    setSearchQuery('');
  };

  const handleApplyRestriction = () => {
    applyRestrictionMutation.mutate();
  };

  const getRestrictionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mute: 'Mute',
      view_ban: 'View Ban',
      shadow_ban: 'Shadow Ban',
      temp_ban: 'Ban Temporar',
      permanent_ban: 'Ban Permanent',
    };
    return labels[type] || type;
  };

  const getRestrictionTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      mute: 'Utilizatorul nu poate posta răspunsuri sau crea topicuri noi, dar poate accesa forumul',
      view_ban: 'Utilizatorul nu poate accesa deloc forumul - toate paginile sunt blocate',
      shadow_ban: 'Postările utilizatorului sunt invizibile pentru alți utilizatori, dar el le vede normal',
      temp_ban: 'Acces complet blocat pentru perioada specificată - ban temporar complet',
      permanent_ban: 'Acces permanent blocat - nu poate fi accesat niciodată forumul',
    };
    return descriptions[type] || '';
  };

  const getRestrictionTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      mute: <VolumeX size={isMobile ? 20 : 24} />,
      view_ban: <EyeOff size={isMobile ? 20 : 24} />,
      shadow_ban: <EyeOff size={isMobile ? 20 : 24} />,
      temp_ban: <Ban size={isMobile ? 20 : 24} />,
      permanent_ban: <Ban size={isMobile ? 20 : 24} />,
    };
    return icons[type] || <Ban size={isMobile ? 20 : 24} />;
  };

  const getRestrictionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      mute: theme.primary,
      view_ban: '#f59e0b',
      shadow_ban: '#8b5cf6',
      temp_ban: '#ef4444',
      permanent_ban: '#dc2626',
    };
    return colors[type] || theme.primary;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 2vw, 1.5rem)' }}>
      {/* Header */}
      <div>
        <h2 style={{ 
          fontSize: 'clamp(1.125rem, 3vw, 1.5rem)', 
          fontWeight: '700', 
          color: theme.text, 
          marginBottom: '0.5rem' 
        }}>
          🛡️ Panel Moderare
        </h2>
        <p style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', color: theme.textSecondary }}>
          Gestionare restricții utilizatori, ștergere conținut, vizualizare istoric
        </p>
      </div>

      {/* Căutare Utilizator */}
      <div style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '0.5rem',
        padding: isMobile ? '0.875rem' : '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
          <Search size={isMobile ? 18 : 20} color={theme.textSecondary} />
          <h3 style={{ fontSize: 'clamp(0.9375rem, 2vw, 1rem)', fontWeight: '600', color: theme.text }}>
            Căutare Utilizator
          </h3>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Caută după username..."
          style={{
            width: '100%',
            padding: isMobile ? '0.625rem' : '0.75rem',
            border: `1px solid ${theme.border}`,
            borderRadius: '0.375rem',
            backgroundColor: theme.background,
            color: theme.text,
            fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)',
          }}
        />

        {/* Rezultate căutare */}
        {searchQuery.length >= 2 && (
          <div style={{ marginTop: '0.75rem' }}>
            {searching ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: theme.textSecondary, fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)' }}>
                Se caută...
              </div>
            ) : searchResults.length > 0 ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                maxHeight: isMobile ? '250px' : '300px',
                overflowY: 'auto'
              }}>
                {searchResults.map((user) => (
                  <button
                    key={user.user_id}
                    onClick={() => handleUserSelect(user)}
                    style={{
                      padding: isMobile ? '0.625rem' : '0.75rem',
                      backgroundColor: selectedUser?.user_id === user.user_id ? theme.primary : theme.background,
                      color: selectedUser?.user_id === user.user_id ? '#ffffff' : theme.text,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? '0.5rem' : '0.75rem',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedUser?.user_id !== user.user_id) {
                        e.currentTarget.style.backgroundColor = theme.surfaceHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedUser?.user_id !== user.user_id) {
                        e.currentTarget.style.backgroundColor = theme.background;
                      }
                    }}
                  >
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username}
                        style={{ 
                          width: isMobile ? '2rem' : '2.5rem', 
                          height: isMobile ? '2rem' : '2.5rem', 
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div style={{
                        width: isMobile ? '2rem' : '2.5rem',
                        height: isMobile ? '2rem' : '2.5rem',
                        borderRadius: '50%',
                        backgroundColor: selectedUser?.user_id === user.user_id ? '#ffffff' : theme.primary,
                        color: selectedUser?.user_id === user.user_id ? theme.primary : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: isMobile ? '0.875rem' : '1rem',
                        flexShrink: 0,
                      }}>
                        {user.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.125rem', fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)' }}>
                        {user.username}
                      </div>
                      <div style={{ fontSize: 'clamp(0.6875rem, 1.2vw, 0.75rem)', color: selectedUser?.user_id === user.user_id ? 'rgba(255, 255, 255, 0.8)' : theme.textSecondary }}>
                        {user.post_count} postări • {user.topic_count} topicuri
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: theme.textSecondary, fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)' }}>
                Nu s-au găsit utilizatori
              </div>
            )}
          </div>
        )}
      </div>

      {/* Utilizator Selectat + Acțiuni */}
      {selectedUser && (
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: isMobile ? '1rem' : '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1rem', flex: 1, minWidth: 0 }}>
              <div style={{
                width: isMobile ? '2.5rem' : '3rem',
                height: isMobile ? '2.5rem' : '3rem',
                borderRadius: '50%',
                backgroundColor: theme.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: isMobile ? '1rem' : '1.25rem',
                flexShrink: 0,
              }}>
                {selectedUser.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: '600', color: theme.text, marginBottom: '0.25rem' }}>
                  {selectedUser.username}
                </div>
                <div style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', color: theme.textSecondary }}>
                  {selectedUser.post_count} postări • {selectedUser.topic_count} topicuri • {selectedUser.rank}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedUser(null);
                setShowRestrictionModal(false);
              }}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: theme.textSecondary,
                flexShrink: 0,
              }}
            >
              <X size={isMobile ? 18 : 20} />
            </button>
          </div>

          {/* Butoane Acțiuni - Mobile-first grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', 
            gap: isMobile ? '0.625rem' : '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <button
              onClick={() => {
                setRestrictionType('mute');
                setShowRestrictionModal(true);
              }}
              style={{
                padding: isMobile ? '0.875rem 0.625rem' : '1rem 0.75rem',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.surfaceHover;
                e.currentTarget.style.borderColor = getRestrictionTypeColor('mute');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.background;
                e.currentTarget.style.borderColor = theme.border;
              }}
            >
              <VolumeX size={isMobile ? 22 : 26} color={getRestrictionTypeColor('mute')} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                <span style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', fontWeight: '600', color: theme.text }}>Mute</span>
                <span style={{ fontSize: 'clamp(0.6875rem, 1.2vw, 0.75rem)', color: theme.textSecondary, textAlign: 'center' }}>
                  Nu poate posta
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setRestrictionType('view_ban');
                setShowRestrictionModal(true);
              }}
              style={{
                padding: isMobile ? '0.875rem 0.625rem' : '1rem 0.75rem',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.surfaceHover;
                e.currentTarget.style.borderColor = getRestrictionTypeColor('view_ban');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.background;
                e.currentTarget.style.borderColor = theme.border;
              }}
            >
              <EyeOff size={isMobile ? 22 : 26} color={getRestrictionTypeColor('view_ban')} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                <span style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', fontWeight: '600', color: theme.text }}>View Ban</span>
                <span style={{ fontSize: 'clamp(0.6875rem, 1.2vw, 0.75rem)', color: theme.textSecondary, textAlign: 'center' }}>
                  Nu poate accesa
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setRestrictionType('shadow_ban');
                setShowRestrictionModal(true);
              }}
              style={{
                padding: isMobile ? '0.875rem 0.625rem' : '1rem 0.75rem',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.surfaceHover;
                e.currentTarget.style.borderColor = getRestrictionTypeColor('shadow_ban');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.background;
                e.currentTarget.style.borderColor = theme.border;
              }}
            >
              <EyeOff size={isMobile ? 22 : 26} color={getRestrictionTypeColor('shadow_ban')} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                <span style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', fontWeight: '600', color: theme.text }}>Shadow Ban</span>
                <span style={{ fontSize: 'clamp(0.6875rem, 1.2vw, 0.75rem)', color: theme.textSecondary, textAlign: 'center' }}>
                  Postări invizibile
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setRestrictionType('temp_ban');
                setShowRestrictionModal(true);
              }}
              style={{
                padding: isMobile ? '0.875rem 0.625rem' : '1rem 0.75rem',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.surfaceHover;
                e.currentTarget.style.borderColor = getRestrictionTypeColor('temp_ban');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.background;
                e.currentTarget.style.borderColor = theme.border;
              }}
            >
              <Ban size={isMobile ? 22 : 26} color={getRestrictionTypeColor('temp_ban')} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                <span style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', fontWeight: '600', color: theme.text }}>Ban Temporar</span>
                <span style={{ fontSize: 'clamp(0.6875rem, 1.2vw, 0.75rem)', color: theme.textSecondary, textAlign: 'center' }}>
                  Blocat temporar
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setRestrictionType('permanent_ban');
                setIsPermanent(true);
                setShowRestrictionModal(true);
              }}
              style={{
                padding: isMobile ? '0.875rem 0.625rem' : '1rem 0.75rem',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                gridColumn: isMobile ? 'span 2' : 'auto',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.surfaceHover;
                e.currentTarget.style.borderColor = getRestrictionTypeColor('permanent_ban');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.background;
                e.currentTarget.style.borderColor = theme.border;
              }}
            >
              <Ban size={isMobile ? 22 : 26} color={getRestrictionTypeColor('permanent_ban')} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                <span style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', fontWeight: '600', color: theme.text }}>Ban Permanent</span>
                <span style={{ fontSize: 'clamp(0.6875rem, 1.2vw, 0.75rem)', color: theme.textSecondary, textAlign: 'center' }}>
                  Blocat permanent
                </span>
              </div>
            </button>
          </div>

          {/* Istoric Restricții */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <History size={isMobile ? 16 : 18} color={theme.textSecondary} />
              <h3 style={{ fontSize: 'clamp(0.9375rem, 2vw, 1rem)', fontWeight: '600', color: theme.text }}>
                Istoric Restricții
              </h3>
            </div>

            {loadingRestrictions ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: theme.textSecondary, fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)' }}>
                Se încarcă...
              </div>
            ) : restrictions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {restrictions.map((restriction) => (
                  <div
                    key={restriction.id}
                    style={{
                      padding: isMobile ? '0.875rem' : '1rem',
                      backgroundColor: theme.background,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.625rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                        <div style={{ color: getRestrictionTypeColor(restriction.restriction_type), flexShrink: 0 }}>
                          {getRestrictionTypeIcon(restriction.restriction_type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: '600', color: theme.text, fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)' }}>
                            {getRestrictionTypeLabel(restriction.restriction_type)}
                          </span>
                          {restriction.is_active && (
                            <span style={{
                              marginLeft: '0.5rem',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              borderRadius: '0.25rem',
                              fontSize: 'clamp(0.6875rem, 1.2vw, 0.75rem)',
                              fontWeight: '600',
                              display: 'inline-block',
                            }}>
                              ACTIV
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', minWidth: isMobile ? 'auto' : '200px' }}>
                        {/* Buton Dezactivează pentru restricții active - mic, în dreapta */}
                        {restriction.is_active && (
                          <button
                            onClick={() => {
                              setRestrictionToRemove(restriction);
                              setShowRemoveConfirmModal(true);
                            }}
                            disabled={removeRestrictionMutation.isPending}
                            style={{
                              padding: isMobile ? '0.375rem 0.625rem' : '0.5rem 0.75rem',
                              backgroundColor: '#10b981',
                              border: 'none',
                              borderRadius: '0.375rem',
                              color: '#ffffff',
                              cursor: removeRestrictionMutation.isPending ? 'not-allowed' : 'pointer',
                              fontWeight: '600',
                              fontSize: 'clamp(0.6875rem, 1.2vw, 0.75rem)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              opacity: removeRestrictionMutation.isPending ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => {
                              if (!removeRestrictionMutation.isPending) {
                                e.currentTarget.style.backgroundColor = '#059669';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!removeRestrictionMutation.isPending) {
                                e.currentTarget.style.backgroundColor = '#10b981';
                              }
                            }}
                          >
                            <CheckCircle size={isMobile ? 14 : 16} />
                            {removeRestrictionMutation.isPending ? '...' : 'Dezactivează'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', color: theme.text, lineHeight: '1.5' }}>
                      <strong>Motiv:</strong> {restriction.reason}
                    </div>
                    
                    {/* Layout flex pentru informații stânga-dreapta - perfect aliniate */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between',
                      gap: isMobile ? '0.5rem' : '2rem',
                      alignItems: 'flex-start', // Aliniere perfectă la același nivel
                      alignContent: 'flex-start',
                      alignSelf: 'stretch'
                    }}>
                      {/* Stânga - Informații aplicare */}
                      <div style={{ 
                        flex: 1, 
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.375rem',
                        paddingTop: 0,
                        marginTop: 0,
                        paddingBottom: 0,
                        marginBottom: 0,
                        justifyContent: 'flex-start'
                      }}>
                        {/* Spacer invizibil pentru alinierea perfectă cu "Dezactivată"/"A expirat" din dreapta - EXACT aceeași înălțime */}
                        {(restriction.deactivated_at || (!restriction.is_active && !restriction.deactivated_at && restriction.expires_at && new Date(restriction.expires_at) < new Date())) && (
                          <div style={{ 
                            fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)', 
                            color: 'transparent',
                            fontWeight: '600',
                            lineHeight: '1.5',
                            visibility: 'hidden',
                            margin: 0,
                            padding: 0,
                            height: '1.5em',
                            minHeight: '1.5em',
                            flexShrink: 0
                          }}>
                            Dezactivată
                          </div>
                        )}
                        <div style={{ fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)', color: theme.textSecondary }}>
                          <strong>Aplicat la:</strong> {new Date(restriction.created_at).toLocaleDateString('ro-RO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {restriction.expires_at && (
                          <div style={{ fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)', color: theme.textSecondary }}>
                            <strong>Expiră:</strong> {new Date(restriction.expires_at).toLocaleDateString('ro-RO', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                        {restriction.applied_by_username && (
                          <div style={{ fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)', color: theme.textSecondary }}>
                            <strong>Aplicat de:</strong> {restriction.applied_by_username}
                          </div>
                        )}
                      </div>
                      
                      {/* Dreapta - Informații dezactivare/expirare - la același nivel */}
                      {(restriction.deactivated_at || (!restriction.is_active && !restriction.deactivated_at && restriction.expires_at && new Date(restriction.expires_at) < new Date())) && (
                        <div style={{ 
                          flex: 1, 
                          minWidth: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.375rem',
                          alignItems: isMobile ? 'flex-start' : 'flex-end',
                          textAlign: isMobile ? 'left' : 'right',
                          paddingTop: 0,
                          marginTop: 0,
                          paddingBottom: 0,
                          marginBottom: 0,
                          justifyContent: 'flex-start'
                        }}>
                          {/* Dezactivare manuală */}
                          {restriction.deactivated_at && (
                            <>
                              <div style={{ 
                                fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)', 
                                color: '#10b981',
                                fontWeight: '600'
                              }}>
                                Dezactivată
                              </div>
                              <div style={{ 
                                fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)', 
                                color: theme.textSecondary
                              }}>
                                <strong>Dezactivată la:</strong> {new Date(restriction.deactivated_at).toLocaleDateString('ro-RO', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              {restriction.deactivated_by_username && (
                                <div style={{ 
                                  fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)', 
                                  color: theme.textSecondary
                                }}>
                                  <strong>Dezactivat de:</strong> {restriction.deactivated_by_username}
                                </div>
                              )}
                              {restriction.deactivation_reason && (
                                <div style={{ 
                                  fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)', 
                                  color: theme.textSecondary,
                                  maxWidth: isMobile ? '100%' : '250px',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.4'
                                }}>
                                  <strong>Motiv dezactivare:</strong> {restriction.deactivation_reason}
                                </div>
                              )}
                            </>
                          )}
                          
                          {/* Expirare automată */}
                          {!restriction.is_active && 
                           !restriction.deactivated_at && 
                           restriction.expires_at && 
                           new Date(restriction.expires_at) < new Date() && (
                            <>
                              <div style={{ 
                                fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)', 
                                color: '#f59e0b',
                                fontWeight: '600'
                              }}>
                                A expirat
                              </div>
                              <div style={{ 
                                fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)', 
                                color: theme.textSecondary
                              }}>
                                <strong>A expirat la:</strong> {new Date(restriction.expires_at).toLocaleDateString('ro-RO', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: theme.textSecondary, fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)' }}>
                Nu există restricții pentru acest utilizator
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Aplicare Restricție - Mobile-first */}
      {showRestrictionModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 0,
        }}
        onClick={() => setShowRestrictionModal(false)}
        >
          <div
            style={{
              backgroundColor: theme.surface,
              borderRadius: isMobile ? '1rem 1rem 0 0' : '0.5rem',
              padding: isMobile ? '1.25rem' : '1.5rem',
              maxWidth: isMobile ? '100%' : '500px',
              width: '100%',
              maxHeight: isMobile ? '90vh' : '90vh',
              overflowY: 'auto',
              boxShadow: isMobile ? '0 -4px 20px rgba(0, 0, 0, 0.3)' : '0 10px 40px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)', fontWeight: '600', color: theme.text }}>
                Aplicare {getRestrictionTypeLabel(restrictionType)}
              </h3>
              <button
                onClick={() => setShowRestrictionModal(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.textSecondary,
                }}
              >
                <X size={isMobile ? 20 : 24} />
              </button>
            </div>

            {/* Descriere tip restricție */}
            <div style={{
              padding: '0.875rem',
              backgroundColor: theme.background,
              border: `1px solid ${getRestrictionTypeColor(restrictionType)}`,
              borderRadius: '0.375rem',
              marginBottom: '1rem',
            }}>
              <p style={{
                fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)',
                color: theme.text,
                margin: 0,
                lineHeight: '1.5',
              }}>
                {getRestrictionTypeDescription(restrictionType)}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', fontWeight: '500', color: theme.text }}>
                  Utilizator
                </label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.background,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.375rem',
                  color: theme.text,
                  fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)',
                }}>
                  {selectedUser.username}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', fontWeight: '500', color: theme.text }}>
                  Tip Restricție
                </label>
                <select
                  value={restrictionType}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setRestrictionType(newType);
                    if (newType === 'permanent_ban') {
                      setIsPermanent(true);
                    } else if (newType === 'shadow_ban') {
                      setIsPermanent(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.375rem',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)',
                  }}
                >
                  <option value="mute">Mute (nu poate posta)</option>
                  <option value="view_ban">View Ban (nu poate accesa)</option>
                  <option value="shadow_ban">Shadow Ban (postările invizibile)</option>
                  <option value="temp_ban">Ban Temporar</option>
                  <option value="permanent_ban">Ban Permanent</option>
                </select>
              </div>

              {(restrictionType === 'temp_ban' || restrictionType === 'mute' || restrictionType === 'view_ban') && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isPermanent}
                      onChange={(e) => setIsPermanent(e.target.checked)}
                      style={{ cursor: 'pointer', width: '1rem', height: '1rem' }}
                    />
                    <span style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', color: theme.text }}>Permanent</span>
                  </label>
                  {!isPermanent && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        value={restrictionDuration}
                        onChange={(e) => setRestrictionDuration(parseInt(e.target.value) || 1)}
                        min={1}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '0.375rem',
                          backgroundColor: theme.background,
                          color: theme.text,
                          fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)',
                        }}
                      />
                      <span style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', color: theme.text, whiteSpace: 'nowrap' }}>zile</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', fontWeight: '500', color: theme.text }}>
                  Motiv <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={restrictionReason}
                  onChange={(e) => setRestrictionReason(e.target.value)}
                  placeholder="Descrie motivul restricției..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.375rem',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setShowRestrictionModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    backgroundColor: theme.background,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.375rem',
                    color: theme.text,
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.background;
                  }}
                >
                  Anulează
                </button>
                <button
                  onClick={handleApplyRestriction}
                  disabled={!restrictionReason.trim() || applyRestrictionMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    backgroundColor: applyRestrictionMutation.isPending || !restrictionReason.trim() ? theme.border : '#dc2626',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: '#ffffff',
                    cursor: applyRestrictionMutation.isPending || !restrictionReason.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)',
                  }}
                  onMouseEnter={(e) => {
                    if (!applyRestrictionMutation.isPending && restrictionReason.trim()) {
                      e.currentTarget.style.backgroundColor = '#b91c1c';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!applyRestrictionMutation.isPending && restrictionReason.trim()) {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                    }
                  }}
                >
                  {applyRestrictionMutation.isPending ? 'Se aplică...' : 'Aplică Restricție'}
                </button>
              </div>

              {applyRestrictionMutation.error && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  color: '#991b1b',
                  fontSize: 'clamp(0.75rem, 1.3vw, 0.8125rem)',
                }}>
                  Eroare: {applyRestrictionMutation.error.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmare Dezactivare Restricție */}
      {showRemoveConfirmModal && restrictionToRemove && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '1rem',
        }}
        onClick={() => {
          setShowRemoveConfirmModal(false);
          setRestrictionToRemove(null);
        }}
        >
          <div
            style={{
              backgroundColor: theme.surface,
              borderRadius: isMobile ? '1rem' : '0.75rem',
              padding: isMobile ? '1.25rem' : '1.5rem',
              maxWidth: isMobile ? '100%' : '450px',
              width: '100%',
              border: `2px solid ${theme.border}`,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} color="#f59e0b" />
              <h3 style={{ fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)', fontWeight: '600', color: theme.text, flex: 1 }}>
                Confirmare Dezactivare
              </h3>
              <button
                onClick={() => {
                  setShowRemoveConfirmModal(false);
                  setRestrictionToRemove(null);
                }}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.textSecondary,
                }}
              >
                <X size={isMobile ? 20 : 24} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', color: theme.text, lineHeight: '1.6', marginBottom: '1rem' }}>
                Ești sigur că vrei să dezactivezi această restricție?
              </p>
              <div style={{
                padding: '0.875rem',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                marginBottom: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ color: getRestrictionTypeColor(restrictionToRemove.restriction_type) }}>
                    {getRestrictionTypeIcon(restrictionToRemove.restriction_type)}
                  </div>
                  <span style={{ fontWeight: '600', color: theme.text, fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                    {getRestrictionTypeLabel(restrictionToRemove.restriction_type)}
                  </span>
                </div>
                <div style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', color: theme.textSecondary, marginTop: '0.5rem' }}>
                  <strong>Motiv:</strong> {restrictionToRemove.reason}
                </div>
                {selectedUser && (
                  <div style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', color: theme.textSecondary, marginTop: '0.5rem' }}>
                    <strong>Utilizator:</strong> {selectedUser.username}
                  </div>
                )}
              </div>

              {/* Input pentru motivul dezactivării */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', fontWeight: '500', color: theme.text }}>
                  Motiv Dezactivare <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  placeholder="Descrie motivul pentru care dezactivezi această restricție..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.375rem',
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowRemoveConfirmModal(false);
                  setRestrictionToRemove(null);
                  setDeactivationReason('');
                }}
                disabled={removeRestrictionMutation.isPending}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  backgroundColor: theme.background,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.375rem',
                  color: theme.text,
                  cursor: removeRestrictionMutation.isPending ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)',
                  opacity: removeRestrictionMutation.isPending ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!removeRestrictionMutation.isPending) {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!removeRestrictionMutation.isPending) {
                    e.currentTarget.style.backgroundColor = theme.background;
                  }
                }}
              >
                Anulează
              </button>
              <button
                onClick={() => {
                  if (restrictionToRemove) {
                    removeRestrictionMutation.mutate({ 
                      restrictionId: restrictionToRemove.id,
                      restrictionType: restrictionToRemove.restriction_type,
                      deactivationReason: deactivationReason
                    });
                  }
                }}
                disabled={removeRestrictionMutation.isPending || !deactivationReason.trim() || deactivationReason.trim().length < 3}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  backgroundColor: removeRestrictionMutation.isPending ? theme.border : '#10b981',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: '#ffffff',
                  cursor: removeRestrictionMutation.isPending ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  if (!removeRestrictionMutation.isPending) {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!removeRestrictionMutation.isPending) {
                    e.currentTarget.style.backgroundColor = '#10b981';
                  }
                }}
              >
                <CheckCircle size={18} />
                {removeRestrictionMutation.isPending ? 'Se dezactivează...' : 'Dezactivează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
