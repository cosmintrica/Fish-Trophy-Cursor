/**
 * EditorToolbar - Toolbar pentru formatare text în Advanced Editor
 * Inserează BBCode tags în textarea
 */

import { useState, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Link,
  Image,
  Video,
  Smile,
  EyeOff,
  AtSign,
  Trophy,
  Fish,
  Wrench
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import EditorInputModal from './EditorInputModal';
import EmojiPicker from './EmojiPicker';

interface EditorToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onContentChange?: (newContent: string) => void;
  currentContent?: string; // Content-ul curent din state
  isMobile?: boolean;
}

export default function EditorToolbar({
  textareaRef,
  onContentChange,
  currentContent = '',
  isMobile = false 
}: EditorToolbarProps) {
  const { theme } = useTheme();
  const [inputModal, setInputModal] = useState<{ type: 'link' | 'image' | 'video' | 'record' | 'catch' | 'gear'; isOpen: boolean }>({
    type: 'link',
    isOpen: false
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  // Salvează poziția cursorului înainte de a deschide modal-ul
  const savedCursorPositionRef = useRef<{ start: number; end: number; scrollTop: number } | null>(null);

  // Helper pentru inserarea textului în textarea la poziția cursorului
  const insertText = (before: string, after: string = '', placeholder: string = '', useSavedPosition: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let start: number;
    let end: number;
    let text: string;

    // Folosește poziția salvată sau poziția curentă
    if (useSavedPosition && savedCursorPositionRef.current) {
      start = savedCursorPositionRef.current.start;
      end = savedCursorPositionRef.current.end;
      // Folosește currentContent dacă e disponibil, altfel textarea.value
      text = currentContent || textarea.value;
      // Resetăm poziția salvată
      savedCursorPositionRef.current = null;
    } else {
      start = textarea.selectionStart;
      end = textarea.selectionEnd;
      // Folosește currentContent dacă e disponibil, altfel textarea.value
      text = currentContent || textarea.value;
    }

    const selectedText = text.substring(start, end);
    const hasSelection = start !== end && selectedText.length > 0;

    let newText: string;
    let newCursorPos: number;

    if (hasSelection) {
      // Dacă există text selectat, wrap-ul îl cu tag-uri (MEREU înainte și după text selectat)
      newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
      // Cursorul după tag-ul de închidere (după textul selectat)
      newCursorPos = start + before.length + selectedText.length + after.length;
    } else {
      // Dacă nu există text selectat, inserează tag-urile și placeholder-ul (dacă există)
      newText = text.substring(0, start) + before + placeholder + after + text.substring(end);
      // Cursorul între tag-uri - după tag-ul de deschidere + placeholder (astfel cursorul e între tag-uri)
      newCursorPos = start + before.length + placeholder.length;
    }
    
    // Notifică schimbarea (va actualiza state-ul)
    onContentChange?.(newText);
    
    // Așteaptă ca React să actualizeze DOM-ul, apoi repoziționează cursorul fără scroll
    setTimeout(() => {
      if (textareaRef.current) {
        // Previne scroll-ul când textarea primește focus
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        // Setează poziția cursorului
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        // Focus FĂRĂ scroll - folosește preventScroll
        textareaRef.current.focus({ preventScroll: true });
        // Restaură poziția de scroll imediat (fără delay)
        window.scrollTo({ top: scrollTop, behavior: 'auto' });
        // Double-check după un frame
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollTop, behavior: 'auto' });
        });
        // Triple-check după încă un frame
        setTimeout(() => {
          window.scrollTo({ top: scrollTop, behavior: 'auto' });
        }, 50);
      }
    }, 200);
  };

  // Formatare text simplă - fără placeholder, cursor între tag-uri
  const formatBold = () => insertText('[b]', '[/b]', '');
  const formatItalic = () => insertText('[i]', '[/i]', '');
  const formatUnderline = () => insertText('[u]', '[/u]', '');
  const formatStrikethrough = () => insertText('[s]', '[/s]', '');

  // Headings
  const formatHeading1 = () => insertText('[h1]', '[/h1]', 'Titlu');
  const formatHeading2 = () => insertText('[h2]', '[/h2]', 'Subtitlu');
  const formatHeading3 = () => insertText('[h3]', '[/h3]', 'Sub-subtitlu');

  // Lists
  const formatUnorderedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    // Dacă există text selectat pe mai multe linii, adaugă [*] la fiecare linie
    if (selectedText.includes('\n')) {
      const lines = selectedText.split('\n');
      const formattedLines = lines.map(line => line.trim() ? `[*]${line.trim()}` : '').filter(Boolean);
      const formatted = `[list]\n${formattedLines.join('\n')}\n[/list]`;
      insertText(formatted, '');
    } else {
      insertText('[list]\n[*]', '\n[/list]', 'Element listă');
    }
  };

  const formatOrderedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    // Dacă există text selectat pe mai multe linii, adaugă [*] la fiecare linie
    if (selectedText.includes('\n')) {
      const lines = selectedText.split('\n');
      const formattedLines = lines.map(line => line.trim() ? `[*]${line.trim()}` : '').filter(Boolean);
      const formatted = `[list=1]\n${formattedLines.join('\n')}\n[/list]`;
      insertText(formatted, '');
    } else {
      insertText('[list=1]\n[*]', '\n[/list]', 'Element listă');
    }
  };

  // Code
  const formatCode = () => insertText('[code]', '[/code]', 'cod');
  const formatCodeBlock = () => insertText('[code]\n', '\n[/code]', 'bloc de cod');

  // Link
  const formatLink = () => {
    // Salvează poziția cursorului și scroll înainte de a deschide modal-ul
    if (textareaRef.current) {
      savedCursorPositionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop
      };
    }
    setInputModal({ type: 'link', isOpen: true });
  };

  const handleLinkInsert = (url: string, text?: string) => {
    // Salvează poziția scroll-ului înainte de inserare
    const savedScroll = savedCursorPositionRef.current?.scrollTop ?? (window.pageYOffset || document.documentElement.scrollTop);
    
    // Inserează textul folosind poziția salvată
    if (savedCursorPositionRef.current) {
      // Așteaptă puțin pentru ca modal-ul să se închidă, apoi inserează
      setTimeout(() => {
        insertText(`[url=${url}]`, '[/url]', text || url, true);
        // Restaură poziția scroll-ului după inserare
        setTimeout(() => {
          window.scrollTo({ top: savedScroll, behavior: 'auto' });
        }, 100);
      }, 100);
    } else {
      // Fallback: inserează la sfârșitul textului dacă nu avem poziție salvată
      const textarea = textareaRef.current;
      if (textarea) {
        const currentText = currentContent || textarea.value;
        const newText = currentText + `[url=${url}]${text || url}[/url]`;
        onContentChange?.(newText);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newText.length, newText.length);
            textareaRef.current.focus({ preventScroll: true });
          }
        }, 50);
      }
    }
  };

  // Image
  const formatImage = () => {
    // Salvează poziția cursorului și scroll înainte de a deschide modal-ul
    if (textareaRef.current) {
      savedCursorPositionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop
      };
    }
    setInputModal({ type: 'image', isOpen: true });
  };

  const handleImageInsert = (url: string) => {
    // Salvează poziția scroll-ului înainte de inserare
    const savedScroll = savedCursorPositionRef.current?.scrollTop ?? (window.pageYOffset || document.documentElement.scrollTop);
    
    // Inserează textul folosind poziția salvată
    if (savedCursorPositionRef.current) {
      // Așteaptă puțin pentru ca modal-ul să se închidă, apoi inserează
      setTimeout(() => {
        insertText(`[img]`, '[/img]', url, true);
        // Restaură poziția scroll-ului după inserare
        setTimeout(() => {
          window.scrollTo({ top: savedScroll, behavior: 'auto' });
        }, 100);
      }, 100);
    } else {
      // Fallback: inserează la sfârșitul textului dacă nu avem poziție salvată
      const textarea = textareaRef.current;
      if (textarea) {
        const currentText = currentContent || textarea.value;
        const newText = currentText + `[img]${url}[/img]`;
        onContentChange?.(newText);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newText.length, newText.length);
            textareaRef.current.focus({ preventScroll: true });
          }
        }, 50);
      }
    }
  };

  // Video (YouTube/Vimeo)
  const formatVideo = () => {
    // Salvează poziția cursorului și scroll înainte de a deschide modal-ul
    if (textareaRef.current) {
      savedCursorPositionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop
      };
    }
    setInputModal({ type: 'video', isOpen: true });
  };

  const handleVideoInsert = (url: string) => {
    // Salvează poziția scroll-ului înainte de inserare
    const savedScroll = savedCursorPositionRef.current?.scrollTop ?? (window.pageYOffset || document.documentElement.scrollTop);
    
    // Inserează textul folosind poziția salvată
    if (savedCursorPositionRef.current) {
      // Așteaptă puțin pentru ca modal-ul să se închidă, apoi inserează
      setTimeout(() => {
        insertText(`[video]`, '[/video]', url, true);
        // Restaură poziția scroll-ului după inserare
        setTimeout(() => {
          window.scrollTo({ top: savedScroll, behavior: 'auto' });
        }, 100);
      }, 100);
    } else {
      // Fallback: inserează la sfârșitul textului dacă nu avem poziție salvată
      const textarea = textareaRef.current;
      if (textarea) {
        const currentText = currentContent || textarea.value;
        const newText = currentText + `[video]${url}[/video]`;
        onContentChange?.(newText);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newText.length, newText.length);
            textareaRef.current.focus({ preventScroll: true });
          }
        }, 50);
      }
    }
  };

  // Record Embed
  const formatRecord = () => {
    if (textareaRef.current) {
      savedCursorPositionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop
      };
    }
    setInputModal({ type: 'record', isOpen: true });
  };

  const handleRecordInsert = (id: string) => {
    const savedScroll = savedCursorPositionRef.current?.scrollTop ?? (window.pageYOffset || document.documentElement.scrollTop);
    if (savedCursorPositionRef.current) {
      setTimeout(() => {
        insertText(`[record]`, '[/record]', id, true);
        setTimeout(() => {
          window.scrollTo({ top: savedScroll, behavior: 'auto' });
        }, 100);
      }, 100);
    } else {
      const textarea = textareaRef.current;
      if (textarea) {
        const currentText = currentContent || textarea.value;
        const newText = currentText + `[record]${id}[/record]`;
        onContentChange?.(newText);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newText.length, newText.length);
            textareaRef.current.focus({ preventScroll: true });
          }
        }, 50);
      }
    }
  };

  // Catch Embed
  const formatCatch = () => {
    if (textareaRef.current) {
      savedCursorPositionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop
      };
    }
    setInputModal({ type: 'catch', isOpen: true });
  };

  const handleCatchInsert = (id: string) => {
    const savedScroll = savedCursorPositionRef.current?.scrollTop ?? (window.pageYOffset || document.documentElement.scrollTop);
    if (savedCursorPositionRef.current) {
      setTimeout(() => {
        insertText(`[catch]`, '[/catch]', id, true);
        setTimeout(() => {
          window.scrollTo({ top: savedScroll, behavior: 'auto' });
        }, 100);
      }, 100);
    } else {
      const textarea = textareaRef.current;
      if (textarea) {
        const currentText = currentContent || textarea.value;
        const newText = currentText + `[catch]${id}[/catch]`;
        onContentChange?.(newText);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newText.length, newText.length);
            textareaRef.current.focus({ preventScroll: true });
          }
        }, 50);
      }
    }
  };

  // Gear Embed
  const formatGear = () => {
    if (textareaRef.current) {
      savedCursorPositionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop
      };
    }
    setInputModal({ type: 'gear', isOpen: true });
  };

  const handleGearInsert = (id: string) => {
    const savedScroll = savedCursorPositionRef.current?.scrollTop ?? (window.pageYOffset || document.documentElement.scrollTop);
    if (savedCursorPositionRef.current) {
      setTimeout(() => {
        insertText(`[gear]`, '[/gear]', id, true);
        setTimeout(() => {
          window.scrollTo({ top: savedScroll, behavior: 'auto' });
        }, 100);
      }, 100);
    } else {
      const textarea = textareaRef.current;
      if (textarea) {
        const currentText = currentContent || textarea.value;
        const newText = currentText + `[gear]${id}[/gear]`;
        onContentChange?.(newText);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newText.length, newText.length);
            textareaRef.current.focus({ preventScroll: true });
          }
        }, 50);
      }
    }
  };

  // Spoiler
  const formatSpoiler = () => {
    insertText('[spoiler]', '[/spoiler]', 'Text spoiler aici');
  };

  // Mention - inserează direct tag-urile fără modal
  const formatMention = () => {
    insertText('[mention]', '[/mention]', 'username');
  };

  // Emoji picker
  const formatEmoji = () => {
    // Salvează poziția cursorului înainte de a deschide picker-ul
    if (textareaRef.current) {
      savedCursorPositionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop
      };
    }
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = (emoji: string) => {
    const savedScroll = savedCursorPositionRef.current?.scrollTop ?? (window.pageYOffset || document.documentElement.scrollTop);
    
    if (savedCursorPositionRef.current) {
      setTimeout(() => {
        insertText(emoji, '', '', true);
        setTimeout(() => {
          window.scrollTo({ top: savedScroll, behavior: 'auto' });
        }, 100);
      }, 50);
    } else {
      // Fallback: inserează la sfârșitul textului
      const textarea = textareaRef.current;
      if (textarea) {
        const currentText = currentContent || textarea.value;
        const newText = currentText + emoji;
        onContentChange?.(newText);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newText.length, newText.length);
            textareaRef.current.focus({ preventScroll: true });
          }
        }, 50);
      }
    }
  };

  // Stiluri pentru butoane
  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobile ? '0.375rem' : '0.5rem',
    backgroundColor: 'transparent',
    border: `1px solid ${theme.border}`,
    borderRadius: '0.375rem',
    color: theme.text,
    cursor: 'pointer',
    fontSize: isMobile ? '0.75rem' : '0.875rem',
    transition: 'all 0.2s',
    minWidth: isMobile ? '2rem' : '2.5rem',
    height: isMobile ? '2rem' : '2.5rem'
  } as React.CSSProperties;

  const buttonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = theme.surfaceHover;
    e.currentTarget.style.borderColor = theme.primary;
    e.currentTarget.style.color = theme.primary;
  };

  const buttonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.borderColor = theme.border;
    e.currentTarget.style.color = theme.text;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: isMobile ? '0.5rem' : '0.75rem 1rem',
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.background,
        flexWrap: 'wrap',
        overflowX: 'auto'
      }}
    >
      {/* Formatare text de bază */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          onClick={formatBold}
          title="Bold (Ctrl+B)"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Bold size={isMobile ? 14 : 16} />
        </button>
        <button
          type="button"
          onClick={formatItalic}
          title="Italic (Ctrl+I)"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Italic size={isMobile ? 14 : 16} />
        </button>
        <button
          type="button"
          onClick={formatUnderline}
          title="Underline (Ctrl+U)"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Underline size={isMobile ? 14 : 16} />
        </button>
        <button
          type="button"
          onClick={formatStrikethrough}
          title="Strikethrough"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Strikethrough size={isMobile ? 14 : 16} />
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '1.5rem', backgroundColor: theme.border, margin: '0 0.25rem' }} />

      {/* Headings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          onClick={formatHeading1}
          title="Heading 1"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Heading1 size={isMobile ? 14 : 16} />
        </button>
        <button
          type="button"
          onClick={formatHeading2}
          title="Heading 2"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Heading2 size={isMobile ? 14 : 16} />
        </button>
        <button
          type="button"
          onClick={formatHeading3}
          title="Heading 3"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Heading3 size={isMobile ? 14 : 16} />
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '1.5rem', backgroundColor: theme.border, margin: '0 0.25rem' }} />

      {/* Lists */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          onClick={formatUnorderedList}
          title="Listă neordonată"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <List size={isMobile ? 14 : 16} />
        </button>
        <button
          type="button"
          onClick={formatOrderedList}
          title="Listă ordonată"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <ListOrdered size={isMobile ? 14 : 16} />
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '1.5rem', backgroundColor: theme.border, margin: '0 0.25rem' }} />

      {/* Code */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          onClick={formatCode}
          title="Cod inline"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Code size={isMobile ? 14 : 16} />
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '1.5rem', backgroundColor: theme.border, margin: '0 0.25rem' }} />

      {/* Media */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          onClick={formatLink}
          title="Inserare link"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Link size={isMobile ? 14 : 16} />
        </button>
        <button
          type="button"
          onClick={formatImage}
          title="Inserare imagine"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Image size={isMobile ? 14 : 16} />
        </button>
        <button
          type="button"
          onClick={formatVideo}
          title="Inserare video"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Video size={isMobile ? 14 : 16} />
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '1.5rem', backgroundColor: theme.border, margin: '0 0.25rem' }} />

      {/* Spoiler */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          onClick={formatSpoiler}
          title="Spoiler"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <EyeOff size={isMobile ? 14 : 16} />
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '1.5rem', backgroundColor: theme.border, margin: '0 0.25rem' }} />

      {/* Mention */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          onClick={formatMention}
          title="Mențiune utilizator"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <AtSign size={isMobile ? 14 : 16} />
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '1.5rem', backgroundColor: theme.border, margin: '0 0.25rem' }} />

      {/* Emoji */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
        <button
          ref={emojiButtonRef}
          type="button"
          onClick={formatEmoji}
          title="Emoji picker"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Smile size={isMobile ? 14 : 16} />
        </button>
        
        <EmojiPicker
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSelect={handleEmojiSelect}
          anchorRef={emojiButtonRef}
        />
      </div>

      {/* Modaluri pentru Link/Image/Video/Record/Catch/Gear */}
      <EditorInputModal
        isOpen={inputModal.isOpen && inputModal.type === 'link'}
        type="link"
        onClose={() => setInputModal({ type: 'link', isOpen: false })}
        onInsert={handleLinkInsert}
        isMobile={isMobile}
      />
      <EditorInputModal
        isOpen={inputModal.isOpen && inputModal.type === 'image'}
        type="image"
        onClose={() => setInputModal({ type: 'image', isOpen: false })}
        onInsert={handleImageInsert}
        isMobile={isMobile}
      />
      <EditorInputModal
        isOpen={inputModal.isOpen && inputModal.type === 'video'}
        type="video"
        onClose={() => setInputModal({ type: 'video', isOpen: false })}
        onInsert={handleVideoInsert}
        isMobile={isMobile}
      />
      <EditorInputModal
        isOpen={inputModal.isOpen && inputModal.type === 'record'}
        type="record"
        onClose={() => setInputModal({ type: 'record', isOpen: false })}
        onInsert={handleRecordInsert}
        isMobile={isMobile}
      />
      <EditorInputModal
        isOpen={inputModal.isOpen && inputModal.type === 'catch'}
        type="catch"
        onClose={() => setInputModal({ type: 'catch', isOpen: false })}
        onInsert={handleCatchInsert}
        isMobile={isMobile}
      />
      <EditorInputModal
        isOpen={inputModal.isOpen && inputModal.type === 'gear'}
        type="gear"
        onClose={() => setInputModal({ type: 'gear', isOpen: false })}
        onInsert={handleGearInsert}
        isMobile={isMobile}
      />
    </div>
  );
}





