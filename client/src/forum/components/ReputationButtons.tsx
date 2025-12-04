import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { useReputation, PostReputation } from '../hooks/useReputation';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

interface ReputationButtonsProps {
  postId: string;
  receiverUserId: string;
  onReputationChange?: () => void;
}

export default function ReputationButtons({ 
  postId, 
  receiverUserId,
  onReputationChange 
}: ReputationButtonsProps) {
  const { forumUser } = useAuth();
  const { theme } = useTheme();
  const { getPostReputation, giveReputation, removeReputation, loading } = useReputation();
  
  const [reputation, setReputation] = useState<PostReputation | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentType, setCommentType] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState('');

  // Încarcă reputația la mount și când se schimbă postId
  useEffect(() => {
    if (postId) {
      loadReputation();
    }
  }, [postId]);

  const loadReputation = async () => {
    const data = await getPostReputation(postId);
    if (data) {
      setReputation(data);
    }
  };

  const handleLike = async () => {
    if (!forumUser) {
      toast.error('Trebuie să fii autentificat pentru a da like');
      return;
    }

    if (reputation?.has_user_voted) {
      // Dacă a votat deja, șterge votul
      const success = await removeReputation(postId);
      if (success) {
        await loadReputation();
        onReputationChange?.();
      }
      return;
    }

    // Like simplu (fără comentariu)
    const success = await giveReputation({
      post_id: postId,
      receiver_user_id: receiverUserId,
      points: 1
    });

    if (success) {
      await loadReputation();
      onReputationChange?.();
    }
  };

  const handleDislike = async () => {
    if (!forumUser) {
      toast.error('Trebuie să fii autentificat pentru a da dislike');
      return;
    }

    if (reputation?.has_user_voted && reputation.user_vote?.points === -1) {
      // Dacă a dat dislike deja, șterge votul
      const success = await removeReputation(postId);
      if (success) {
        await loadReputation();
        onReputationChange?.();
      }
      return;
    }

    // Deschide modal pentru comentariu (dislike necesită putere 1+)
    setCommentType(-1);
    setShowCommentModal(true);
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim() || comment.trim().length < 3) {
      toast.error('Comentariul trebuie să aibă minimum 3 caractere');
      return;
    }

    if (!commentType) return;

    const success = await giveReputation({
      post_id: postId,
      receiver_user_id: receiverUserId,
      points: commentType,
      comment: comment.trim()
    });

    if (success) {
      setShowCommentModal(false);
      setComment('');
      setCommentType(null);
      await loadReputation();
      onReputationChange?.();
    }
  };

  const handleLikeWithComment = () => {
    setCommentType(1);
    setShowCommentModal(true);
  };

  // Verifică dacă utilizatorul poate da dislike (putere 1+ = 50+ reputație)
  const canDislike = forumUser && (forumUser.reputation_power || 0) >= 1;

  // Verifică dacă e propriul post
  const isOwnPost = forumUser?.id === receiverUserId;

  if (isOwnPost) {
    return null; // Nu afișa butoanele pe propriul post
  }

  const userVote = reputation?.user_vote;
  const hasLiked = userVote && userVote.points > 0;
  const hasDisliked = userVote && userVote.points < 0;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '0.25rem' : '0.375rem',
        marginTop: 0
      }}>
        {/* Buton Like */}
        <button
          onClick={handleLike}
          disabled={loading || !forumUser}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.125rem',
            padding: isMobile ? '0.25rem 0.375rem' : '0.3125rem 0.5rem',
            borderRadius: '0.375rem',
            border: `1px solid ${hasLiked ? theme.primary : theme.border}`,
            backgroundColor: hasLiked ? theme.primary : 'transparent',
            color: hasLiked ? 'white' : theme.text,
            cursor: loading || !forumUser ? 'not-allowed' : 'pointer',
            fontSize: isMobile ? '0.625rem' : '0.6875rem',
            fontWeight: '500',
            transition: 'all 0.2s',
            opacity: loading || !forumUser ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading && forumUser) {
              e.currentTarget.style.backgroundColor = hasLiked ? theme.primary : theme.surfaceHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && forumUser) {
              e.currentTarget.style.backgroundColor = hasLiked ? theme.primary : 'transparent';
            }
          }}
          title={hasLiked ? 'Click pentru a șterge like-ul' : 'Dă like (click dreapta pentru comentariu)'}
          onContextMenu={(e) => {
            e.preventDefault();
            if (forumUser && !hasLiked) {
              handleLikeWithComment();
            }
          }}
        >
          <ThumbsUp style={{ width: isMobile ? '0.75rem' : '0.8125rem', height: isMobile ? '0.75rem' : '0.8125rem' }} />
          <span>{reputation?.like_count || 0}</span>
        </button>

        {/* Buton Dislike */}
        {canDislike ? (
          <button
            onClick={handleDislike}
            disabled={loading || !forumUser}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.125rem',
              padding: isMobile ? '0.25rem 0.375rem' : '0.3125rem 0.5rem',
              borderRadius: '0.375rem',
              border: `1px solid ${hasDisliked ? '#dc2626' : theme.border}`,
              backgroundColor: hasDisliked ? '#dc2626' : 'transparent',
              color: hasDisliked ? 'white' : theme.text,
              cursor: loading || !forumUser ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? '0.625rem' : '0.6875rem',
              fontWeight: '500',
              transition: 'all 0.2s',
              opacity: loading || !forumUser ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading && forumUser) {
                e.currentTarget.style.backgroundColor = hasDisliked ? '#dc2626' : theme.surfaceHover;
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && forumUser) {
                e.currentTarget.style.backgroundColor = hasDisliked ? '#dc2626' : 'transparent';
              }
            }}
            title={hasDisliked ? 'Click pentru a șterge dislike-ul' : 'Dă dislike (click dreapta pentru comentariu)'}
            onContextMenu={(e) => {
              e.preventDefault();
              if (forumUser && !hasDisliked) {
                setCommentType(-1);
                setShowCommentModal(true);
              }
            }}
          >
            <ThumbsDown style={{ width: isMobile ? '0.75rem' : '0.8125rem', height: isMobile ? '0.75rem' : '0.8125rem' }} />
            <span>{reputation?.dislike_count || 0}</span>
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.125rem',
              padding: isMobile ? '0.25rem 0.375rem' : '0.3125rem 0.5rem',
              borderRadius: '0.375rem',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.surface,
              color: theme.textSecondary,
              fontSize: isMobile ? '0.625rem' : '0.6875rem',
              cursor: 'not-allowed',
              opacity: 0.5
            }}
            title="Ai nevoie de minimum 50 puncte reputație pentru a da dislike"
          >
            <ThumbsDown style={{ width: isMobile ? '0.75rem' : '0.8125rem', height: isMobile ? '0.75rem' : '0.8125rem' }} />
            <span>{reputation?.dislike_count || 0}</span>
          </div>
        )}

        {/* Total Points */}
        {reputation && reputation.total_points !== 0 && (
          <div style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: reputation.total_points > 0 ? '#10b981' : '#dc2626',
            marginLeft: '0.5rem'
          }}>
            {reputation.total_points > 0 ? '+' : ''}{reputation.total_points}
          </div>
        )}
      </div>

      {/* Modal pentru comentariu */}
      {showCommentModal && (
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
          zIndex: 1000
        }}
        onClick={() => {
          setShowCommentModal(false);
          setComment('');
          setCommentType(null);
        }}
        >
          <div
            style={{
              backgroundColor: theme.surface,
              borderRadius: '0.5rem',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '90%',
              border: `1px solid ${theme.border}`,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: theme.text
              }}>
                {commentType === 1 ? 'Like cu comentariu' : 'Dislike cu comentariu'}
              </h3>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setComment('');
                  setCommentType(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.textSecondary,
                  padding: '0.25rem'
                }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            <p style={{
              fontSize: '0.875rem',
              color: theme.textSecondary,
              marginBottom: '1rem'
            }}>
              {commentType === 1 
                ? 'Adaugă un comentariu (minimum 3 caractere) pentru a amplifica efectul like-ului bazat pe puterea ta de reputație.'
                : 'Adaugă un comentariu (minimum 3 caractere) pentru a amplifica efectul dislike-ului bazat pe puterea ta de reputație.'}
            </p>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Explicați de ce acordați această reputație..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.background,
                color: theme.text,
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '1rem'
              }}
            />

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem'
            }}>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setComment('');
                  setCommentType(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: 'transparent',
                  color: theme.text,
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Anulează
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={loading || comment.trim().length < 3}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: commentType === 1 ? theme.primary : '#dc2626',
                  color: 'white',
                  cursor: loading || comment.trim().length < 3 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  opacity: loading || comment.trim().length < 3 ? 0.6 : 1
                }}
              >
                {loading ? 'Se trimite...' : 'Trimite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

