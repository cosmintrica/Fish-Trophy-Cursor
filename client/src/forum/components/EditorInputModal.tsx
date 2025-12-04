/**
 * EditorInputModal - Modal simplu personalizat pentru inserare link/image/video
 */

import { useState, useEffect } from 'react';
import { X, Link, Image, Video } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface EditorInputModalProps {
  isOpen: boolean;
  type: 'link' | 'image' | 'video';
  onClose: () => void;
  onInsert: (url: string, text?: string) => void;
  isMobile?: boolean;
}

export default function EditorInputModal({
  isOpen,
  type,
  onClose,
  onInsert,
  isMobile = false
}: EditorInputModalProps) {
  const { theme } = useTheme();
  const [url, setUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setLinkText('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('URL-ul este obligatoriu!');
      return;
    }

    // Validare URL simplă
    try {
      new URL(url);
    } catch {
      setError('URL invalid!');
      return;
    }

    onInsert(url.trim(), linkText.trim() || url.trim());
    onClose();
  };

  const getTitle = () => {
    switch (type) {
      case 'link':
        return 'Inserare Link';
      case 'image':
        return 'Inserare Imagine';
      case 'video':
        return 'Inserare Video';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'link':
        return <Link size={isMobile ? 18 : 20} />;
      case 'image':
        return <Image size={isMobile ? 18 : 20} />;
      case 'video':
        return <Video size={isMobile ? 18 : 20} />;
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'link':
        return 'https://example.com';
      case 'image':
        return 'https://example.com/image.jpg';
      case 'video':
        return 'https://www.youtube.com/watch?v=... sau https://vimeo.com/...';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: isMobile ? '0.5rem' : '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.surface,
          borderRadius: '0.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          width: '100%',
          maxWidth: isMobile ? '100%' : '450px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - mic și discret */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '0.75rem 1rem' : '1rem 1.25rem',
            borderBottom: `1px solid ${theme.border}`,
            backgroundColor: theme.background
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ color: theme.primary }}>{getIcon()}</div>
            <h3
              style={{
                fontSize: isMobile ? '0.9375rem' : '1rem',
                fontWeight: '600',
                color: theme.text,
                margin: 0
              }}
            >
              {getTitle()}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.375rem',
              color: theme.textSecondary,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
            <X size={isMobile ? 16 : 18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: isMobile ? '1rem' : '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* URL Input */}
            <div>
              <label
                htmlFor="url-input"
                style={{
                  display: 'block',
                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                  fontWeight: '500',
                  color: theme.text,
                  marginBottom: '0.5rem'
                }}
              >
                URL {type === 'video' && '(YouTube sau Vimeo)'}
              </label>
              <input
                id="url-input"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                }}
                placeholder={getPlaceholder()}
                autoFocus
                style={{
                  width: '100%',
                  padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
                  backgroundColor: theme.background,
                  border: `1px solid ${error ? theme.error : theme.border}`,
                  borderRadius: '0.5rem',
                  color: theme.text,
                  fontSize: isMobile ? '0.875rem' : '0.9375rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.primary;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? theme.error : theme.border;
                }}
              />
            </div>

            {/* Link Text Input - doar pentru link */}
            {type === 'link' && (
              <div>
                <label
                  htmlFor="text-input"
                  style={{
                    display: 'block',
                    fontSize: isMobile ? '0.8125rem' : '0.875rem',
                    fontWeight: '500',
                    color: theme.text,
                    marginBottom: '0.5rem'
                  }}
                >
                  Text Link (opțional)
                </label>
                <input
                  id="text-input"
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Text link (dacă e gol, se folosește URL-ul)"
                  style={{
                    width: '100%',
                    padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
                    backgroundColor: theme.background,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.5rem',
                    color: theme.text,
                    fontSize: isMobile ? '0.875rem' : '0.9375rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.primary;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.border;
                  }}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: '0.625rem 0.75rem',
                  backgroundColor: `${theme.error}15`,
                  border: `1px solid ${theme.error}`,
                  borderRadius: '0.5rem',
                  color: theme.error,
                  fontSize: isMobile ? '0.8125rem' : '0.875rem'
                }}
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '0.5rem'
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  color: theme.text,
                  fontSize: isMobile ? '0.875rem' : '0.9375rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  e.currentTarget.style.borderColor = theme.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = theme.border;
                }}
              >
                Anulează
              </button>
              <button
                type="submit"
                style={{
                  padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
                  backgroundColor: theme.primary,
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Inserează
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

