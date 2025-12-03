/**
 * Modaluri pentru ștergere, editare și echipamente
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useDeletePost, useUpdatePost } from '../../hooks/usePosts';
import { toast } from 'sonner';

interface MessageModalsProps {
  postId: string;
  postContent: string;
  isAdmin: boolean;
  onDeleted: () => void;
  onEdited: () => void;
  onClose: () => void;
}

// Modal pentru ștergere (motiv obligatoriu pentru admin)
export function DeletePostModal({ postId, isAdmin, onDeleted, onClose }: Omit<MessageModalsProps, 'postContent' | 'onEdited'>) {
  const { theme } = useTheme();
  const { deletePost, deleting } = useDeletePost();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (isAdmin && !reason.trim()) {
      setError('Motivul este obligatoriu pentru ștergere!');
      return;
    }

    const result = await deletePost(postId, reason.trim() || undefined);
    if (result.success) {
      toast.success('Postarea a fost ștearsă cu succes');
      onDeleted();
      onClose();
    } else {
      toast.error(result.error?.message || 'Eroare la ștergerea postării');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          maxWidth: '500px',
          width: '100%',
          border: `2px solid ${theme.border}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: theme.text
          }}>
            Șterge postarea
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textSecondary,
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: theme.text,
            marginBottom: '0.5rem'
          }}>
            Motivul ștergerii {isAdmin && <span style={{ color: '#dc2626' }}>*</span>}
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            placeholder={isAdmin ? 'Motivul este obligatoriu...' : 'Motivul este opțional...'}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: `1px solid ${error ? '#dc2626' : theme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              backgroundColor: theme.background,
              color: theme.text
            }}
            required={isAdmin}
          />
          {error && (
            <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              color: theme.textSecondary,
              cursor: deleting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Anulează
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || (isAdmin && !reason.trim())}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: deleting || (isAdmin && !reason.trim()) ? '#9ca3af' : '#dc2626',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              cursor: deleting || (isAdmin && !reason.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            {deleting ? 'Se șterge...' : 'Șterge'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal pentru editare (motiv obligatoriu pentru admin)
export function EditPostModal({ postId, postContent, isAdmin, onEdited, onClose }: Omit<MessageModalsProps, 'onDeleted'>) {
  const { theme } = useTheme();
  const { update, updating } = useUpdatePost();
  const [content, setContent] = useState(postContent);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleEdit = async () => {
    if (!content.trim()) {
      setError('Conținutul nu poate fi gol!');
      return;
    }

    if (isAdmin && !reason.trim()) {
      setError('Motivul este obligatoriu pentru editare!');
      return;
    }

    const result = await update(postId, content.trim(), reason.trim() || undefined);
    if (result.success) {
      toast.success('Postarea a fost editată cu succes');
      onEdited();
      onClose();
    } else {
      toast.error(result.error?.message || 'Eroare la editarea postării');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: `2px solid ${theme.border}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: theme.text
          }}>
            Editează postarea
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textSecondary,
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: theme.text,
            marginBottom: '0.5rem'
          }}>
            Conținut <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError('');
            }}
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '0.75rem',
              border: `1px solid ${error && !content.trim() ? '#dc2626' : theme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              backgroundColor: theme.background,
              color: theme.text
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: theme.text,
            marginBottom: '0.5rem'
          }}>
            Motivul editării {isAdmin && <span style={{ color: '#dc2626' }}>*</span>}
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            placeholder={isAdmin ? 'Motivul este obligatoriu...' : 'Motivul este opțional...'}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '0.75rem',
              border: `1px solid ${error && isAdmin && !reason.trim() ? '#dc2626' : theme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              backgroundColor: theme.background,
              color: theme.text
            }}
            required={isAdmin}
          />
          {error && (
            <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={updating}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              color: theme.textSecondary,
              cursor: updating ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Anulează
          </button>
          <button
            onClick={handleEdit}
            disabled={updating || !content.trim() || (isAdmin && !reason.trim())}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: updating || !content.trim() || (isAdmin && !reason.trim()) ? '#9ca3af' : '#f59e0b',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              cursor: updating || !content.trim() || (isAdmin && !reason.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            {updating ? 'Se salvează...' : 'Salvează'}
          </button>
        </div>
      </div>
    </div>
  );
}
