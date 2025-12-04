/**
 * Admin Marketplace Panel Component
 * Panel pentru verificare vânzători piață (aprobare/respingere conturi pentru vânzare)
 * Mobile-first design optimizat
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/query-client';
import { Search, ShoppingBag, CheckCircle, X, AlertCircle, Clock, User, Mail, Phone } from 'lucide-react';

interface SalesVerification {
  id: string;
  user_id: string;
  account_age_days: number;
  reputation_points: number;
  post_count: number;
  is_eligible: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  successful_sales: number;
  failed_sales: number;
  last_checked_at: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

const ELIGIBILITY_REQUIREMENTS = {
  account_age_days: 15,
  reputation_points: 10,
  post_count: 25,
  email_verified: true,
};

export default function AdminMarketplace() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEligible, setFilterEligible] = useState<'all' | 'eligible' | 'not_eligible'>('all');
  const [selectedVerification, setSelectedVerification] = useState<SalesVerification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch verificări vânzători
  const { data: verifications = [], isLoading: loadingVerifications } = useQuery<SalesVerification[]>({
    queryKey: ['admin-marketplace-verifications', filterEligible],
    queryFn: async () => {
      let query = supabase
        .from('forum_sales_verification')
        .select('*')
        .order('last_checked_at', { ascending: false });

      if (filterEligible === 'eligible') {
        query = query.eq('is_eligible', true);
      } else if (filterEligible === 'not_eligible') {
        query = query.eq('is_eligible', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Obține username-urile
      const userIds = [...new Set((data || []).map(v => v.user_id))];
      let usersMap = new Map<string, { username: string; avatar_url?: string }>();
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('forum_users')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        if (usersData) {
          usersMap = new Map(usersData.map(u => [u.user_id, { username: u.username, avatar_url: u.avatar_url }]));
        }
      }

      return (data || []).map(verification => ({
        ...verification,
        username: usersMap.get(verification.user_id)?.username || 'Unknown',
        avatar_url: usersMap.get(verification.user_id)?.avatar_url,
      }));
    },
    staleTime: 30 * 1000,
  });

  // Căutare utilizatori (doar cei cu verificare în DB)
  const { data: searchResults = [], isLoading: searching } = useQuery<SalesVerification[]>({
    queryKey: ['admin-marketplace-search', searchQuery.trim()],
    queryFn: async () => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery || trimmedQuery.length < 2) return [];

      // Caută în forum_users după username
      const { data: users, error: usersError } = await supabase
        .from('forum_users')
        .select('user_id, username, avatar_url')
        .ilike('username', `%${trimmedQuery}%`)
        .limit(10);

      if (usersError) {
        console.error('Error searching users:', usersError);
        throw usersError;
      }
      
      if (!users || users.length === 0) return [];

      const userIds = users.map(u => u.user_id);

      // Obține verificările pentru acești utilizatori (doar cei cu verificare)
      const { data: verifications, error: verificationsError } = await supabase
        .from('forum_sales_verification')
        .select('*')
        .in('user_id', userIds);

      if (verificationsError) {
        console.error('Error fetching verifications:', verificationsError);
        throw verificationsError;
      }

      const usersMap = new Map(users.map(u => [u.user_id, { username: u.username, avatar_url: u.avatar_url }]));

      // Returnează doar utilizatorii care au verificare în DB
      return (verifications || []).map(verification => ({
        ...verification,
        username: usersMap.get(verification.user_id)?.username || 'Unknown',
        avatar_url: usersMap.get(verification.user_id)?.avatar_url,
      }));
    },
    enabled: searchQuery.trim().length >= 2,
    staleTime: 30 * 1000,
  });

  // Mutation pentru actualizare eligibilitate
  const updateEligibilityMutation = useMutation({
    mutationFn: async ({ userId, isEligible }: { userId: string; isEligible: boolean }) => {
      const { error } = await supabase
        .from('forum_sales_verification')
        .update({
          is_eligible: isEligible,
          last_checked_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
      return { isEligible };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-search'] });
      showToast(`Eligibilitate ${data.isEligible ? 'aprobată' : 'respină'} cu succes!`, 'success');
      
      if (selectedVerification) {
        setSelectedVerification({
          ...selectedVerification,
          is_eligible: data.isEligible,
          last_checked_at: new Date().toISOString()
        });
      }
    },
    onError: (error: Error) => {
      showToast(error.message || 'Eroare la actualizarea eligibilității', 'error');
    },
  });

  const handleVerificationClick = (verification: SalesVerification) => {
    setSelectedVerification(verification);
    setShowDetailsModal(true);
  };

  const handleEligibilityToggle = (verification: SalesVerification, isEligible: boolean) => {
    updateEligibilityMutation.mutate({
      userId: verification.user_id,
      isEligible
    });
  };

  const checkEligibility = (verification: SalesVerification): { eligible: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    
    if (verification.account_age_days < ELIGIBILITY_REQUIREMENTS.account_age_days) {
      reasons.push(`Contul are doar ${verification.account_age_days} zile (minim ${ELIGIBILITY_REQUIREMENTS.account_age_days})`);
    }
    if (verification.reputation_points < ELIGIBILITY_REQUIREMENTS.reputation_points) {
      reasons.push(`Reputație insuficientă: ${verification.reputation_points} puncte (minim ${ELIGIBILITY_REQUIREMENTS.reputation_points})`);
    }
    if (verification.post_count < ELIGIBILITY_REQUIREMENTS.post_count) {
      reasons.push(`Postări insuficiente: ${verification.post_count} (minim ${ELIGIBILITY_REQUIREMENTS.post_count})`);
    }
    if (!verification.email_verified) {
      reasons.push('Email-ul nu este verificat');
    }

    return {
      eligible: reasons.length === 0,
      reasons
    };
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

  const displayVerifications = searchQuery.trim().length >= 2 ? searchResults : verifications;
  const isLoading = searchQuery.trim().length >= 2 ? searching : loadingVerifications;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ 
        fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
        fontWeight: '700', 
        color: theme.text, 
        marginBottom: '1.5rem' 
      }}>
        Verificare Vânzători Piață
      </h2>

      {/* Căutare și filtre */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilterEligible('all')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filterEligible === 'all' ? theme.primary : theme.background,
              color: filterEligible === 'all' ? 'white' : theme.text,
              border: `1px solid ${filterEligible === 'all' ? theme.primary : theme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Toate
          </button>
          <button
            onClick={() => setFilterEligible('eligible')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filterEligible === 'eligible' ? '#10b981' : theme.background,
              color: filterEligible === 'eligible' ? 'white' : theme.text,
              border: `1px solid ${filterEligible === 'eligible' ? '#10b981' : theme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Eligibili
          </button>
          <button
            onClick={() => setFilterEligible('not_eligible')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filterEligible === 'not_eligible' ? '#ef4444' : theme.background,
              color: filterEligible === 'not_eligible' ? 'white' : theme.text,
              border: `1px solid ${filterEligible === 'not_eligible' ? '#ef4444' : theme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Neeligibili
          </button>
        </div>
      </div>

      {/* Listă verificări */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: theme.textSecondary }}>
          {searchQuery.trim().length >= 2 ? 'Se caută...' : 'Se încarcă verificările...'}
        </div>
      ) : displayVerifications.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: theme.textSecondary,
          backgroundColor: theme.surface,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <div>
            {searchQuery.trim().length >= 2 
              ? `Nu s-au găsit verificări pentru "${searchQuery}"`
              : `Nu există verificări ${filterEligible !== 'all' ? `cu status "${filterEligible === 'eligible' ? 'eligibili' : 'neeligibili'}"` : ''}`
            }
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayVerifications.map((verification) => {
            const eligibilityCheck = checkEligibility(verification);
            const isEligible = verification.is_eligible;
            
            return (
              <div
                key={verification.id}
                style={{
                  padding: '1rem',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  backgroundColor: theme.surface,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleVerificationClick(verification)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surface;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '200px' }}>
                    {verification.avatar_url ? (
                      <img 
                        src={verification.avatar_url} 
                        alt={verification.username}
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        backgroundColor: theme.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '1.25rem'
                      }}>
                        {verification.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: theme.text, marginBottom: '0.25rem' }}>
                        {verification.username}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: theme.textSecondary }}>
                        {verification.account_age_days} zile cont • {verification.reputation_points} rep • {verification.post_count} postări
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: isEligible ? '#10b98120' : '#ef444420',
                      color: isEligible ? '#10b981' : '#ef4444',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      {isEligible ? <CheckCircle size={14} /> : <X size={14} />}
                      {isEligible ? 'Eligibil' : 'Neeligibil'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEligibilityToggle(verification, true);
                        }}
                        disabled={updateEligibilityMutation.isPending || isEligible}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: isEligible ? theme.border : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: (isEligible || updateEligibilityMutation.isPending) ? 'not-allowed' : 'pointer',
                          opacity: (isEligible || updateEligibilityMutation.isPending) ? 0.5 : 1
                        }}
                      >
                        Aprobă
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEligibilityToggle(verification, false);
                        }}
                        disabled={updateEligibilityMutation.isPending || !isEligible}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: !isEligible ? theme.border : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: (!isEligible || updateEligibilityMutation.isPending) ? 'not-allowed' : 'pointer',
                          opacity: (!isEligible || updateEligibilityMutation.isPending) ? 0.5 : 1
                        }}
                      >
                        Respinge
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalii verificare */}
      {showDetailsModal && selectedVerification && (
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
        onClick={() => {
          setShowDetailsModal(false);
          setSelectedVerification(null);
        }}
        >
          <div style={{
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            border: `1px solid ${theme.border}`,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: theme.text }}>
                Detalii Verificare Vânzător
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedVerification(null);
                }}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Utilizator */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                  <User size={18} />
                  Utilizator
                </label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.background,
                  borderRadius: '0.5rem',
                  color: theme.text
                }}>
                  {selectedVerification.username}
                </div>
              </div>

              {/* Status eligibilitate */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                  Status Eligibilitate
                </label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: selectedVerification.is_eligible ? '#10b98120' : '#ef444420',
                  borderRadius: '0.5rem',
                  display: 'inline-block'
                }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: selectedVerification.is_eligible ? '#10b981' : '#ef4444',
                    color: 'white',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {selectedVerification.is_eligible ? <CheckCircle size={14} /> : <X size={14} />}
                    {selectedVerification.is_eligible ? 'Eligibil' : 'Neeligibil'}
                  </span>
                </div>
              </div>

              {/* Criterii eligibilitate */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                  Criterii Eligibilitate
                </label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.background,
                  borderRadius: '0.5rem'
                }}>
                  {(() => {
                    const check = checkEligibility(selectedVerification);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.875rem', color: theme.text }}>
                          <strong>Vârsta cont:</strong> {selectedVerification.account_age_days} zile 
                          {selectedVerification.account_age_days >= ELIGIBILITY_REQUIREMENTS.account_age_days ? (
                            <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>✓</span>
                          ) : (
                            <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>✗ (minim {ELIGIBILITY_REQUIREMENTS.account_age_days})</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: theme.text }}>
                          <strong>Reputație:</strong> {selectedVerification.reputation_points} puncte
                          {selectedVerification.reputation_points >= ELIGIBILITY_REQUIREMENTS.reputation_points ? (
                            <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>✓</span>
                          ) : (
                            <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>✗ (minim {ELIGIBILITY_REQUIREMENTS.reputation_points})</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: theme.text }}>
                          <strong>Postări:</strong> {selectedVerification.post_count}
                          {selectedVerification.post_count >= ELIGIBILITY_REQUIREMENTS.post_count ? (
                            <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>✓</span>
                          ) : (
                            <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>✗ (minim {ELIGIBILITY_REQUIREMENTS.post_count})</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: theme.text }}>
                          <strong>Email verificat:</strong> {selectedVerification.email_verified ? 'Da' : 'Nu'}
                          {selectedVerification.email_verified ? (
                            <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>✓</span>
                          ) : (
                            <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>✗</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: theme.text }}>
                          <strong>Telefon verificat:</strong> {selectedVerification.phone_verified ? 'Da' : 'Nu'}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Statistici vânzări */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                  Statistici Vânzări
                </label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.background,
                  borderRadius: '0.5rem',
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ fontSize: '0.875rem', color: theme.text }}>
                    <strong>Reușite:</strong> {selectedVerification.successful_sales}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: theme.text }}>
                    <strong>Eșuate:</strong> {selectedVerification.failed_sales}
                  </div>
                </div>
              </div>

              {/* Ultima verificare */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                  <Clock size={18} />
                  Ultima Verificare
                </label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.background,
                  borderRadius: '0.5rem',
                  color: theme.text
                }}>
                  {formatDate(selectedVerification.last_checked_at)}
                </div>
              </div>

              {/* Acțiuni */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    handleEligibilityToggle(selectedVerification, true);
                    setShowDetailsModal(false);
                  }}
                  disabled={updateEligibilityMutation.isPending || selectedVerification.is_eligible}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    backgroundColor: selectedVerification.is_eligible ? theme.border : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: (selectedVerification.is_eligible || updateEligibilityMutation.isPending) ? 'not-allowed' : 'pointer',
                    opacity: (selectedVerification.is_eligible || updateEligibilityMutation.isPending) ? 0.5 : 1
                  }}
                >
                  Aprobă Vânzător
                </button>
                <button
                  onClick={() => {
                    handleEligibilityToggle(selectedVerification, false);
                    setShowDetailsModal(false);
                  }}
                  disabled={updateEligibilityMutation.isPending || !selectedVerification.is_eligible}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    backgroundColor: !selectedVerification.is_eligible ? theme.border : '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: (!selectedVerification.is_eligible || updateEligibilityMutation.isPending) ? 'not-allowed' : 'pointer',
                    opacity: (!selectedVerification.is_eligible || updateEligibilityMutation.isPending) ? 0.5 : 1
                  }}
                >
                  Respinge Vânzător
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

