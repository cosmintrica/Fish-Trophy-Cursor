/**
 * AdvancedEditorModal - Editor complet cu formatare pentru postări
 * Versiune inițială de bază - va fi extinsă cu toolbar, formatare, etc.
 */

import { useState, useEffect, useRef } from 'react';
import { X, Edit3, Eye, Save, Send } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useCreatePost } from '../hooks/usePosts';
import { useToast } from '../contexts/ToastContext';
import EditorToolbar from './EditorToolbar';
import { parseBBCodePreview } from '../utils/bbcodePreview';

interface AdvancedEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  initialContent?: string;
  onPostCreated?: () => void;
}

export default function AdvancedEditorModal({
  isOpen,
  onClose,
  topicId,
  initialContent = '',
  onPostCreated
}: AdvancedEditorModalProps) {
  const { theme } = useTheme();
  const { forumUser } = useAuth();
  const { showToast } = useToast();
  const { create, creating } = useCreatePost();
  
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Undo/Redo history
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isUndoRedo, setIsUndoRedo] = useState(false);
  
  const DRAFT_KEY = `forum-editor-draft-${topicId}`;
  const MAX_CHARS = 10000;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load content from initialContent (from QuickReplyBox) or draft from localStorage
  useEffect(() => {
    if (isOpen) {
      if (initialContent && initialContent.trim()) {
        // Dacă avem conținut initial (din QuickReplyBox), folosește-l
        setContent(initialContent);
      } else {
        // Altfel, încarcă draft din localStorage
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          setContent(savedDraft);
        } else {
          setContent('');
        }
      }
    } else {
      // Reset content when modal closes
      setContent('');
    }
  }, [isOpen, DRAFT_KEY]);
  
  // Update content when initialContent changes (e.g., from QuickReplyBox)
  useEffect(() => {
    if (isOpen && initialContent && initialContent.trim()) {
      setContent(initialContent);
    }
  }, [initialContent, isOpen]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!isOpen || !content.trim()) return;
    
    const autoSaveTimer = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, content);
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveTimer);
  }, [content, isOpen, DRAFT_KEY]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      showToast('Conținutul nu poate fi gol!', 'warning');
      return;
    }

    if (!forumUser) {
      showToast('Trebuie să fii autentificat pentru a posta!', 'warning');
      return;
    }

    if (content.length > MAX_CHARS) {
      showToast(`Mesajul depășește ${MAX_CHARS} caractere!`, 'error');
      return;
    }

    const result = await create({
      topic_id: topicId,
      content: content.trim()
    });

    if (result.success) {
      // Clear draft
      localStorage.removeItem(DRAFT_KEY);
      
      // Reset form
      setContent('');
      setShowPreview(false);
      
      // Notify parent
      onPostCreated?.();
      onClose();
      
      // Show success message
      showToast('Postare creată cu succes!', 'success');
    } else {
      const errorMessage = result.error?.message || 'A apărut o eroare la crearea postării!';
      showToast(errorMessage, 'error');
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_KEY, content);
    showToast('Draft salvat!', 'success');
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setContent('');
    showToast('Draft șters!', 'info');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: isMobile ? '0.5rem' : '1rem'
      }}
      // Modal se închide doar de la X, Anulează sau Postare - nu la click exterior
    >
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: isMobile ? '100%' : '900px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
            borderBottom: `1px solid ${theme.border}`,
            backgroundColor: theme.surface
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Edit3 style={{ width: isMobile ? '1rem' : '1.125rem', height: isMobile ? '1rem' : '1.125rem', color: theme.primary }} />
            <h2 style={{ fontSize: isMobile ? '0.875rem' : '1rem', fontWeight: '600', color: theme.text, margin: 0 }}>
              Editor Avansat
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              color: theme.textSecondary,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.surfaceHover;
              e.currentTarget.style.color = theme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.textSecondary;
            }}
          >
            <X style={{ width: isMobile ? '1rem' : '1.125rem', height: isMobile ? '1rem' : '1.125rem' }} />
          </button>
        </div>

        {/* Editor Toolbar - Formatare text */}
        <EditorToolbar
          textareaRef={textareaRef}
          onContentChange={(newContent) => setContent(newContent)}
          isMobile={isMobile}
        />

        {/* Toolbar secundar - Preview, Draft actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderBottom: `1px solid ${theme.border}`,
            backgroundColor: theme.surface,
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.375rem 0.625rem' : '0.5rem 0.75rem',
              backgroundColor: showPreview ? theme.primary : 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: '0.375rem',
              color: showPreview ? 'white' : theme.text,
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Eye size={isMobile ? 14 : 16} />
            <span>{showPreview ? 'Editare' : 'Preview'}</span>
          </button>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={!content.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.375rem 0.625rem' : '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: '0.375rem',
              color: theme.textSecondary,
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              fontWeight: '500',
              cursor: !content.trim() ? 'not-allowed' : 'pointer',
              opacity: !content.trim() ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (content.trim()) {
                e.currentTarget.style.backgroundColor = theme.surfaceHover;
                e.currentTarget.style.borderColor = theme.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (content.trim()) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = theme.border;
              }
            }}
          >
            <Save size={isMobile ? 14 : 16} />
            <span>{isMobile ? 'Draft' : 'Salvează Draft'}</span>
          </button>

          {localStorage.getItem(DRAFT_KEY) && (
            <button
              type="button"
              onClick={handleClearDraft}
              style={{
                padding: isMobile ? '0.375rem 0.625rem' : '0.5rem 0.75rem',
                backgroundColor: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: '0.375rem',
                color: theme.textSecondary,
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.error;
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.textSecondary;
              }}
            >
              {isMobile ? 'Șterge' : 'Șterge Draft'}
            </button>
          )}
        </div>

        {/* Content Area */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isMobile ? '1rem' : '1.5rem', overflow: 'hidden' }}>
            {showPreview ? (
              /* Preview Mode */
              <div
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: theme.background,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  overflow: 'auto',
                  color: theme.text,
                  lineHeight: '1.6',
                  fontSize: '0.875rem',
                  minHeight: '300px'
                }}
                dangerouslySetInnerHTML={{
                  __html: content.trim() 
                    ? parseBBCodePreview(content) 
                    : '<span style="color: ' + theme.textSecondary + '; font-style: italic;">Preview-ul va apărea aici...</span>'
                }}
              />
            ) : (
              /* Edit Mode */
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  if (newContent.length <= MAX_CHARS) {
                    setContent(newContent);
                  }
                }}
                placeholder="Scrie răspunsul tău aici... Poți folosi formatare BBCode (va fi adăugată în viitor)."
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: '300px',
                  padding: '1rem',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  resize: 'none',
                  outline: 'none',
                  backgroundColor: theme.background,
                  color: theme.text,
                  overflowY: 'auto'
                }}
              />
            )}

            {/* Character Counter */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.75rem',
                fontSize: '0.75rem',
                color: theme.textSecondary
              }}
            >
              <span>
                {content.length} / {MAX_CHARS} caractere
              </span>
              {content.length > MAX_CHARS * 0.9 && (
                <span style={{ color: content.length >= MAX_CHARS ? theme.error : theme.accent }}>
                  {content.length >= MAX_CHARS ? 'Limita atinsă!' : 'Aproape de limită'}
                </span>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              padding: isMobile ? '1rem' : '1.5rem',
              borderTop: `1px solid ${theme.border}`,
              backgroundColor: theme.background,
              flexWrap: 'wrap'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              style={{
                padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                color: theme.text,
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: creating ? 'not-allowed' : 'pointer',
                opacity: creating ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!creating) {
                  e.currentTarget.style.backgroundColor = theme.surfaceHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!creating) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              Anulează
            </button>

            <button
              type="submit"
              disabled={creating || !content.trim() || content.length > MAX_CHARS}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
                backgroundColor: creating || !content.trim() || content.length > MAX_CHARS
                  ? theme.border
                  : theme.primary,
                border: 'none',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: creating || !content.trim() || content.length > MAX_CHARS
                  ? 'not-allowed'
                  : 'pointer',
                opacity: creating || !content.trim() || content.length > MAX_CHARS ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!creating && content.trim() && content.length <= MAX_CHARS) {
                  e.currentTarget.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                if (!creating && content.trim() && content.length <= MAX_CHARS) {
                  e.currentTarget.style.opacity = '1';
                }
              }}
            >
              {creating ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }}
                  />
                  <span>Se postează...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Postează Răspuns</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

