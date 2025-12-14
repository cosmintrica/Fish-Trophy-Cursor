import { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, Eye } from 'lucide-react';
import { useCreateTopic } from '../hooks/useTopics';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import EditorToolbar from './EditorToolbar';
import { parseBBCode } from '../../services/forum/bbcode';
import PreviewContent from './PreviewContent';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  user: {
    username: string;
    rank: string;
  };
  onTopicCreated: () => void;
}

export default function CreateTopicModal({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  user,
  onTopicCreated
}: CreateTopicModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [resolvedSubcategoryId, setResolvedSubcategoryId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { create, creating, error: createError } = useCreateTopic();
  const { forumUser } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rezolvă slug-ul în UUID
  useEffect(() => {
    const resolveSubcategoryId = async () => {
      if (!categoryId) {
        setResolvedSubcategoryId(null);
        return;
      }

      // Verifică dacă e UUID sau slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);

      if (isUUID) {
        setResolvedSubcategoryId(categoryId);
      } else {
        // Folosește exact match (nu ilike) pentru a evita eroarea 406
        // IMPORTANT: categoryId poate fi un slug de categorie sau subcategorie
        // Trebuie să verificăm mai întâi dacă este o subcategorie
        const { data } = await supabase
          .from('forum_subcategories')
          .select('id')
          .eq('slug', categoryId)
          .eq('is_active', true)
          .maybeSingle();

        setResolvedSubcategoryId(data?.id || null);
      }
    };

    resolveSubcategoryId();
  }, [categoryId]);

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

    if (!resolvedSubcategoryId) {
      showToast('Eroare: Subcategoria nu a fost găsită!', 'error');
      return;
    }

    const result = await create({
      subcategory_id: resolvedSubcategoryId,
      title: title.trim(),
      content: content.trim()
    });

    if (result.success) {
      // Reset form
      setTitle('');
      setContent('');

      // Notify parent
      onTopicCreated();
      onClose();

      // Show success message
      showToast('Topic creat cu succes!', 'success');
    } else {
      console.error('Error creating topic:', result.error);
      
      // Check if it's a restriction error with custom details
      if (result.error?.code === 'USER_RESTRICTED' && result.error?.title) {
        // Show custom restriction notification
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem'
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MessageSquare style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '0.125rem' }}>
                Creează Topic Nou
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                în {categoryName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              color: 'rgba(255, 255, 255, 0.8)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
          >
            <X style={{ width: '1.5rem', height: '1.5rem' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Titlu */}
            <div>
              <label
                htmlFor="topic-title"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}
              >
                Titlul topicului
              </label>
              <input
                id="topic-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Introdu un titlu descriptiv pentru topicul tău..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                maxLength={200}
                required
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {title.length}/200 caractere
              </div>
            </div>

            {/* Conținut */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label
                  htmlFor="topic-content"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151'
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
                    color: showPreview ? '#2563eb' : '#6b7280',
                    backgroundColor: 'transparent',
                    border: '1px solid #d1d5db',
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
                <PreviewContent
                  content={content}
                  style={{
                    flex: 1,
                    minHeight: '200px',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    overflow: 'auto'
                  }}
                />
              ) : (
                <>
                  {/* EditorToolbar pentru BBCode */}
                  <EditorToolbar
                    textareaRef={textareaRef}
                    onContentChange={setContent}
                    currentContent={content}
                  />
                  <textarea
                    id="topic-content"
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Scrie aici conținutul topicului tău. Poți descrie experiența, pune întrebări sau împărtăși sfaturi... Folosește toolbar-ul de mai sus pentru formatare BBCode."
                    style={{
                      width: '100%',
                      flex: 1,
                      minHeight: '200px',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      transition: 'border-color 0.2s',
                      marginTop: '0.5rem'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    required
                  />
                </>
              )}
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
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
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f8fafc'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Postat ca: <span style={{ fontWeight: '600', color: '#2563eb' }}>{user.username}</span>
              <span className={`user-rank rank-${user.rank} ml-2`}>{user.rank}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
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
                    ? '#9ca3af'
                    : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: creating || !title.trim() || !content.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
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
      </div>
    </div>
  );
}
