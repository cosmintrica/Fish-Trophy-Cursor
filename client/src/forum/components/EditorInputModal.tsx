/**
 * EditorInputModal - Modal simplu personalizat pentru inserare link/image/video
 */

import { useState, useEffect } from 'react';
import { X, Link, Image, Video, AtSign, Trophy, Fish, Wrench } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface EditorInputModalProps {
  isOpen: boolean;
  type: 'link' | 'image' | 'video' | 'mention' | 'record' | 'catch' | 'gear';
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

  const handleSubmit = () => {
    setError('');

    if (type === 'mention') {
      // Pentru mențiuni, validăm username-ul
      if (!url.trim()) {
        setError('Username-ul este obligatoriu!');
        return;
      }
      // Validare username simplă (doar alfanumerice, underscore, puncte)
      if (!/^[a-zA-Z0-9_.-]+$/.test(url.trim())) {
        setError('Username invalid! Folosește doar litere, cifre, puncte, underscore sau cratimă.');
        return;
      }
    } else if (type === 'record') {
      // Pentru record, validăm doar numărul (global_id)
      if (!url.trim()) {
        setError('Numărul recordului este obligatoriu!');
        return;
      }
      // Validare: doar număr
      const isNumber = /^\d+$/.test(url.trim());
      if (!isNumber) {
        setError('Număr invalid! Folosește doar numărul recordului.');
        return;
      }
    } else if (type === 'catch' || type === 'gear') {
      // Pentru catch/gear, validăm doar numărul (global_id)
      if (!url.trim()) {
        setError('Numărul este obligatoriu!');
        return;
      }
      // Validare: doar număr
      const isNumber = /^\d+$/.test(url.trim());
      if (!isNumber) {
        setError('Număr invalid! Folosește doar numărul.');
        return;
      }
    } else {
      // Pentru link/image/video, validăm URL-ul
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
    }

    // Previne scroll-ul - salvează poziția înainte
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Inserează textul PRIMA DATĂ (înainte de a închide modal-ul)
    if (type === 'mention') {
      onInsert(url.trim(), url.trim()); // Pentru mențiuni, folosim username-ul
    } else {
      onInsert(url.trim(), linkText.trim() || url.trim());
    }
    
    // Așteaptă mai mult pentru ca inserarea să se facă complet, apoi închide modal-ul fără scroll
    setTimeout(() => {
      // Restaură poziția de scroll înainte de închidere
      window.scrollTo({ top: scrollTop, behavior: 'auto' });
      onClose();
      // Restaură din nou după închidere pentru siguranță
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollTop, behavior: 'auto' });
      });
    }, 250);
  };

  const getTitle = () => {
    switch (type) {
      case 'link':
        return 'Inserare Link';
      case 'image':
        return 'Inserare Imagine';
      case 'video':
        return 'Inserare Video';
      case 'mention':
        return 'Mențiune Utilizator';
      case 'record':
        return 'Inserare Record';
      case 'catch':
        return 'Inserare Captură';
      case 'gear':
        return 'Inserare Echipament';
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
      case 'mention':
        return <AtSign size={isMobile ? 18 : 20} />;
      case 'record':
        return <Trophy size={isMobile ? 18 : 20} />;
      case 'catch':
        return <Fish size={isMobile ? 18 : 20} />;
      case 'gear':
        return <Wrench size={isMobile ? 18 : 20} />;
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
      case 'mention':
        return 'username';
      case 'record':
        return 'Număr record';
      case 'catch':
        return 'Număr captură';
      case 'gear':
        return 'Număr echipament';
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Previne scroll-ul când modal-ul se închide
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              onClose();
              // Restaură poziția de scroll imediat după închidere
              setTimeout(() => {
                window.scrollTo({ top: scrollTop, behavior: 'auto' });
              }, 0);
            }}
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

        {/* Content - NU form, doar div pentru a evita form în form */}
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ padding: isMobile ? '1rem' : '1.25rem' }}
        >
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
                {type === 'mention' ? 'Username' : 
                 type === 'record' || type === 'catch' || type === 'gear' ? 'ID' :
                 `URL ${type === 'video' ? '(YouTube sau Vimeo)' : ''}`}
              </label>
              <input
                id="url-input"
                type={type === 'mention' || type === 'record' || type === 'catch' || type === 'gear' ? 'text' : 'url'}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                  }
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

            {/* Link Text Input - doar pentru link (nu pentru mention) */}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSubmit();
                    }
                  }}
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit();
                }}
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
        </div>
      </div>
    </div>
  );
}

