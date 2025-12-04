/**
 * EditorToolbar - Toolbar pentru formatare text în Advanced Editor
 * Inserează BBCode tags în textarea
 */

import { useState } from 'react';
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
  Smile
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import EditorInputModal from './EditorInputModal';

interface EditorToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onContentChange?: (newContent: string) => void;
  isMobile?: boolean;
}

export default function EditorToolbar({ 
  textareaRef, 
  onContentChange,
  isMobile = false 
}: EditorToolbarProps) {
  const { theme } = useTheme();
  const [inputModal, setInputModal] = useState<{ type: 'link' | 'image' | 'video'; isOpen: boolean }>({
    type: 'link',
    isOpen: false
  });

  // Helper pentru inserarea textului în textarea la poziția cursorului
  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
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
    
    // Notifică schimbarea (va actualiza state-ul în AdvancedEditorModal)
    onContentChange?.(newText);
    
    // Așteaptă ca React să actualizeze DOM-ul, apoi repoziționează cursorul
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
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
    setInputModal({ type: 'link', isOpen: true });
  };

  const handleLinkInsert = (url: string, text?: string) => {
    insertText(`[url=${url}]`, '[/url]', text || url);
  };

  // Image
  const formatImage = () => {
    setInputModal({ type: 'image', isOpen: true });
  };

  const handleImageInsert = (url: string) => {
    insertText(`[img]`, '[/img]', url);
  };

  // Video (YouTube/Vimeo)
  const formatVideo = () => {
    setInputModal({ type: 'video', isOpen: true });
  };

  const handleVideoInsert = (url: string) => {
    insertText(`[video]`, '[/video]', url);
  };

  // Emoji (placeholder)
  const formatEmoji = () => {
    // TODO: Deschide emoji picker
    alert('Emoji picker - în dezvoltare');
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

      {/* Emoji */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          onClick={formatEmoji}
          title="Emoji picker"
          style={buttonStyle}
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          <Smile size={isMobile ? 14 : 16} />
        </button>
      </div>

      {/* Modaluri pentru Link/Image/Video */}
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
    </div>
  );
}

