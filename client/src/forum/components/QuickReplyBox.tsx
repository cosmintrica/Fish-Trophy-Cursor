/**
 * QuickReplyBox - Componenta pentru răspuns rapid (sticky bottom)
 * Oferă o interfață simplă și rapidă pentru răspunsuri în topicuri
 */

import { useState, useEffect, useRef } from 'react';
import { Send, Smile, Edit3, Eye, X, Save, MessageSquare, Quote, ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useCreatePost } from '../hooks/usePosts';
import { useToast } from '../contexts/ToastContext';
import EditorToolbar from './EditorToolbar';
import EmojiPicker from './EmojiPicker';
import { parseBBCode } from '../../services/forum/bbcode';

interface QuickReplyBoxProps {
  topicId: string;
  pageSize?: number;
  onPageSizeChange?: (newSize: number) => void;
  onPostCreated?: () => void;
  placeholder?: string;
  // Multi-Quote props
  isMultiQuoteMode?: boolean;
  selectedQuotesCount?: number;
  onToggleMultiQuote?: () => void;
  onInsertQuotes?: (insertFn: (quotes: Array<{ postId: string; author: string; content: string }>) => void) => void;
  // Focus ref pentru butonul "Răspuns"
  focusRef?: React.RefObject<HTMLTextAreaElement>;
  // Callback pentru inserare quote-uri selectate
  onInsertSelectedQuotes?: (quotes: Array<{ postId: string; author: string; content: string }>) => void;
}

export default function QuickReplyBox({
  topicId,
  pageSize = 20,
  onPageSizeChange,
  onPostCreated,
  placeholder = 'Scrie răspunsul tău aici...',
  isMultiQuoteMode = false,
  selectedQuotesCount = 0,
  onToggleMultiQuote,
  onInsertQuotes,
  focusRef,
  onInsertSelectedQuotes
}: QuickReplyBoxProps) {
  const { theme } = useTheme();
  const { forumUser } = useAuth();
  const { showToast } = useToast();
  const { create, creating } = useCreatePost();
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const pageSizeDropdownRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  
  // Undo/Redo history (simplificat - pentru moment doar pentru shortcuts)
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);
  
  const MAX_CHARS = 10000;
  const DRAFT_KEY_ADVANCED = `forum-editor-draft-${topicId}`;
  
  // Refs pentru a preveni restore-ul multiplu
  const hasRestoredSimpleRef = useRef(false);
  const hasRestoredAdvancedRef = useRef(false);
  const lastSavedContentRef = useRef('');
  const isResettingHeightRef = useRef(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    // Nu ajusta dacă suntem în proces de resetare
    if (isResettingHeightRef.current) {
      return;
    }
    
    if (textareaRef.current && !isAdvancedMode) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = isMobile ? 150 : 200;
      const minHeight = isMobile ? 60 : 80;
      textareaRef.current.style.height = `${Math.max(minHeight, Math.min(scrollHeight, maxHeight))}px`;
    } else if (textareaRef.current && isAdvancedMode) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content, isMobile, isAdvancedMode]);

  // Restore draft from localStorage (doar la mount sau când se schimbă topicId)
  useEffect(() => {
    if (!forumUser || !topicId || isAdvancedMode) {
      hasRestoredSimpleRef.current = false;
      return;
    }
    
    // Restore doar dacă nu am restaurat deja pentru acest topicId
    // IMPORTANT: Nu suprascrie content-ul dacă deja există (poate fi conținut nou scris de user)
    if (!hasRestoredSimpleRef.current) {
      const draftKey = `forum_reply_draft_${topicId}_${forumUser.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      
      // Verifică dacă există deja conținut în state (nu doar în localStorage)
      const currentContent = content || '';
      
      if (savedDraft && savedDraft.trim()) {
        // Restore doar dacă nu există deja conținut (nu suprascrie ce scrie user-ul)
        if (!currentContent || currentContent.trim() === '') {
          setContent(savedDraft);
          lastSavedContentRef.current = savedDraft;
        } else {
          // Dacă există deja conținut, actualizează doar ref-ul (nu suprascrie)
          lastSavedContentRef.current = currentContent;
        }
      } else {
        // Șterge draft-ul dacă e gol
        if (savedDraft) {
          localStorage.removeItem(draftKey);
        }
        // Nu reseta content-ul dacă deja există
        if (!currentContent) {
          setContent('');
        } else {
          lastSavedContentRef.current = currentContent;
        }
      }
      hasRestoredSimpleRef.current = true;
    }
  }, [topicId, forumUser?.id]); // topicId și forumUser.id - nu isAdvancedMode
  
  // Restore draft pentru modul avansat (doar când se activează modul avansat)
  useEffect(() => {
    if (!forumUser || !topicId) {
      hasRestoredAdvancedRef.current = false;
      return;
    }
    
    if (!isAdvancedMode) {
      hasRestoredAdvancedRef.current = false;
      return;
    }
    
    // Restore doar dacă nu am restaurat deja pentru acest topicId în mod avansat
    // NU reseta content-ul dacă deja există (poate fi conținut nou scris de user)
    if (!hasRestoredAdvancedRef.current) {
      const savedDraft = localStorage.getItem(DRAFT_KEY_ADVANCED);
      if (savedDraft && savedDraft.trim()) {
        // Restore doar dacă nu există deja conținut (nu suprascrie ce scrie user-ul)
        if (!content || content.trim() === '') {
          setContent(savedDraft);
          lastSavedContentRef.current = savedDraft;
        } else {
          // Dacă există deja conținut, actualizează doar ref-ul
          lastSavedContentRef.current = content;
        }
      } else {
        // Nu reseta content-ul dacă deja există
        if (!content) {
          setContent('');
        }
      }
      hasRestoredAdvancedRef.current = true;
    }
  }, [isAdvancedMode, topicId, forumUser?.id]); // isAdvancedMode, topicId și forumUser.id - nu content

  // Save draft to localStorage (doar dacă nu e gol) - salvează și la blur
  useEffect(() => {
    if (forumUser && topicId && !isAdvancedMode) {
      const draftKey = `forum_reply_draft_${topicId}_${forumUser.id}`;
      
      // Salvează imediat dacă conținutul s-a schimbat semnificativ
      const saveDraft = () => {
        if (content.trim()) {
          localStorage.setItem(draftKey, content);
          lastSavedContentRef.current = content;
        } else {
          localStorage.removeItem(draftKey);
          lastSavedContentRef.current = '';
        }
      };
      
      const timeoutId = setTimeout(saveDraft, 500); // Debounce 500ms
      
      // Salvează și la blur (când pierde focus-ul)
      const handleBlur = () => {
        saveDraft();
      };
      
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.addEventListener('blur', handleBlur);
      }
      
      // Salvează și când se schimbă tab-ul sau se minimizează
      const handleVisibilityChange = () => {
        if (document.hidden) {
          saveDraft();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearTimeout(timeoutId);
        if (textarea) {
          textarea.removeEventListener('blur', handleBlur);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [content, forumUser, topicId, isAdvancedMode]);
  
  // Auto-save draft pentru modul avansat (fiecare 30 secunde) + clear când e gol + save la blur/visibility change
  useEffect(() => {
    if (!isAdvancedMode || !forumUser || !topicId) return;
    
    const saveDraft = () => {
      if (content.trim()) {
        localStorage.setItem(DRAFT_KEY_ADVANCED, content);
        lastSavedContentRef.current = content;
      } else {
        localStorage.removeItem(DRAFT_KEY_ADVANCED);
        lastSavedContentRef.current = '';
      }
    };
    
    if (content.trim()) {
      const autoSaveTimer = setInterval(saveDraft, 30000); // 30 seconds
      
      // Salvează și la blur
      const handleBlur = () => {
        saveDraft();
      };
      
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.addEventListener('blur', handleBlur);
      }
      
      // Salvează și când se schimbă tab-ul sau se minimizează
      const handleVisibilityChange = () => {
        if (document.hidden) {
          saveDraft();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        clearInterval(autoSaveTimer);
        if (textarea) {
          textarea.removeEventListener('blur', handleBlur);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      // Șterge draft-ul dacă e gol
      localStorage.removeItem(DRAFT_KEY_ADVANCED);
      lastSavedContentRef.current = '';
    }
  }, [content, isAdvancedMode, forumUser, topicId]); // Nu mai includem DRAFT_KEY_ADVANCED
  
  // Clear draft când conținutul devine gol în mod avansat
  useEffect(() => {
    if (isAdvancedMode && !content.trim()) {
      localStorage.removeItem(DRAFT_KEY_ADVANCED);
      lastSavedContentRef.current = '';
    }
  }, [content, isAdvancedMode]); // Nu mai includem DRAFT_KEY_ADVANCED

  // Funcție pentru inserare quote-uri în editor
  const insertQuotes = (quotes: Array<{ postId: string; author: string; content: string }>) => {
    if (!textareaRef.current || quotes.length === 0) return;

    const textarea = textareaRef.current;
    const currentContent = content;
    const cursorPos = textarea.selectionStart || currentContent.length;
    
    // Generează BBCode pentru fiecare quote
    const quoteBlocks = quotes.map(quote => {
      // Păstrăm conținutul complet (cu poze, videouri, formatări), dar eliminăm nested quotes
      let quoteContent = quote.content
        .replace(/\[quote[^\]]*\][\s\S]*?\[\/quote\]/gi, '') // Remove nested quotes
        .trim();
      
      // postId poate fi fie postNumber (string) fie UUID
      // Formatul rămâne același: [quote user="..." post_id="..."]
      return `[quote user="${quote.author}" post_id="${quote.postId}"]\n${quoteContent}\n[/quote]`;
    }).join('\n\n');
    
    // Inserează quote-urile la poziția cursorului
    const newContent = 
      currentContent.substring(0, cursorPos) + 
      (currentContent.substring(cursorPos).length > 0 && !currentContent.substring(cursorPos).match(/^\s*$/) ? '\n\n' : '') +
      quoteBlocks + 
      (currentContent.substring(cursorPos).length > 0 ? '\n\n' : '') +
      currentContent.substring(cursorPos);
    
    setContent(newContent);
    
    // Repoziționează cursorul după quote-uri
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = cursorPos + quoteBlocks.length + (currentContent.substring(cursorPos).length > 0 ? 2 : 0);
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus({ preventScroll: true });
      }
    }, 0);
  };

  // Expozăm funcția de inserare quote-uri către TopicPage
  useEffect(() => {
    if (onInsertQuotes) {
      // onInsertQuotes este un callback care primește funcția de inserare
      onInsertQuotes(insertQuotes);
    }
  }, [onInsertQuotes]);

  // Expune textareaRef către parent prin focusRef
  useEffect(() => {
    if (focusRef && 'current' in focusRef) {
      (focusRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = textareaRef.current;
    }
  }, [focusRef]);

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
    
    if (isAdvancedMode && content.length > MAX_CHARS) {
      showToast(`Mesajul depășește ${MAX_CHARS} caractere!`, 'error');
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
      
      if (isAdvancedMode) {
        localStorage.removeItem(DRAFT_KEY_ADVANCED);
        setIsAdvancedMode(false);
        setShowPreview(false);
        setHistory(['']);
        setHistoryIndex(0);
      }
      
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
  
  const handleSaveDraft = () => {
    if (isAdvancedMode) {
      localStorage.setItem(DRAFT_KEY_ADVANCED, content);
      showToast('Draft salvat!', 'success');
    }
  };
  
  const handleClearDraft = () => {
    if (isAdvancedMode) {
      localStorage.removeItem(DRAFT_KEY_ADVANCED);
      setContent('');
      lastSavedContentRef.current = '';
      hasRestoredAdvancedRef.current = false;
      showToast('Draft șters!', 'info');
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+A - selectează doar textarea (nu tot forumul)
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      if (textareaRef.current) {
        textareaRef.current.select();
      }
      return;
    }
    
    // Ctrl+B - Bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      if (isAdvancedMode && textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;
        const selectedText = text.substring(start, end);
        const hasSelection = start !== end && selectedText.length > 0;
        
        if (hasSelection) {
          const newText = text.substring(0, start) + '[b]' + selectedText + '[/b]' + text.substring(end);
          setContent(newText);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(start + 3 + selectedText.length + 4, start + 3 + selectedText.length + 4);
              textareaRef.current.focus();
            }
          }, 0);
        } else {
          const newText = text.substring(0, start) + '[b][/b]' + text.substring(end);
          setContent(newText);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(start + 3, start + 3);
              textareaRef.current.focus();
            }
          }, 0);
        }
      }
      return;
    }
    
    // Ctrl+I - Italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      if (isAdvancedMode && textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;
        const selectedText = text.substring(start, end);
        const hasSelection = start !== end && selectedText.length > 0;
        
        if (hasSelection) {
          const newText = text.substring(0, start) + '[i]' + selectedText + '[/i]' + text.substring(end);
          setContent(newText);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(start + 3 + selectedText.length + 4, start + 3 + selectedText.length + 4);
              textareaRef.current.focus();
            }
          }, 0);
        } else {
          const newText = text.substring(0, start) + '[i][/i]' + text.substring(end);
          setContent(newText);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(start + 3, start + 3);
              textareaRef.current.focus();
            }
          }, 0);
        }
      }
      return;
    }
    
    // Ctrl+U - Underline
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      if (isAdvancedMode && textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;
        const selectedText = text.substring(start, end);
        const hasSelection = start !== end && selectedText.length > 0;
        
        if (hasSelection) {
          const newText = text.substring(0, start) + '[u]' + selectedText + '[/u]' + text.substring(end);
          setContent(newText);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(start + 3 + selectedText.length + 4, start + 3 + selectedText.length + 4);
              textareaRef.current.focus();
            }
          }, 0);
        } else {
          const newText = text.substring(0, start) + '[u][/u]' + text.substring(end);
          setContent(newText);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(start + 3, start + 3);
              textareaRef.current.focus();
            }
          }, 0);
        }
      }
      return;
    }
    
    // Ctrl+Z - Undo (simplificat - pentru început doar pentru mod avansat)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (isAdvancedMode && historyIndex > 0) {
        isUndoRedoRef.current = true;
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setContent(history[newIndex]);
        setTimeout(() => {
          isUndoRedoRef.current = false;
        }, 100);
      }
      return;
    }
    
    // Ctrl+Y sau Ctrl+Shift+Z - Redo
    if (((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey)) {
      e.preventDefault();
      if (isAdvancedMode && historyIndex < history.length - 1) {
        isUndoRedoRef.current = true;
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setContent(history[newIndex]);
        setTimeout(() => {
          isUndoRedoRef.current = false;
        }, 100);
      }
      return;
    }
    
    // Ctrl+Enter / Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (content.trim() && !creating) {
        handleSubmit(e);
      }
    }
  };
  
  // Track history pentru undo/redo în mod avansat (simplificat - adaugă la history când content se schimbă manual)
  useEffect(() => {
    if (isAdvancedMode && !isUndoRedoRef.current && content !== (history[historyIndex] || '')) {
      // Adaugă la history doar dacă content-ul s-a schimbat manual (nu prin undo/redo)
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(content);
        if (newHistory.length > 50) {
          newHistory.shift();
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        }
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
      });
    }
  }, [content, isAdvancedMode]); // Track doar content changes manuale

  // Insert emoji
  const handleEmojiClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content;
    
    const newText = text.substring(0, start) + emoji + text.substring(end);
    setContent(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + emoji.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus({ preventScroll: true });
      }
    }, 0);
  };

  // Close pageSize dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pageSizeDropdownRef.current && !pageSizeDropdownRef.current.contains(event.target as Node)) {
        setIsPageSizeOpen(false);
      }
    };

    if (isPageSizeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isPageSizeOpen]);

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
        borderRadius: isMobile ? '0.5rem' : '0.75rem',
        padding: isMobile ? '0.75rem' : '1rem',
        zIndex: 100,
        boxShadow: isFocused ? '0 -4px 12px rgba(0, 0, 0, 0.1)' : '0 -2px 8px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s'
      }}
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e);
        }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Editor Toolbar - doar în mod avansat */}
        {isAdvancedMode && (
          <EditorToolbar
            textareaRef={textareaRef}
            currentContent={content}
            onContentChange={(newContent) => {
              if (newContent.length <= MAX_CHARS) {
                setContent(newContent);
              }
            }}
            isMobile={isMobile}
          />
        )}
        
        {/* Toolbar secundar - Preview, Draft actions - doar în mod avansat */}
        {isAdvancedMode && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0',
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

            {localStorage.getItem(DRAFT_KEY_ADVANCED) && (
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
        )}

        {/* Content Area - Textarea sau Preview */}
        <div style={{ position: 'relative' }}>
          {isAdvancedMode && showPreview ? (
            /* Preview Mode - Exact ca un post real */
            <div
              style={{
                backgroundColor: theme.surface,
                border: isMobile ? `1px solid ${theme.border}` : `2px solid ${theme.border}`,
                borderRadius: isMobile ? '0.5rem' : '0.75rem',
                overflow: 'hidden',
                boxShadow: isMobile ? '0 1px 3px rgba(0, 0, 0, 0.05)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                minHeight: isMobile ? '150px' : '200px'
              }}
            >
              {/* Layout: Sidebar + Content - Exact ca MessageContainer */}
              <div style={{ 
                display: 'flex', 
                minHeight: isMobile ? '150px' : '200px', 
                flexDirection: 'row',
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden'
              }}>
                {/* Sidebar Placeholder - Exact ca MessageSidebar */}
                <div style={{
                  width: isMobile ? '100px' : '200px',
                  minWidth: isMobile ? '100px' : '200px',
                  maxWidth: isMobile ? '100px' : '200px',
                  backgroundColor: theme.background,
                  borderRight: `1px solid ${theme.border}`,
                  padding: isMobile ? '0.5rem 0.375rem' : '1.5rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {/* Avatar Real */}
                  <div
                    style={{
                      width: isMobile ? '2.5rem' : '4rem',
                      height: isMobile ? '2.5rem' : '4rem',
                      borderRadius: '50%',
                      background: (forumUser?.avatar_url)
                        ? `url(${forumUser.avatar_url}) center/cover`
                        : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: (forumUser?.avatar_url) ? 'transparent' : 'white',
                      fontSize: isMobile ? '1rem' : '1.5rem',
                      fontWeight: '600',
                      marginBottom: isMobile ? '0.375rem' : '0.75rem',
                      border: `2px solid ${theme.border}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      flexShrink: 0,
                      opacity: 0.7
                    }}
                  >
                    {!(forumUser?.avatar_url) && (forumUser?.username?.charAt(0).toUpperCase() || '?')}
                  </div>

                  {/* Nume Placeholder */}
                  <div style={{
                    fontWeight: '600',
                    color: theme.textSecondary,
                    fontSize: isMobile ? '0.6875rem' : '0.875rem',
                    marginBottom: isMobile ? '0.25rem' : '0.5rem',
                    opacity: 0.7
                  }}>
                    {forumUser?.username || 'Tu'}
                  </div>

                  {/* Rang Placeholder */}
                  <div style={{
                    fontSize: isMobile ? '0.5625rem' : '0.75rem',
                    color: theme.textSecondary,
                    marginBottom: isMobile ? '0.375rem' : '0.75rem',
                    opacity: 0.7
                  }}>
                    🎣 Pescar
                  </div>

                  {/* Respect Placeholder */}
                  <div style={{
                    backgroundColor: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.375rem',
                    padding: isMobile ? '0.25rem 0.375rem' : '0.5rem',
                    marginBottom: isMobile ? '0.375rem' : '0.75rem',
                    width: '100%',
                    opacity: 0.7
                  }}>
                    <div style={{ 
                      fontSize: isMobile ? '0.5625rem' : '0.75rem', 
                      color: theme.textSecondary, 
                      marginBottom: '0.125rem'
                    }}>
                      {isMobile ? 'Rep.' : 'Respect'}
                    </div>
                    <div style={{
                      fontWeight: '600',
                      fontSize: isMobile ? '0.75rem' : '1rem',
                      color: theme.textSecondary
                    }}>
                      +0
                    </div>
                  </div>

                  {/* Equipment Button - Placeholder */}
                  <button
                    type="button"
                    disabled
                    style={{
                      fontSize: isMobile ? '0.5625rem' : '0.75rem',
                      color: theme.textSecondary,
                      backgroundColor: 'transparent',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '0.375rem',
                      padding: isMobile ? '0.25rem 0.375rem' : '0.375rem 0.75rem',
                      cursor: 'not-allowed',
                      width: '100%',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      opacity: 0.7
                    }}
                  >
                    {isMobile ? '📋' : '📋 Echipament'}
                  </button>
                </div>

                {/* Content area - Exact ca MessageContainer content */}
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  minWidth: 0,
                  maxWidth: '100%'
                }}>
                  {/* Message content - Exact styling ca post real */}
                  <div
                    style={{
                      flex: 1,
                      padding: isMobile ? '0.75rem' : '1.5rem',
                      fontSize: isMobile ? '0.8125rem' : '0.875rem',
                      color: theme.text,
                      lineHeight: '1.6',
                      position: 'relative',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      maxWidth: '100%',
                      overflowX: 'hidden'
                    }}
                  >
                    <div style={{
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%'
                    }}
                      dangerouslySetInnerHTML={{
                        __html: content.trim() 
                          ? parseBBCode(content).html
                          : `<span style="color: ${theme.textSecondary}; font-style: italic;">Preview-ul va apărea aici...</span>`
                      }}
                    />
                  </div>

                  {/* Actions - Structură ca MessageActions */}
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
                    <div style={{ flexShrink: 0, marginRight: 'auto', opacity: 0.7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          disabled
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: isMobile ? '0.3125rem 0.4375rem' : '0.375rem 0.5rem',
                            backgroundColor: 'transparent',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '0.375rem',
                            color: theme.textSecondary,
                            cursor: 'not-allowed',
                            fontSize: isMobile ? '0.625rem' : '0.6875rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          <ThumbsUp style={{ width: isMobile ? '0.875rem' : '1rem', height: isMobile ? '0.875rem' : '1rem' }} />
                          <span>0</span>
                        </button>
                        <button
                          type="button"
                          disabled
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: isMobile ? '0.3125rem 0.4375rem' : '0.375rem 0.5rem',
                            backgroundColor: 'transparent',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '0.375rem',
                            color: theme.textSecondary,
                            cursor: 'not-allowed',
                            fontSize: isMobile ? '0.625rem' : '0.6875rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          <ThumbsDown style={{ width: isMobile ? '0.875rem' : '1rem', height: isMobile ? '0.875rem' : '1rem' }} />
                          <span>0</span>
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons - În dreapta, mai mici */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'nowrap', flexShrink: 0 }}>
                      <button
                        type="button"
                        disabled
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: isMobile ? '0.3125rem 0.4375rem' : '0.375rem 0.5rem',
                          backgroundColor: 'transparent',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '0.375rem',
                          color: theme.textSecondary,
                          cursor: 'not-allowed',
                          fontSize: isMobile ? '0.625rem' : '0.6875rem',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          opacity: 0.7
                        }}
                      >
                        <MessageSquare style={{ width: isMobile ? '0.6875rem' : '0.75rem', height: isMobile ? '0.6875rem' : '0.75rem' }} />
                        <span>Răspunde</span>
                      </button>

                      <button
                        type="button"
                        disabled
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: isMobile ? '0.3125rem 0.4375rem' : '0.375rem 0.5rem',
                          backgroundColor: 'transparent',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '0.375rem',
                          color: theme.textSecondary,
                          cursor: 'not-allowed',
                          fontSize: isMobile ? '0.625rem' : '0.6875rem',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          opacity: 0.7
                        }}
                      >
                        <Quote style={{ width: isMobile ? '0.6875rem' : '0.75rem', height: isMobile ? '0.6875rem' : '0.75rem' }} />
                        <span>Citează</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode - Textarea */
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                const newContent = e.target.value;
                if (newContent.length <= MAX_CHARS) {
                  setContent(newContent);
                }
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={creating}
              style={{
                width: '100%',
                minHeight: isAdvancedMode 
                  ? (isMobile ? '200px' : '300px')
                  : (isMobile ? '60px' : '80px'),
                maxHeight: isAdvancedMode ? 'none' : (isMobile ? '150px' : '200px'),
                padding: isAdvancedMode
                  ? '1rem'
                  : (isMobile ? '0.625rem 2.5rem 0.625rem 0.75rem' : '0.75rem 3rem 0.75rem 1rem'),
                border: `1px solid ${isFocused ? theme.primary : theme.border}`,
                borderRadius: '0.5rem',
                fontSize: isMobile ? '0.875rem' : isAdvancedMode ? '0.875rem' : '0.9375rem',
                fontFamily: 'inherit',
                lineHeight: isAdvancedMode ? '1.6' : '1.5',
                color: theme.text,
                backgroundColor: theme.background,
                outline: 'none',
                resize: isAdvancedMode ? 'vertical' : 'none',
                overflowY: 'auto',
                transition: 'all 0.2s',
                opacity: creating ? 0.7 : 1,
                cursor: creating ? 'not-allowed' : 'text'
              }}
            />
          )}

          {/* Emoji button - doar în mod simplu */}
          {!isAdvancedMode && (
            <div style={{ position: 'relative', zIndex: 1000 }}>
              <button
                ref={emojiButtonRef}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEmojiClick();
                }}
                disabled={creating}
                style={{
                  position: 'absolute',
                  bottom: isMobile ? '0.5rem' : '0.625rem',
                  right: isMobile ? '0.5rem' : '0.75rem',
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
                  opacity: creating ? 0.5 : 1,
                  zIndex: 10
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
          )}
          
          {/* Character Counter - doar în mod avansat */}
          {isAdvancedMode && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.5rem',
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
          )}
        </div>

        {/* Actions bar - Butoanele (ÎN FORM) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Left side - PageSize Selector (Custom Dropdown) */}
          {onPageSizeChange && (
            <div
              ref={pageSizeDropdownRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                position: 'relative'
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? '0.625rem' : '0.6875rem',
                  color: theme.textSecondary,
                  whiteSpace: 'nowrap'
                }}
              >
                {isMobile ? 'Pag:' : 'Postări/pag:'}
              </span>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => !creating && setIsPageSizeOpen(!isPageSizeOpen)}
                  disabled={creating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
                    paddingRight: isMobile ? '1.75rem' : '2rem',
                    backgroundColor: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.375rem',
                    color: theme.text,
                    fontSize: isMobile ? '0.75rem' : '0.8125rem',
                    fontWeight: '500',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s',
                    opacity: creating ? 0.5 : 1,
                    minWidth: isMobile ? '48px' : '56px',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!creating) {
                      e.currentTarget.style.borderColor = theme.primary;
                      e.currentTarget.style.backgroundColor = theme.surfaceHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!creating) {
                      e.currentTarget.style.borderColor = theme.border;
                      e.currentTarget.style.backgroundColor = theme.surface;
                    }
                  }}
                >
                  <span>{pageSize}</span>
                  <ChevronDown
                    size={isMobile ? 12 : 14}
                    style={{
                      position: 'absolute',
                      right: isMobile ? '0.5rem' : '0.75rem',
                      top: '50%',
                      transform: `translateY(-50%) ${isPageSizeOpen ? 'rotate(180deg)' : ''}`,
                      transition: 'transform 0.2s',
                      opacity: 0.7,
                      pointerEvents: 'none'
                    }}
                  />
                </button>

                {/* Dropdown Menu */}
                {isPageSizeOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '0.25rem',
                      backgroundColor: theme.surface,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '0.375rem',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      zIndex: 1000,
                      minWidth: isMobile ? '48px' : '56px',
                      overflow: 'hidden'
                    }}
                  >
                    {[10, 20, 50].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          if (size !== pageSize && onPageSizeChange) {
                            onPageSizeChange(size);
                          }
                          setIsPageSizeOpen(false);
                        }}
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                          textAlign: 'center',
                          fontSize: isMobile ? '0.75rem' : '0.8125rem',
                          fontWeight: '500',
                          color: size === pageSize ? 'white' : theme.text,
                          backgroundColor: size === pageSize ? theme.primary : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (size !== pageSize) {
                            e.currentTarget.style.backgroundColor = theme.surfaceHover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (size !== pageSize) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right side - Butoanele */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Character count (optional - hidden on mobile if space is limited, doar în mod simplu) */}
            {!isMobile && !isAdvancedMode && content.length > 0 && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: content.length > 10000 ? theme.error : theme.textSecondary
                }}
              >
                {content.length} / 10000
              </span>
            )}

            {/* Buton Multi-Quote Toggle - Inserează quote-urile când se apasă */}
            {onToggleMultiQuote && selectedQuotesCount > 0 && onInsertSelectedQuotes && (
              <button
                type="button"
                onClick={() => {
                  // Inserează quote-urile selectate în editor
                  // TopicPage va furniza quote-urile prin onInsertSelectedQuotes
                  if (onInsertSelectedQuotes) {
                    onInsertSelectedQuotes([]); // Array gol - TopicPage va colecta quote-urile
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: isMobile ? '0.5rem 0.75rem' : '0.5625rem 1rem',
                  background: theme.primary,
                  border: `1px solid ${theme.primary}`,
                  borderRadius: '0.375rem',
                  color: 'white',
                  fontSize: isMobile ? '0.75rem' : '0.8125rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <Quote size={isMobile ? 14 : 16} />
                <span>{isMobile ? 'Inserează' : 'Inserează Quote-uri'}</span>
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    borderRadius: '50%',
                    width: isMobile ? '18px' : '20px',
                    height: isMobile ? '18px' : '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '0.625rem' : '0.6875rem',
                    fontWeight: '600',
                    marginLeft: '0.25rem'
                  }}
                >
                  {selectedQuotesCount}
                </span>
              </button>
            )}

            {/* Buton Răspuns Complex - toggle modul avansat inline */}
            <button
              type="button"
              onClick={() => {
                if (!isAdvancedMode) {
                  // Activează modul avansat - păstrează conținutul
                  setIsAdvancedMode(true);
                  // Inițializează history cu conținutul curent
                  const initialHistory = content.trim() ? ['', content] : [''];
                  setHistory(initialHistory);
                  setHistoryIndex(initialHistory.length - 1);
                } else {
                  // Dezactivează modul avansat
                  setIsAdvancedMode(false);
                  setShowPreview(false);
                  // Reset history
                  setHistory(['']);
                  setHistoryIndex(0);
                  // Reset textarea height la dimensiunea originală (minimă)
                  if (textareaRef.current) {
                    isResettingHeightRef.current = true;
                    const originalHeight = isMobile ? '60px' : '80px';
                    textareaRef.current.style.height = originalHeight;
                    textareaRef.current.style.minHeight = originalHeight;
                    textareaRef.current.style.maxHeight = isMobile ? '150px' : '200px';
                    // Force reflow și reset flag după un scurt delay
                    requestAnimationFrame(() => {
                      if (textareaRef.current) {
                        textareaRef.current.style.height = originalHeight;
                      }
                      setTimeout(() => {
                        isResettingHeightRef.current = false;
                      }, 100);
                    });
                  }
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
                  : isAdvancedMode
                    ? theme.primary
                    : theme.border,
                color: creating ? theme.textSecondary : isAdvancedMode ? 'white' : theme.text,
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
                  e.currentTarget.style.backgroundColor = isAdvancedMode ? theme.primary : theme.surfaceHover;
                  e.currentTarget.style.borderColor = theme.primary;
                  if (!isAdvancedMode) {
                    e.currentTarget.style.color = theme.primary;
                  }
                }
              }}
              onMouseLeave={(e) => {
                if (!creating) {
                  e.currentTarget.style.backgroundColor = isAdvancedMode ? theme.primary : theme.border;
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.color = isAdvancedMode ? 'white' : theme.text;
                }
              }}
            >
              <Edit3 size={isMobile ? 13 : 14} />
              <span>{isMobile ? (isAdvancedMode ? 'Simplu' : 'Complex') : (isAdvancedMode ? 'Mod Simplu' : 'Răspuns Complex')}</span>
            </button>

            <button
              type="submit"
              disabled={creating || !content.trim() || (isAdvancedMode && content.length > MAX_CHARS)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: isMobile ? '0.5rem 0.75rem' : '0.5625rem 1rem',
                background: creating || !content.trim() || (isAdvancedMode && content.length > MAX_CHARS)
                  ? theme.surfaceHover
                  : theme.primary,
                color: creating || !content.trim() || (isAdvancedMode && content.length > MAX_CHARS) ? theme.textSecondary : 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: isMobile ? '0.75rem' : '0.8125rem',
                fontWeight: '500',
                cursor: creating || !content.trim() || (isAdvancedMode && content.length > MAX_CHARS) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: creating || !content.trim() || (isAdvancedMode && content.length > MAX_CHARS) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!creating && content.trim() && !(isAdvancedMode && content.length > MAX_CHARS)) {
                  e.currentTarget.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                if (!creating && content.trim() && !(isAdvancedMode && content.length > MAX_CHARS)) {
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
                      border: `2px solid ${creating || !content.trim() || (isAdvancedMode && content.length > MAX_CHARS) ? theme.textSecondary : 'rgba(255, 255, 255, 0.3)'}`,
                      borderTop: `2px solid ${creating || !content.trim() || (isAdvancedMode && content.length > MAX_CHARS) ? theme.textSecondary : 'white'}`,
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
                  {!isMobile && !isAdvancedMode && (
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

      {/* EmojiPicker - MUTAT ÎNAFARA FORM-ULUI pentru a preveni submit-ul automat */}
      {/* PROBLEMA IDENTIFICATĂ: EmojiPicker era renderat ÎN FORM, ceea ce făcea ca click-urile pe emoji
          să declanșeze submit-ul form-ului (chiar dacă butonul avea type="button").
          SOLUȚIE: Mutăm EmojiPicker în afara form-ului, astfel click-urile nu mai declanșează submit-ul. */}
      {!isAdvancedMode && showEmojiPicker && (
        <EmojiPicker
          isOpen={showEmojiPicker}
          onClose={() => {
            setShowEmojiPicker(false);
          }}
          onSelect={(emoji) => {
            handleEmojiSelect(emoji);
            setShowEmojiPicker(false);
            // Focus pe textarea după selectare
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.focus();
              }
            }, 0);
          }}
          anchorRef={emojiButtonRef}
        />
      )}

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

