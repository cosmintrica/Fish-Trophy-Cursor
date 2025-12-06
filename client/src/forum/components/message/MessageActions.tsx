/**
 * Acțiuni pentru postare: Respect, Reply, Quote, Admin Controls
 */

import { MessageSquare, Quote, Copy } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ReputationButtons from '../ReputationButtons';

interface MessageActionsProps {
  postId: string;
  authorId?: string;
  onRespectChange?: (postId: string, delta: number, comment: string) => void;
  onReply?: (postId: string) => void;
  onQuote?: (postId: string) => void;
  onMultiQuoteToggle?: (postId: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onReputationChange?: () => void;
  isAdmin?: boolean;
  isMultiQuoteMode?: boolean;
  isQuoteSelected?: boolean;
  isMultiQuoteSelected?: boolean;
}

export default function MessageActions({
  postId,
  authorId,
  onRespectChange,
  onReply,
  onQuote,
  onMultiQuoteToggle,
  onDelete,
  onEdit,
  onReputationChange,
  isAdmin = false,
  isMultiQuoteMode = false,
  isQuoteSelected = false,
  isMultiQuoteSelected = false
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
      justifyContent: 'flex-end',
      gap: '0.5rem',
      flexWrap: 'wrap'
    }}>
      {/* Reputation Buttons - În stânga, dar tot în dreapta paginii */}
      {authorId && (
        <div style={{ flexShrink: 0, marginRight: 'auto' }}>
          <ReputationButtons
            postId={postId}
            receiverUserId={authorId}
            onReputationChange={onReputationChange}
          />
        </div>
      )}

      {/* Action Buttons - În dreapta, mai mici */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'nowrap', flexShrink: 0 }}>
        {/* Admin Controls - În stânga butoanelor normale */}
        {isAdmin && (
          <>
            <button
              onClick={onDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: isMobile ? '0.3125rem 0.4375rem' : '0.375rem 0.5rem',
                backgroundColor: '#dc2626',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: isMobile ? '0.625rem' : '0.6875rem',
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
                padding: isMobile ? '0.3125rem 0.4375rem' : '0.375rem 0.5rem',
                backgroundColor: '#f59e0b',
                border: 'none',
                borderRadius: '0.375rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: isMobile ? '0.625rem' : '0.6875rem',
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

            <div style={{
              width: '1px',
              height: '1.25rem',
              backgroundColor: theme.border,
              margin: '0 0.25rem'
            }} />
          </>
        )}

        {/* Butoane normale - Răspunde, Citează, Multi */}
        <button
          onClick={() => onReply?.(postId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: isMobile ? '0.3125rem 0.4375rem' : '0.375rem 0.5rem',
            backgroundColor: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: '0.375rem',
            color: theme.textSecondary,
            cursor: 'pointer',
            fontSize: isMobile ? '0.625rem' : '0.6875rem',
            transition: 'all 0.2s',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.primary;
            e.currentTarget.style.color = theme.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.border;
            e.currentTarget.style.color = theme.textSecondary;
          }}
        >
          <MessageSquare style={{ width: isMobile ? '0.6875rem' : '0.75rem', height: isMobile ? '0.6875rem' : '0.75rem' }} />
          <span>Răspunde</span>
        </button>

        <button
          onClick={() => onQuote?.(postId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: isMobile ? '0.3125rem 0.4375rem' : '0.375rem 0.5rem',
            backgroundColor: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: '0.375rem',
            color: theme.textSecondary,
            cursor: 'pointer',
            fontSize: isMobile ? '0.625rem' : '0.6875rem',
            transition: 'all 0.2s',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.primary;
            e.currentTarget.style.color = theme.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.border;
            e.currentTarget.style.color = theme.textSecondary;
          }}
        >
          <Quote style={{ width: isMobile ? '0.6875rem' : '0.75rem', height: isMobile ? '0.6875rem' : '0.75rem' }} />
          <span>Citează</span>
        </button>

        {/* Multi-Quote Toggle Button */}
        {onMultiQuoteToggle && (
          <button
            onClick={() => onMultiQuoteToggle(postId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: isMobile ? '0.3125rem 0.4375rem' : '0.375rem 0.5rem',
              backgroundColor: isMultiQuoteSelected ? theme.primary : 'transparent',
              border: `1px solid ${isMultiQuoteSelected ? theme.primary : theme.border}`,
              borderRadius: '0.375rem',
              color: isMultiQuoteSelected ? 'white' : theme.textSecondary,
              cursor: 'pointer',
              fontSize: isMobile ? '0.625rem' : '0.6875rem',
              fontWeight: isMultiQuoteSelected ? '600' : 'normal',
              transition: 'all 0.2s',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (!isMultiQuoteSelected) {
                e.currentTarget.style.borderColor = theme.primary;
                e.currentTarget.style.color = theme.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isMultiQuoteSelected) {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.color = theme.textSecondary;
              }
            }}
          >
            <Copy style={{ width: isMobile ? '0.6875rem' : '0.75rem', height: isMobile ? '0.6875rem' : '0.75rem' }} />
            <span>Multi</span>
          </button>
        )}
      </div>
    </div>
  );
}
