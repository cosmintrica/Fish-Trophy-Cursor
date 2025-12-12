/**
 * CreateTopicEditor - Editor avansat pentru crearea de topicuri noi
 * Apare printr-o animație frumoasă în loc de modal
 */

import { useState, useEffect, useRef } from 'react';
import { X, Send, Eye, MessageSquare } from 'lucide-react';
import { useCreateTopic } from '../hooks/useTopics';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import EditorToolbar from './EditorToolbar';
import { parseBBCode } from '../../services/forum/bbcode';

interface CreateTopicEditorProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string; // This can be a slug or ID
  subcategoryId?: string | null;
  subforumId?: string | null;
  isSubforum?: boolean;
  onSuccess?: () => void;
  // Legacy props kept for compatibility but optional now
  categoryName?: string;
  user?: {
    username: string;
    rank: string;
  };
  onTopicCreated?: () => void;
}

export default function CreateTopicEditor({
  isOpen,
  onClose,
  categoryId,
  subcategoryId,
  subforumId,
  isSubforum,
  categoryName,
  user,
  onTopicCreated,
  onSuccess
}: CreateTopicEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [resolvedSubcategoryId, setResolvedSubcategoryId] = useState<string | null>(subcategoryId || null);
  const [resolvedSubforumId, setResolvedSubforumId] = useState<string | null>(subforumId || null);
  const [showPreview, setShowPreview] = useState(false);
  const { create, creating, error: createError } = useCreateTopic();
  const { forumUser } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Update resolved IDs when props change
  useEffect(() => {
    if (subcategoryId) setResolvedSubcategoryId(subcategoryId);
    if (subforumId) setResolvedSubforumId(subforumId);
  }, [subcategoryId, subforumId]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Rezolvă slug-ul în UUID (poate fi subcategorie sau subforum)
  useEffect(() => {
    const resolveId = async () => {
      if (!categoryId) {
        setResolvedSubcategoryId(null);
        setResolvedSubforumId(null);
        return;
      }

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);

      if (isUUID) {
        // Dacă e UUID, presupunem că e subcategorie (default behavior)
        // TODO: Ar trebui ideal să verificăm ce fel de ID este
        setResolvedSubcategoryId(categoryId);
      } else {
        // 1. Verificăm dacă e subcategorie
        const { data: subcat } = await supabase
          .from('forum_subcategories')
          .select('id')
          .eq('slug', categoryId)
          .eq('is_active', true)
          .maybeSingle();

        if (subcat) {
          setResolvedSubcategoryId(subcat.id);
          setResolvedSubforumId(null);
        } else {
          // 2. Verificăm dacă e subforum
          const { data: subforum } = await supabase
            .from('forum_subforums')
            .select('id')
            .eq('slug', categoryId)
            .eq('is_active', true)
            .maybeSingle();

          if (subforum) {
            setResolvedSubforumId(subforum.id);
            setResolvedSubcategoryId(null);
          } else {
            // Nu am găsit nimic
            setResolvedSubcategoryId(null);
            setResolvedSubforumId(null);
          }
        }
      }
    };

    resolveId();
  }, [categoryId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Focus pe titlu când se deschide
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const titleInput = document.getElementById('create-topic-title');
        if (titleInput) {
          titleInput.focus();
        }
      }, 100);
    } else {
      // Reset când se închide
      setTitle('');
      setContent('');
      setShowPreview(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      showToast('Te rog completează titlul și conținutul!', 'warning');
      return;
    }

    if (!forumUser) {
      showToast('Trebuie să fii autentificat pentru a crea un topic!', 'warning');
      return;
    }

    if (!resolvedSubcategoryId && !resolvedSubforumId) {
      showToast('Eroare: Categoria nu a fost găsită!', 'error');
      return;
    }

    const result = await create({
      subcategory_id: resolvedSubcategoryId || undefined,
      subforum_id: resolvedSubforumId || undefined,
      title: title.trim(),
      content: content.trim()
    });

    if (result.success) {
      setTitle('');
      setContent('');
      if (onTopicCreated) onTopicCreated();
      if (onSuccess) onSuccess();
      // Only close if we don't handle navigation in onSuccess/onTopicCreated
      // For now we close always as the parent re-renders
      onClose();
      showToast('Topic creat cu succes!', 'success');
    } else {
      console.error('Error creating topic:', result.error);

      if (result.error?.code === 'USER_RESTRICTED' && result.error?.title) {
        showToast(
          result.error.title ? `${result.error.title}: ${result.error.message}` : result.error.message,
          'error'
        );
      } else {
        showToast(result.error?.message || 'A apărut o eroare la crearea topicului!', 'error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{
        marginTop: '2rem',
        marginBottom: '2rem',
        backgroundColor: theme.surface,
        borderRadius: '1rem',
        border: `1px solid ${theme.border}`,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        animation: 'slideDown 0.3s ease-out',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'all 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Header - Compact */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.625rem 1rem',
          borderBottom: `1px solid ${theme.border}`,
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare style={{ width: '1.125rem', height: '1.125rem', color: 'white' }} />
          <h2 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white', margin: 0 }}>
            Creează Topic Nou <span style={{ fontWeight: '400', opacity: 0.8 }}>în {categoryName}</span>
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '0.375rem',
            color: 'rgba(255, 255, 255, 0.8)',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X style={{ width: '1rem', height: '1rem' }} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: isMobile ? '1rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Titlu */}
          <div>
            <label
              htmlFor="create-topic-title"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '0.5rem'
              }}
            >
              Titlul topicului
            </label>
            <input
              id="create-topic-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Introdu un titlu descriptiv pentru topicul tău..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                backgroundColor: theme.background,
                color: theme.text,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = theme.primary}
              onBlur={(e) => e.target.style.borderColor = theme.border}
              maxLength={200}
              required
            />
            <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginTop: '0.25rem' }}>
              {title.length}/200 caractere
            </div>
          </div>

          {/* Conținut */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                htmlFor="create-topic-content"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme.text
                }}
              >
                Conținutul postării
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  color: showPreview ? theme.primary : theme.textSecondary,
                  backgroundColor: showPreview ? `${theme.primary}20` : 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Eye size={14} />
                {showPreview ? 'Editează' : 'Preview'}
              </button>
            </div>

            {showPreview ? (
              <div
                style={{
                  minHeight: '200px',
                  padding: '0.75rem',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  backgroundColor: theme.background,
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  overflow: 'auto',
                  color: theme.text
                }}
                dangerouslySetInnerHTML={{ __html: parseBBCode(content).html }}
              />
            ) : (
              <>
                {/* EditorToolbar pentru BBCode */}
                <EditorToolbar
                  textareaRef={textareaRef}
                  onContentChange={setContent}
                  currentContent={content}
                  isMobile={isMobile}
                />
                <textarea
                  id="create-topic-content"
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Scrie aici conținutul topicului tău. Poți descrie experiența, pune întrebări sau împărtăși sfaturi... Folosește toolbar-ul de mai sus pentru formatare BBCode."
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '0.75rem',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: theme.background,
                    color: theme.text,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    transition: 'border-color 0.2s',
                    marginTop: '0.5rem'
                  }}
                  onFocus={(e) => e.target.style.borderColor = theme.primary}
                  onBlur={(e) => e.target.style.borderColor = theme.border}
                  required
                />
              </>
            )}
            <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
              {content.length} caractere - Minimum 50 caractere recomandate
            </div>
          </div>
        </div>

        {/* Footer cu butoane */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '1rem' : '1.5rem',
            borderTop: `1px solid ${theme.border}`,
            backgroundColor: theme.background
          }}
        >
          <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
            Postat ca: <span style={{ fontWeight: '600', color: theme.primary }}>{user.username}</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: theme.text,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.background;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={creating || !title.trim() || !content.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: creating || !title.trim() || !content.trim()
                  ? theme.border
                  : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: creating || !title.trim() || !content.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: creating || !title.trim() || !content.trim() ? 0.6 : 1
              }}
            >
              {creating ? (
                <>
                  <div
                    style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  Se creează...
                </>
              ) : (
                <>
                  <Send style={{ width: '1rem', height: '1rem' }} />
                  Creează Topic
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

