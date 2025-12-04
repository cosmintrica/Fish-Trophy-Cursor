/**
 * QuickReplyBox - Componenta pentru răspuns rapid (sticky bottom)
 * Oferă o interfață simplă și rapidă pentru răspunsuri în topicuri
 */

import { useState, useEffect, useRef } from 'react';
import { Send, Smile, Edit3 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useCreatePost } from '../hooks/usePosts';
import { useToast } from '../contexts/ToastContext';

interface QuickReplyBoxProps {
  topicId: string;
  pageSize?: number;
  onPageSizeChange?: (newSize: number) => void;
  onPostCreated?: () => void;
  onOpenAdvancedEditor?: (content: string) => void;
  placeholder?: string;
}

export default function QuickReplyBox({
  topicId,
  pageSize = 20,
  onPageSizeChange,
  onPostCreated,
  onOpenAdvancedEditor,
  placeholder = 'Scrie răspunsul tău aici...'
}: QuickReplyBoxProps) {
  const { theme } = useTheme();
  const { forumUser } = useAuth();
  const { showToast } = useToast();
  const { create, creating } = useCreatePost();
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = isMobile ? 150 : 200;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [content, isMobile]);

  // Restore draft from localStorage (doar dacă există și nu e gol)
  useEffect(() => {
    if (forumUser && topicId) {
      const draftKey = `forum_reply_draft_${topicId}_${forumUser.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft && savedDraft.trim()) {
        setContent(savedDraft);
      } else {
        // Șterge draft-ul dacă e gol
        if (savedDraft) {
          localStorage.removeItem(draftKey);
        }
        setContent('');
      }
    }
  }, [forumUser, topicId]);

  // Save draft to localStorage (doar dacă nu e gol)
  useEffect(() => {
    if (forumUser && topicId) {
      const draftKey = `forum_reply_draft_${topicId}_${forumUser.id}`;
      const timeoutId = setTimeout(() => {
        if (content.trim()) {
          // Salvează doar dacă există conținut
          localStorage.setItem(draftKey, content);
        } else {
          // Șterge draft-ul dacă e gol
          localStorage.removeItem(draftKey);
        }
      }, 500); // Debounce 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [content, forumUser, topicId]);

  // Clear draft
  const clearDraft = () => {
    if (forumUser && topicId) {
      const draftKey = `forum_reply_draft_${topicId}_${forumUser.id}`;
      localStorage.removeItem(draftKey);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      showToast('Te rog scrie un răspuns!', 'warning');
      return;
    }

    if (!forumUser) {
      showToast('Trebuie să fii autentificat pentru a posta!', 'warning');
      return;
    }

    const result = await create({
      topic_id: topicId,
      content: content.trim()
    });

    if (result.success) {
      // Clear content and draft
      setContent('');
      clearDraft();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Blur textarea
      setIsFocused(false);
      textareaRef.current?.blur();

      // Scroll to top to show new post
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Notify parent
      onPostCreated?.();
      
      showToast('Răspuns postat cu succes!', 'success');
    } else {
      const errorMessage = result.error?.message || 'Eroare la postare. Te rog încearcă din nou.';
      showToast(errorMessage, 'error');
    }
  };

  // Handle Ctrl+Enter / Cmd+Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (content.trim() && !creating) {
        handleSubmit(e);
      }
    }
  };

  // Insert emoji (placeholder - va fi implementat cu emoji picker)
  const handleEmojiClick = () => {
    // TODO: Open emoji picker modal
    showToast('Emoji picker - în dezvoltare', 'info');
  };

  if (!forumUser) {
    return null; // Nu afișăm dacă nu este autentificat
  }

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.surface,
        borderTop: `1px solid ${theme.border}`,
        padding: isMobile ? '0.75rem' : '1rem',
        zIndex: 100,
        boxShadow: isFocused ? '0 -4px 12px rgba(0, 0, 0, 0.1)' : '0 -2px 8px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s'
      }}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Textarea */}
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={creating}
            style={{
              width: '100%',
              minHeight: isMobile ? '60px' : '80px',
              maxHeight: isMobile ? '150px' : '200px',
              padding: isMobile ? '0.625rem 2.5rem 0.625rem 0.75rem' : '0.75rem 3rem 0.75rem 1rem',
              border: `1px solid ${isFocused ? theme.primary : theme.border}`,
              borderRadius: '0.5rem',
              fontSize: isMobile ? '0.875rem' : '0.9375rem',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              color: theme.text,
              backgroundColor: theme.background,
              outline: 'none',
              resize: 'none',
              overflowY: 'auto',
              transition: 'all 0.2s',
              opacity: creating ? 0.7 : 1,
              cursor: creating ? 'not-allowed' : 'text'
            }}
          />

          {/* Emoji button */}
          <button
            type="button"
            onClick={handleEmojiClick}
            disabled={creating}
            style={{
              position: 'absolute',
              bottom: isMobile ? '0.5rem' : '0.625rem',
              right: isMobile ? '2.5rem' : '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? '1.75rem' : '2rem',
              height: isMobile ? '1.75rem' : '2rem',
              padding: 0,
              border: 'none',
              backgroundColor: 'transparent',
              color: theme.textSecondary,
              cursor: creating ? 'not-allowed' : 'pointer',
              borderRadius: '0.375rem',
              transition: 'all 0.2s',
              opacity: creating ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!creating) {
                e.currentTarget.style.backgroundColor = theme.surfaceHover;
                e.currentTarget.style.color = theme.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (!creating) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.textSecondary;
              }
            }}
            title="Adaugă emoji"
          >
            <Smile size={isMobile ? 16 : 18} />
          </button>
        </div>

        {/* Actions bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Left side - PageSize picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* PageSize Picker - Mic și compact */}
            {onPageSizeChange && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <label
                  htmlFor="pageSize-select"
                  style={{
                    fontSize: isMobile ? '0.625rem' : '0.6875rem',
                    color: theme.textSecondary,
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isMobile ? 'Pag:' : 'Postări/pag:'}
                </label>
                <select
                  id="pageSize-select"
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value, 10);
                    onPageSizeChange(newSize);
                  }}
                  disabled={creating}
                  style={{
                    padding: isMobile ? '0.25rem 0.375rem' : '0.3125rem 0.5rem',
                    backgroundColor: theme.background,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.25rem',
                    color: theme.text,
                    fontSize: isMobile ? '0.625rem' : '0.6875rem',
                    fontWeight: '500',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s',
                    opacity: creating ? 0.5 : 1,
                    minWidth: isMobile ? '45px' : '55px',
                    height: isMobile ? '1.75rem' : '2rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!creating) {
                      e.currentTarget.style.borderColor = theme.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!creating) {
                      e.currentTarget.style.borderColor = theme.border;
                    }
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}
          </div>

          {/* Right side - Butoane și character count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {/* Character count (optional - hidden on mobile if space is limited) */}
            {!isMobile && content.length > 0 && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: content.length > 10000 ? theme.error : theme.textSecondary
                }}
              >
                {content.length} / 10000
              </span>
            )}

            {/* Buton Răspuns Complex - design identic cu Postează */}
            {onOpenAdvancedEditor && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenAdvancedEditor) {
                    // Trimite conținutul la Advanced Editor
                    onOpenAdvancedEditor(content);
                    // Resetează conținutul în QuickReplyBox și șterge draft-ul
                    setContent('');
                    clearDraft();
                  }
                }}
                disabled={creating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: isMobile ? '0.5rem 0.75rem' : '0.5625rem 1rem',
                  background: creating
                    ? theme.surfaceHover
                    : theme.border,
                  color: creating ? theme.textSecondary : theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.375rem',
                  fontSize: isMobile ? '0.75rem' : '0.8125rem',
                  fontWeight: '500',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: creating ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!creating) {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                    e.currentTarget.style.borderColor = theme.primary;
                    e.currentTarget.style.color = theme.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creating) {
                    e.currentTarget.style.backgroundColor = theme.border;
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.color = theme.text;
                  }
                }}
              >
                <Edit3 size={isMobile ? 13 : 14} />
                <span>{isMobile ? 'Complex' : 'Răspuns Complex'}</span>
              </button>
            )}

            <button
              type="submit"
              disabled={creating || !content.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: isMobile ? '0.5rem 0.75rem' : '0.5625rem 1rem',
                background: creating || !content.trim()
                  ? theme.surfaceHover
                  : theme.primary,
                color: creating || !content.trim() ? theme.textSecondary : 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: isMobile ? '0.75rem' : '0.8125rem',
                fontWeight: '500',
                cursor: creating || !content.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: creating || !content.trim() ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!creating && content.trim()) {
                  e.currentTarget.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                if (!creating && content.trim()) {
                  e.currentTarget.style.opacity = '1';
                }
              }}
            >
              {creating ? (
                <>
                  <div
                    style={{
                      width: '1rem',
                      height: '1rem',
                      border: `2px solid ${creating || !content.trim() ? theme.textSecondary : 'rgba(255, 255, 255, 0.3)'}`,
                      borderTop: `2px solid ${creating || !content.trim() ? theme.textSecondary : 'white'}`,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  <span>Se postează...</span>
                </>
              ) : (
                <>
                  <Send size={isMobile ? 14 : 16} />
                  <span>Postează</span>
                  {!isMobile && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      (Ctrl+Enter)
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

