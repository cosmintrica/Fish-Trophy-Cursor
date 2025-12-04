/**
 * Acțiuni pentru postare: Respect, Reply, Quote, Admin Controls
 */

import { MessageSquare, Quote } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ReputationButtons from '../ReputationButtons';

interface MessageActionsProps {
  postId: string;
  authorId?: string;
  onRespectChange?: (postId: string, delta: number, comment: string) => void;
  onReply?: (postId: string) => void;
  onQuote?: (postId: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onReputationChange?: () => void;
  isAdmin?: boolean;
}

export default function MessageActions({
  postId,
  authorId,
  onRespectChange,
  onReply,
  onQuote,
  onDelete,
  onEdit,
  onReputationChange,
  isAdmin = false
}: MessageActionsProps) {
  const { theme } = useTheme();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{
      backgroundColor: theme.background,
      borderTop: `1px solid ${theme.border}`,
      padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.5rem',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'nowrap', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {/* Traditional actions */}
        <button
          onClick={() => onReply?.(postId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: isMobile ? '0.375rem 0.5rem' : '0.4375rem 0.625rem',
            backgroundColor: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: '0.375rem',
            color: theme.textSecondary,
            cursor: 'pointer',
            fontSize: isMobile ? '0.6875rem' : '0.75rem',
            transition: 'all 0.2s',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          <MessageSquare style={{ width: isMobile ? '0.75rem' : '0.8125rem', height: isMobile ? '0.75rem' : '0.8125rem' }} />
          <span>Răspunde</span>
        </button>

        <button
          onClick={() => onQuote?.(postId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: isMobile ? '0.375rem 0.5rem' : '0.4375rem 0.625rem',
            backgroundColor: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: '0.375rem',
            color: theme.textSecondary,
            cursor: 'pointer',
            fontSize: isMobile ? '0.6875rem' : '0.75rem',
            transition: 'all 0.2s',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          <Quote style={{ width: isMobile ? '0.75rem' : '0.8125rem', height: isMobile ? '0.75rem' : '0.8125rem' }} />
          <span>Citează</span>
        </button>

        {/* Admin Controls */}
        {isAdmin && (
          <>
            <div style={{
              width: '1px',
              height: '1.5rem',
              backgroundColor: theme.border,
              margin: '0 0.5rem'
            }} />

            <button
              onClick={onDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: isMobile ? '0.375rem 0.5rem' : '0.375rem 0.75rem',
                backgroundColor: '#dc2626',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: isMobile ? '0.6875rem' : '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
            >
              🗑️ {!isMobile && <span>Șterge</span>}
            </button>

            <button
              onClick={onEdit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: isMobile ? '0.375rem 0.5rem' : '0.375rem 0.75rem',
                backgroundColor: '#f59e0b',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: isMobile ? '0.6875rem' : '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#d97706';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f59e0b';
              }}
            >
              ✏️ {!isMobile && <span>Editează</span>}
            </button>
          </>
        )}
      </div>

      {/* Reputation Buttons */}
      {authorId && (
        <div style={{ flexShrink: 0 }}>
          <ReputationButtons
            postId={postId}
            receiverUserId={authorId}
            onReputationChange={onReputationChange}
          />
        </div>
      )}
    </div>
  );
}
