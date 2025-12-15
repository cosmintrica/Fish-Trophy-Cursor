/**
 * Sidebar cu informații despre utilizatorul care a postat
 * Redesign complet cu locație, posturi, putere rep, reputație cu progress bar
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import type { MessagePost } from './types';

interface MessageSidebarProps {
  post: MessagePost;
  isOriginalPost: boolean;
  isMobile: boolean;
  onGearClick: () => void;
  userGear?: any[];
  isLoadingGear?: boolean;
}

export default function MessageSidebar({ post, isOriginalPost, isMobile, onGearClick, userGear = [], isLoadingGear = false }: MessageSidebarProps) {
  const { theme } = useTheme();
  const { forumUser } = useAuth();
  const { showToast } = useToast();

  const getSeniorityRank = (rank: string) => {
    const seniorityRanks = {
      'ou_de_peste': '🥚 Ou de Pește',
      'puiet': '🐟 Puiet',
      'pui_de_crap': '🐠 Pui de Crap',
      'crap_junior': '🐡 Crap Junior',
      'crap_senior': '🎣 Crap Senior',
      'maestru_pescar': '🏆 Maestru Pescar',
      'legenda_apelor': '👑 Legenda Apelor',
      'pescar': '🎣 Pescar', // Fallback pentru compatibilitate
      'moderator': '🟣 Moderator',
      'administrator': '🔴 Administrator',
      'founder': '👑 Founder'
    };
    return seniorityRanks[rank as keyof typeof seniorityRanks] || '🎣 Pescar';
  };

  const getRespectColor = (respect: number) => {
    if (respect >= 50) return theme.secondary;
    if (respect >= 20) return theme.primary;
    if (respect >= 0) return theme.textSecondary;
    return '#dc2626';
  };

  // Calculează progresul reputației bazat pe reputation_power (0-7) și reputation_points
  const getReputationProgress = () => {
    const reputationPoints = post.respect || 0;
    const reputationPower = post.authorReputationPower || 0;
    
    // Praguri pentru fiecare nivel de putere (din reputation.ts)
    const thresholds = [0, 50, 200, 500, 1000, 2500, 5000, 10000];
    
    if (reputationPower >= 7) {
      return { levelProgress: 100, currentLevel: 7, nextLevel: null };
    }
    
    const currentThreshold = thresholds[reputationPower];
    const nextThreshold = thresholds[reputationPower + 1];
    const range = nextThreshold - currentThreshold;
    const progress = ((reputationPoints - currentThreshold) / range) * 100;
    
    // Progresul în cadrul nivelului curent (0-100%)
    const levelProgress = Math.max(0, Math.min(100, progress));
    
    return { 
      levelProgress, 
      currentLevel: reputationPower, 
      nextLevel: reputationPower + 1,
      currentThreshold,
      nextThreshold
    };
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
      return `${hours}:${minutes}`;
    } else {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }
  };

  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const reportButtonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [showGearPopup, setShowGearPopup] = useState(false);
  const gearButtonRef = useRef<HTMLButtonElement>(null);
  const [gearPopupPosition, setGearPopupPosition] = useState<{ top: number; left: number } | null>(null);

  // handleReport nu mai este necesar - popup-ul se deschide/închide la click pe buton

  const reputationProgress = getReputationProgress();

  // Calculează poziția popup-ului când se deschide - jos, magnetic legat de buton
  useEffect(() => {
    if (showReportInput && reportButtonRef.current) {
      const rect = reportButtonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 8, // 8px sub buton
        left: rect.left
      });
    } else {
      setPopupPosition(null);
    }
  }, [showReportInput, isMobile]);

  // Calculează poziția popup-ului pentru gear - jos, magnetic legat de buton
  useEffect(() => {
    if (showGearPopup && gearButtonRef.current) {
      const rect = gearButtonRef.current.getBoundingClientRect();
      setGearPopupPosition({
        top: rect.bottom + 8, // 8px sub buton
        left: rect.left
      });
    } else {
      setGearPopupPosition(null);
    }
  }, [showGearPopup, isMobile]);

  // Închide popup-ul când se dă click în afara lui
  useEffect(() => {
    if (!showReportInput && !showGearPopup) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showReportInput) {
        if (
          reportButtonRef.current &&
          !reportButtonRef.current.contains(target) &&
          !target.closest(`[id^="report-popup-"]`)
        ) {
          setShowReportInput(false);
          setReportReason('');
        }
      }
      if (showGearPopup) {
        if (
          gearButtonRef.current &&
          !gearButtonRef.current.contains(target) &&
          !target.closest(`[id^="gear-popup-"]`)
        ) {
          setShowGearPopup(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReportInput, showGearPopup]);

  return (
    <div style={{
      width: isMobile ? '100px' : '200px',
      minWidth: isMobile ? '100px' : '200px',
      maxWidth: isMobile ? '100px' : '200px',
      backgroundColor: isOriginalPost ? theme.primary + '15' : theme.surface,
      borderRight: `1px solid ${theme.border}`,
      padding: isMobile ? '0.5rem 0.375rem' : '1.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      flexShrink: 0,
      overflow: 'hidden',
      gap: isMobile ? '0.375rem' : '0.5rem'
    }}>
      {/* Avatar */}
      <div
        style={{
          width: isMobile ? '2.5rem' : '4rem',
          height: isMobile ? '2.5rem' : '4rem',
          borderRadius: '50%',
          background: post.authorAvatar 
            ? `url(${post.authorAvatar}) center/cover`
            : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: post.authorAvatar ? 'transparent' : 'white',
          fontSize: isMobile ? '1rem' : '1.5rem',
          fontWeight: '600',
          marginBottom: isMobile ? '0.25rem' : '0.5rem',
          border: `2px solid ${theme.border}`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          flexShrink: 0
        }}
      >
        {!post.authorAvatar && post.author.charAt(0).toUpperCase()}
      </div>

      {/* Nume utilizator */}
      <Link
        to={`/forum/user/${encodeURIComponent(post.author)}`}
        style={{
          fontWeight: '600',
          color: theme.primary,
          fontSize: isMobile ? '0.6875rem' : '0.875rem',
          marginBottom: '0.25rem',
          wordBreak: 'break-word',
          lineHeight: '1.2',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: isMobile ? 2 : 3,
          WebkitBoxOrient: 'vertical',
          textDecoration: 'none',
          transition: 'color 0.2s',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none';
        }}
      >
        {post.author}
      </Link>

      {/* Rang vechime */}
      <div style={{
        fontSize: isMobile ? '0.5625rem' : '0.75rem',
        color: theme.textSecondary,
        textAlign: 'center',
        lineHeight: '1.2',
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical'
      }}>
        {getSeniorityRank(post.authorRank)}
      </div>

      {/* Locație */}
      {post.authorLocation && (
        <div style={{
          fontSize: isMobile ? '0.5625rem' : '0.6875rem',
          color: theme.textSecondary,
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          📍 {post.authorLocation}
        </div>
      )}

      {/* Posturi - Text simplu */}
      <div style={{
        fontSize: isMobile ? '0.5625rem' : '0.6875rem',
        color: theme.textSecondary,
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        lineHeight: '1.4'
      }}>
        <span>{isMobile ? 'Post.' : 'Posturi'}:</span>
        <span style={{ 
          fontWeight: '600', 
          color: theme.text,
          marginLeft: '0.25rem'
        }}>
          {post.authorPostCount || 0}
        </span>
      </div>

      {/* Putere Rep - Text simplu */}
      <div style={{
        fontSize: isMobile ? '0.5625rem' : '0.6875rem',
        color: theme.textSecondary,
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        lineHeight: '1.4'
      }}>
        <span>{isMobile ? 'Putere' : 'Putere Rep'}:</span>
        <span style={{ 
          fontWeight: '600', 
          color: theme.primary,
          marginLeft: '0.25rem'
        }}>
          {post.authorReputationPower || 0}/7
        </span>
      </div>

      {/* Reputație - Text simplu */}
      <div style={{
        fontSize: isMobile ? '0.5625rem' : '0.6875rem',
        color: theme.textSecondary,
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        lineHeight: '1.4',
        marginBottom: isMobile ? '0.25rem' : '0.375rem'
      }}>
        <span>{isMobile ? 'Rep.' : 'Reputație'}:</span>
        <span style={{ 
          fontWeight: '600', 
          color: getRespectColor(post.respect || 0),
          marginLeft: '0.25rem'
        }}>
          {post.respect || 0}
        </span>
      </div>

      {/* Progress Bar cu delimitări */}
      <div style={{
        width: '100%',
        marginBottom: isMobile ? '0.375rem' : '0.5rem'
      }}>
        <div style={{
          width: '100%',
          height: isMobile ? '0.5rem' : '0.625rem',
          backgroundColor: theme.border,
          borderRadius: '0.25rem',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex'
        }}>
          {/* Delimitări pentru fiecare nivel (0-7) */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((level) => (
            <div
              key={level}
              style={{
                flex: 1,
                height: '100%',
                borderRight: level < 7 ? `1px solid ${theme.background}` : 'none',
                position: 'relative'
              }}
            />
          ))}
          
          {/* Progresul actual */}
          {(() => {
            const progress = getReputationProgress();
            const levelWidth = 100 / 8; // 8 nivele (0-7)
            const currentLevelStart = progress.currentLevel * levelWidth;
            const levelProgressWidth = (progress.levelProgress / 100) * levelWidth;
            const totalProgress = currentLevelStart + levelProgressWidth;
            
            return (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${totalProgress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
                transition: 'width 0.3s ease',
                zIndex: 1
              }} />
            );
          })()}
        </div>
        
        {/* Etichete nivele (opțional, doar pe desktop) */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.125rem',
            fontSize: '0.5rem',
            color: theme.textSecondary,
            opacity: 0.6
          }}>
            <span>0</span>
            <span>7</span>
          </div>
        )}
      </div>

      {/* Equipment preview */}
      <div style={{ width: '100%', position: 'relative' }}>
        <button
          ref={gearButtonRef}
          style={{
            fontSize: isMobile ? '0.5625rem' : '0.75rem',
            color: theme.primary,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.primary}`,
            borderRadius: '0.375rem',
            padding: isMobile ? '0.25rem 0.375rem' : '0.375rem 0.75rem',
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          onClick={() => {
            if (!showGearPopup) {
              onGearClick();
            }
            setShowGearPopup(!showGearPopup);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.primary;
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.surface;
            e.currentTarget.style.color = theme.primary;
          }}
        >
          {isMobile ? '📋' : '📋 Echipament'}
        </button>

        {/* Popup gear - jos, magnetic legat de buton, fără overlay */}
        {showGearPopup && gearPopupPosition && typeof document !== 'undefined' && createPortal(
          <div
            id={`gear-popup-${post.id}`}
            style={{
              position: 'fixed',
              top: `${gearPopupPosition.top}px`,
              left: `${gearPopupPosition.left}px`,
              zIndex: 1000,
              width: isMobile ? '280px' : '400px',
              maxHeight: isMobile ? '400px' : '500px',
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              padding: '0.75rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              fontWeight: '600',
              color: theme.text,
              marginBottom: '0.25rem'
            }}>
              Echipamente - {post.author}
            </div>
            {isLoadingGear ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: theme.textSecondary, fontSize: isMobile ? '0.6875rem' : '0.75rem' }}>
                Se încarcă echipamentele...
              </div>
            ) : userGear.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: theme.textSecondary, fontSize: isMobile ? '0.6875rem' : '0.75rem' }}>
                Nu există echipamente disponibile
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {userGear.map((item) => {
                  const formatGearType = (type: string) => {
                    const types: { [key: string]: string } = {
                      'undita': 'Undiță',
                      'mulineta': 'Mulinetă',
                      'scaun': 'Scaun',
                      'rucsac': 'Rucsac',
                      'vesta': 'Vestă',
                      'cizme': 'Cizme',
                      'altceva': 'Altceva'
                    };
                    return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
                  };
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: theme.background,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.375rem',
                        fontSize: isMobile ? '0.6875rem' : '0.75rem'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: theme.text, marginBottom: '0.25rem' }}>
                        {formatGearType(item.gear_type)}
                      </div>
                      <div style={{ color: theme.text, marginBottom: '0.125rem' }}>
                        <span style={{ fontWeight: '500' }}>{item.brand}</span>
                        {item.model && <span style={{ color: theme.textSecondary }}> {item.model}</span>}
                      </div>
                      {item.quantity > 1 && (
                        <div style={{ fontSize: isMobile ? '0.625rem' : '0.6875rem', color: theme.textSecondary }}>
                          Cantitate: {item.quantity}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>,
          document.body
        )}
      </div>

      {/* Post stats */}
      <div style={{
        marginTop: 'auto',
        fontSize: isMobile ? '0.5625rem' : '0.75rem',
        color: theme.textSecondary,
        borderTop: `1px solid ${theme.border}`,
        paddingTop: isMobile ? '0.5rem' : '0.75rem',
        width: '100%',
        lineHeight: '1.3'
      }}>
        <div style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {formatSmartDateTime(post.createdAt)}
        </div>
        {isOriginalPost && (
          <div style={{
            marginTop: '0.375rem',
            fontSize: isMobile ? '0.5rem' : '0.625rem',
            padding: isMobile ? '0.125rem 0.25rem' : '0.25rem',
            backgroundColor: theme.primary + '20',
            color: theme.primary,
            borderRadius: '0.25rem',
            fontWeight: '600',
            textAlign: 'center',
            lineHeight: '1.2'
          }}>
            {isMobile ? 'TOPIC' : 'TOPIC STARTER'}
          </div>
        )}
      </div>

      {/* Buton Raportează - sub TOPIC STARTER, mic și discret */}
      {forumUser && post.authorId && forumUser.id !== post.authorId && (
        <div style={{ width: '100%', position: 'relative', marginTop: '0.5rem' }}>
          <button
            ref={reportButtonRef}
            onClick={() => {
              setShowReportInput(!showReportInput);
            }}
            style={{
              fontSize: isMobile ? '0.5rem' : '0.5625rem',
              color: '#ffffff',
              backgroundColor: '#dc2626',
              border: 'none',
              borderRadius: '0.25rem',
              padding: isMobile ? '0.125rem 0.25rem' : '0.1875rem 0.375rem',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              opacity: 0.8
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b91c1c';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.opacity = '0.8';
            }}
          >
            {isMobile ? '🚩' : '🚩 Raportează'}
          </button>
          
          {/* Popup motiv - jos, magnetic legat de buton, fără overlay */}
          {showReportInput && popupPosition && typeof document !== 'undefined' && createPortal(
            <div
              id={`report-popup-${post.id}`}
              style={{
                position: 'fixed',
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`,
                zIndex: 1000,
                width: isMobile ? '280px' : '320px',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                padding: '0.75rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Motivul raportării (min. 10 caractere)..."
                style={{
                  width: '100%',
                  minHeight: isMobile ? '80px' : '100px',
                  padding: '0.5rem',
                  fontSize: isMobile ? '0.6875rem' : '0.75rem',
                  backgroundColor: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.375rem',
                  color: theme.text,
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                maxLength={500}
                autoFocus
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: isMobile ? '0.5625rem' : '0.625rem',
                color: theme.textSecondary
              }}>
                <span style={{
                  color: reportReason.trim().length < 10 ? '#ef4444' : theme.textSecondary,
                  fontSize: isMobile ? '0.5rem' : '0.5625rem'
                }}>
                  {reportReason.trim().length < 10 
                    ? `Mai sunt necesare ${10 - reportReason.trim().length} caractere`
                    : `${500 - reportReason.length} caractere rămase`}
                </span>
              </div>
              {/* Buton separat pentru trimitere - mai mic */}
              <button
                onClick={async () => {
                  if (reportReason.trim().length < 10) {
                    showToast('Motivul trebuie să aibă minim 10 caractere', 'error');
                    return;
                  }
                  setIsSubmittingReport(true);
                  try {
                    const { error } = await supabase
                      .from('forum_reports')
                      .insert({
                        reporter_id: forumUser.id,
                        reported_user_id: post.authorId,
                        post_id: post.id,
                        reason: 'Raportat din sidebar',
                        description: reportReason.trim(),
                        status: 'pending'
                      });

                    if (error) {
                      console.error('Error reporting:', error);
                      showToast('Eroare la raportare', 'error');
                    } else {
                      showToast('Raport trimis cu succes', 'success');
                      setShowReportInput(false);
                      setReportReason('');
                    }
                  } catch (error) {
                    console.error('Error reporting:', error);
                    showToast('Eroare la raportare', 'error');
                  } finally {
                    setIsSubmittingReport(false);
                  }
                }}
                disabled={isSubmittingReport || reportReason.trim().length < 10}
                style={{
                  fontSize: isMobile ? '0.5rem' : '0.5625rem',
                  color: '#ffffff',
                  backgroundColor: isSubmittingReport || reportReason.trim().length < 10 ? '#9ca3af' : '#dc2626',
                  border: 'none',
                  borderRadius: '0.25rem',
                  padding: isMobile ? '0.25rem 0.375rem' : '0.3125rem 0.5rem',
                  cursor: isSubmittingReport || reportReason.trim().length < 10 ? 'not-allowed' : 'pointer',
                  width: '100%',
                  transition: 'all 0.2s',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmittingReport && reportReason.trim().length >= 10) {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmittingReport && reportReason.trim().length >= 10) {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                  }
                }}
              >
                {isSubmittingReport ? '⏳ Se trimite...' : 'Trimite raport'}
              </button>
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
}
