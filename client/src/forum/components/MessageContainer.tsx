import { useState } from 'react';
import { Heart, MessageSquare, Quote, MoreHorizontal, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import ReputationButtons from './ReputationButtons';

interface MessageContainerProps {
  post: {
    id: string;
    content: string;
    author: string;
    authorId?: string; // ID-ul utilizatorului autorului (pentru reputație)
    authorRank: string;
    authorAvatar?: string;
    createdAt: string;
    editedAt?: string;
    likes: number;
    dislikes: number;
    respect?: number; // Nou: puncte de respect
  };
  isOriginalPost?: boolean;
  onRespectChange?: (postId: string, delta: number, comment: string) => void;
  onReply?: (postId: string) => void;
  onQuote?: (postId: string) => void;
  onReputationChange?: () => void; // Callback când se schimbă reputația
}

export default function MessageContainer({
  post,
  isOriginalPost = false,
  onRespectChange,
  onReply,
  onQuote,
  onReputationChange
}: MessageContainerProps) {
  const { theme } = useTheme();
  const { forumUser } = useAuth();
  const [showRespectModal, setShowRespectModal] = useState(false);
  const [respectComment, setRespectComment] = useState('');

  console.log('[MessageContainer] Rendering post:', post.id, post.author, post.content.substring(0, 50) + '...');

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'acum';
    if (diffInMinutes < 60) return `acum ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `acum ${Math.floor(diffInMinutes / 60)}h`;
    return `acum ${Math.floor(diffInMinutes / 1440)}z`;
  };

  const getSeniorityRank = (rank: string) => {
    // Ranguri pe vechime, nu pe postări
    const seniorityRanks = {
      'incepator': '🆕 Pescar Nou',
      'pescar': '🎣 Pescar Activ',
      'expert': '🐟 Pescar Experimentat',
      'maestru': '🏆 Pescar Veteran',
      'moderator': '🟣 Moderator',
      'administrator': '🔴 Administrator',
      'founder': '👑 Founder'
    };
    return seniorityRanks[rank as keyof typeof seniorityRanks] || '🎣 Pescar';
  };

  const getRespectColor = (respect: number) => {
    if (respect >= 50) return theme.secondary; // Verde pentru respect mare
    if (respect >= 20) return theme.primary;   // Albastru pentru respect mediu
    if (respect >= 0) return theme.textSecondary; // Gri pentru respect mic
    return '#dc2626'; // Roșu pentru respect negativ
  };

  return (
    <div
      style={{
        backgroundColor: theme.surface,
        border: `2px solid ${theme.border}`,
        borderRadius: '0.75rem',
        marginBottom: '1.5rem',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Layout: Sidebar + Content */}
      <div style={{ display: 'flex', minHeight: '200px' }}>
        {/* Sidebar cu info utilizator */}
        <div style={{
          width: '200px',
          backgroundColor: isOriginalPost ? theme.primary + '15' : theme.background,
          borderRight: `1px solid ${theme.border}`,
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          flexShrink: 0
        }}>
          {/* Avatar */}
          <div
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              border: `3px solid ${theme.border}`,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            {post.author.charAt(0).toUpperCase()}
          </div>

          {/* Nume utilizator */}
          <div style={{
            fontWeight: '600',
            color: theme.text,
            fontSize: '0.875rem',
            marginBottom: '0.5rem',
            wordBreak: 'break-word'
          }}>
            {post.author}
          </div>

          {/* Rang vechime */}
          <div style={{
            fontSize: '0.75rem',
            color: theme.textSecondary,
            marginBottom: '0.75rem'
          }}>
            {getSeniorityRank(post.authorRank)}
          </div>

          {/* Respect */}
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '0.375rem',
            padding: '0.5rem',
            marginBottom: '0.75rem',
            width: '100%'
          }}>
            <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>
              Respect Pescar
            </div>
            <div style={{
              fontWeight: '600',
              fontSize: '1rem',
              color: getRespectColor(post.respect || 0)
            }}>
              {post.respect >= 0 ? '+' : ''}{post.respect || 0}
            </div>
          </div>

          {/* Equipment preview */}
          <button
            style={{
              fontSize: '0.75rem',
              color: theme.primary,
              backgroundColor: 'transparent',
              border: `1px solid ${theme.primary}`,
              borderRadius: '0.375rem',
              padding: '0.375rem 0.75rem',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s'
            }}
            onClick={() => console.log('Show equipment for', post.author)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.primary;
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.primary;
            }}
          >
            📋 Echipament
          </button>

          {/* Post stats */}
          <div style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: theme.textSecondary,
            borderTop: `1px solid ${theme.border}`,
            paddingTop: '0.75rem',
            width: '100%'
          }}>
            <div style={{ marginBottom: '0.25rem' }}>
              Post #{Math.floor(Math.random() * 1000) + 1}
            </div>
            <div>
              {formatTimeAgo(post.createdAt)}
            </div>
            {isOriginalPost && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.625rem',
                padding: '0.25rem',
                backgroundColor: theme.primary + '20',
                color: theme.primary,
                borderRadius: '0.25rem',
                fontWeight: '600'
              }}>
                TOPIC STARTER
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Message content */}
          <div style={{
            flex: 1,
            padding: '1.5rem',
            fontSize: '0.875rem',
            color: theme.text,
            lineHeight: '1.6'
          }}>
            {post.content}
          </div>

          {/* Actions */}
          <div style={{
            backgroundColor: theme.background,
            borderTop: `1px solid ${theme.border}`,
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Respect buttons */}
              <button
                onClick={() => onRespectChange?.(post.id, 1, 'Postare utilă!')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.secondary}`,
                  borderRadius: '0.375rem',
                  color: theme.secondary,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.secondary;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.secondary;
                }}
              >
                🎣 Respect
              </button>

              <button
                onClick={() => onRespectChange?.(post.id, -1, 'Postare necorespunzătoare')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: 'transparent',
                  border: '1px solid #dc2626',
                  borderRadius: '0.375rem',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#dc2626';
                }}
              >
                ⚓ Retrage
              </button>

              {/* Traditional actions */}
              <button
                onClick={() => onReply?.(post.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.375rem',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  transition: 'all 0.2s'
                }}
              >
                <MessageSquare style={{ width: '0.875rem', height: '0.875rem' }} />
                Răspunde
              </button>

              <button
                onClick={() => onQuote?.(post.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.375rem',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  transition: 'all 0.2s'
                }}
              >
                <Quote style={{ width: '0.875rem', height: '0.875rem' }} />
                Citează
              </button>

              {/* Admin Controls */}
              {forumUser?.isAdmin && (
                <>
                  <div style={{
                    width: '1px',
                    height: '1.5rem',
                    backgroundColor: theme.border,
                    margin: '0 0.5rem'
                  }} />

                  <button
                    onClick={() => {
                      if (window.confirm('Ești sigur că vrei să ștergi această postare?')) {
                        alert(`🔧 ADMIN: Postarea ${post.id} a fost ștearsă!`);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#dc2626',
                      border: 'none',
                      borderRadius: '0.375rem',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#b91c1c';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                    }}
                  >
                    🗑️ Șterge
                  </button>

                  <button
                    onClick={() => {
                      const newContent = prompt('Editează conținutul postării:', post.content);
                      if (newContent && newContent !== post.content) {
                        alert(`🔧 ADMIN: Postarea ${post.id} a fost editată!`);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#f59e0b',
                      border: 'none',
                      borderRadius: '0.375rem',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#d97706';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f59e0b';
                    }}
                  >
                    ✏️ Editează
                  </button>

                  <button
                    onClick={() => {
                      const reason = prompt('Motivul pentru care moderezi respectul acestei postări:');
                      if (reason) {
                        alert(`🔧 ADMIN: Respectul pentru postarea ${post.id} a fost resetat!\nMotiv: ${reason}`);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#7c3aed',
                      border: 'none',
                      borderRadius: '0.375rem',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#6d28d9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#7c3aed';
                    }}
                  >
                    🔧 Moderează
                  </button>
                </>
              )}
            </div>

            {/* Reputation Buttons */}
            {post.authorId && (
              <ReputationButtons
                postId={post.id}
                receiverUserId={post.authorId}
                onReputationChange={onReputationChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
