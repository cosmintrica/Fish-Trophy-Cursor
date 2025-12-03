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

  return (
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
          onClick={() => onRespectChange?.(postId, 1, 'Postare utilă!')}
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
          onClick={() => onRespectChange?.(postId, -1, 'Postare necorespunzătoare')}
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
          onClick={() => onReply?.(postId)}
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
          onClick={() => onQuote?.(postId)}
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
              onClick={onEdit}
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
          </>
        )}
      </div>

      {/* Reputation Buttons */}
      {authorId && (
        <ReputationButtons
          postId={postId}
          receiverUserId={authorId}
          onReputationChange={onReputationChange}
        />
      )}
    </div>
  );
}
