/**
 * MessageContainer - Componenta principală pentru afișarea postărilor
 * Refactorizat: folosește componente separate pentru claritate și mentenanță
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import { Save, X, Eye } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '@/lib/supabase';
import RecordEmbed from './embeds/RecordEmbed';
import CatchEmbed from './embeds/CatchEmbed';
import GearEmbed from './embeds/GearEmbed';
import PreviewContent from './PreviewContent';
import { parseBBCode } from '../../services/forum/bbcode';
import { useUpdatePost } from '../hooks/usePosts';
import { useToast } from '../contexts/ToastContext';
import ImageZoom from './ImageZoom';
import EditorToolbar from './EditorToolbar';
import MessageSidebar from './message/MessageSidebar';
import MessageActions from './message/MessageActions';
import EditInfo from './message/EditInfo';
import { DeletePostModal } from './message/MessageModals';
import NewBadge from './NewBadge';
import type { MessagePost } from './message/types';

interface MessageContainerProps {
  post: {
    id: string;
    content: string;
    author: string;
    authorId?: string;
    authorRank: string;
    authorAvatar?: string;
    createdAt: string;
    editedAt?: string;
    editedBy?: string;
    editedByUsername?: string;
    editReason?: string;
    likes: number;
    dislikes: number;
    respect?: number;
    authorLocation?: string;
    authorPostCount?: number;
    authorReputationPower?: number;
  };
  isOriginalPost?: boolean;
  postNumber?: number;
  topicId?: string;
  // Permalink info pentru quote-uri
  categorySlug?: string;
  subcategorySlug?: string;
  topicSlug?: string;
  postNumberMap?: Map<string, number>; // Map postId -> postNumber pentru permalink-uri
  onRespectChange?: (postId: string, delta: number, comment: string) => void;
  onReply?: (postId: string) => void;
  onQuote?: (postId: string) => void;
  onMultiQuoteToggle?: (postId: string) => void;
  onReputationChange?: () => void;
  onPostDeleted?: () => void;
  onPostEdited?: () => void;
  isMultiQuoteMode?: boolean;
  isQuoteSelected?: boolean;
  isMultiQuoteSelected?: boolean;
}

export default function MessageContainer({
  post,
  isOriginalPost = false,
  postNumber,
  topicId,
  categorySlug,
  subcategorySlug,
  topicSlug,
  postNumberMap,
  onRespectChange,
  onReply,
  onQuote,
  onMultiQuoteToggle,
  onReputationChange,
  onPostDeleted,
  onPostEdited,
  isMultiQuoteMode = false,
  isQuoteSelected = false,
  isMultiQuoteSelected = false
}: MessageContainerProps) {
  const { theme } = useTheme();
  const { forumUser } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editReason, setEditReason] = useState('');
  const [showEditPreview, setShowEditPreview] = useState(false);
  const [userGear, setUserGear] = useState<any[]>([]);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const [isPostUnread, setIsPostUnread] = useState(false);
  const hasCheckedUnreadRef = useRef(false); // Flag pentru a verifica o singură dată
  const contentRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { update, updating } = useUpdatePost();

  // Verifică dacă postarea este necitită - O SINGURĂ DATĂ la mount, ÎNAINTE de marcarea ca citit
  useEffect(() => {
    // Verifică doar o singură dată, la mount-ul componentei
    if (hasCheckedUnreadRef.current || !forumUser || !topicId || !post.id || !post.createdAt) {
      return;
    }

    hasCheckedUnreadRef.current = true;

    const checkIfUnread = async () => {
      try {
        // IMPORTANT: Verificăm statusul ÎNAINTE de marcarea ca citit
        // Obține last_read_at și last_read_post_id pentru topic-ul respectiv
        const { data: readData } = await supabase
          .from('forum_topic_reads')
          .select('last_read_at, last_read_post_id')
          .eq('user_id', forumUser.id)
          .eq('topic_id', topicId)
          .maybeSingle();

        if (!readData || !readData.last_read_at) {
          // Nu există înregistrare - toate postările sunt necitite
          setIsPostUnread(true);
          return;
        }

        // Dacă avem last_read_post_id, verificăm dacă postarea curentă este după ultima citită
        if (readData.last_read_post_id && post.id) {
          // Dacă postarea curentă este exact ultima citită, nu este necitită
          if (post.id === readData.last_read_post_id) {
            setIsPostUnread(false);
            return;
          }

          // Dacă avem post_number, folosim-l pentru comparație (mai precis)
          if (postNumber) {
            // Obținem post_number pentru ultima postare citită
            const { data: lastReadPostData } = await supabase
              .from('forum_posts')
              .select('post_number')
              .eq('id', readData.last_read_post_id)
              .maybeSingle();

            if (lastReadPostData?.post_number) {
              // Dacă post_number-ul curent este mai mare decât ultimul citit, este necitită
              setIsPostUnread(postNumber > lastReadPostData.post_number);
              return;
            }
          }

          // Fallback: compară data postării cu data ultimei postări citite
          const { data: lastReadPostData } = await supabase
            .from('forum_posts')
            .select('created_at')
            .eq('id', readData.last_read_post_id)
            .maybeSingle();

          if (lastReadPostData) {
            const postDate = new Date(post.createdAt);
            const lastReadDate = new Date(lastReadPostData.created_at);
            setIsPostUnread(postDate > lastReadDate);
            return;
          }
        }

        // Fallback: Compară data postării cu last_read_at
        const postDate = new Date(post.createdAt);
        const lastReadDate = new Date(readData.last_read_at);
        setIsPostUnread(postDate > lastReadDate);
      } catch (error) {
        console.error('Error checking if post is unread:', error);
        setIsPostUnread(false);
      }
    };

    // Rulează verificarea imediat, fără delay
    checkIfUnread();
  }, []); // Empty dependency array - rulează doar o singură dată la mount
  const { showToast } = useToast();

  // Parse BBCode content for display
  const parsedContent = useMemo(() => {
    const getPostPermalink = (postId: string): string => {
      // Dacă avem slug-urile necesare, construim permalink-ul corect (FĂRĂ categorySlug)
      if (subcategorySlug && topicSlug) {
        // Cazul 1: postId este deja un număr (postNumber din BBCode)
        if (/^\d+$/.test(postId)) {
          return `/forum/${subcategorySlug}/${topicSlug}#post${postId}`;
        }

        // Cazul 2: postId este un UUID, căutăm în map pentru a găsi postNumber
        const quotePostNumber = postNumberMap?.get(postId);
        if (quotePostNumber) {
          return `/forum/${subcategorySlug}/${topicSlug}#post${quotePostNumber}`;
        }

        // Cazul 3: Fallback la UUID (format post-{uuid})
        return `/forum/${subcategorySlug}/${topicSlug}#post-${postId}`;
      }
      // Fallback la ruta generică /post/{id}
      return `/forum/post/${postId}`;
    };

    const parsed = parseBBCode(post.content, {
      categorySlug,
      subcategorySlug,
      topicSlug,
      getPostPermalink,
      postNumberMap
    });
    return parsed.html;
  }, [post.content, postNumber, categorySlug, subcategorySlug, topicSlug, postNumberMap]);

  // Render embed components (records, catches, gear)
  // Use WeakMap to persist roots across re-renders
  const embedRootsRef = useRef(new WeakMap<HTMLElement, Root>());

  useEffect(() => {
    if (!contentRef.current) return;

    // Use requestAnimationFrame + setTimeout to ensure DOM is fully updated after dangerouslySetInnerHTML
    const renderEmbeds = () => {
      if (!contentRef.current) return;

      // Find all embed containers
      const recordEmbeds = contentRef.current.querySelectorAll('.bbcode-record-embed[data-record-id]');
      const catchEmbeds = contentRef.current.querySelectorAll('.bbcode-catch-embed[data-catch-id]');
      const gearEmbeds = contentRef.current.querySelectorAll('.bbcode-gear-embed[data-gear-id]');

      // Render record embeds
      recordEmbeds.forEach((container) => {
        const recordId = (container as HTMLElement).dataset.recordId;
        if (recordId) {
          let root = embedRootsRef.current.get(container as HTMLElement);
          if (!root) {
            // Clear existing content
            container.innerHTML = '';
            root = createRoot(container as HTMLElement);
            embedRootsRef.current.set(container as HTMLElement, root);
          }
          root.render(<RecordEmbed recordId={recordId} />);
        }
      });

      // Render catch embeds
      catchEmbeds.forEach((container) => {
        const catchId = (container as HTMLElement).dataset.catchId;
        if (catchId) {
          let root = embedRootsRef.current.get(container as HTMLElement);
          if (!root) {
            // Clear existing content
            container.innerHTML = '';
            root = createRoot(container as HTMLElement);
            embedRootsRef.current.set(container as HTMLElement, root);
          }
          root.render(<CatchEmbed catchId={catchId} />);
        }
      });

      // Render gear embeds
      gearEmbeds.forEach((container) => {
        const gearId = (container as HTMLElement).dataset.gearId;
        if (gearId) {
          let root = embedRootsRef.current.get(container as HTMLElement);
          if (!root) {
            // Clear existing content
            container.innerHTML = '';
            root = createRoot(container as HTMLElement);
            embedRootsRef.current.set(container as HTMLElement, root);
          }
          root.render(<GearEmbed gearId={gearId} />);
        }
      });
    };

    // Use requestAnimationFrame to wait for DOM update, then setTimeout for safety
    requestAnimationFrame(() => {
      setTimeout(renderEmbeds, 150);
    });
  }, [parsedContent]);

  // Add click handlers for images to enable zoom
  useEffect(() => {
    if (!contentRef.current) return;

    const images = contentRef.current.querySelectorAll('.bbcode-image');
    const handleImageClick = (e: Event) => {
      const img = e.target as HTMLImageElement;
      if (img && img.src) {
        setZoomedImage({ src: img.src, alt: img.alt || 'Imagine' });
      }
    };

    images.forEach(img => {
      const imgElement = img as HTMLImageElement;
      imgElement.style.cursor = 'zoom-in';
      imgElement.addEventListener('click', handleImageClick);
    });

    return () => {
      images.forEach(img => {
        img.removeEventListener('click', handleImageClick);
      });
    };
  }, [parsedContent]);

  // Intercept clicks on mention links AND quote links to use React Router navigation / smooth scroll
  useEffect(() => {
    if (!contentRef.current) return;

    // Handle Mentions
    const mentionLinks = contentRef.current.querySelectorAll('.bbcode-mention');
    const handleMentionClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const link = e.currentTarget as HTMLAnchorElement;
      const href = link.getAttribute('href');
      if (href && href.startsWith('/forum/user/')) {
        navigate(href);
      }
    };

    // Handle Quote Links (Smooth Scroll)
    const quoteLinks = contentRef.current.querySelectorAll('.quote-link');
    const handleQuoteClick = (e: Event) => {
      const link = e.currentTarget as HTMLAnchorElement;
      const href = link.getAttribute('href');

      // Dacă e link intern (hash), facem smooth scroll manual
      if (href && href.includes('#')) {
        e.preventDefault();
        e.stopPropagation();

        const hashIndex = href.indexOf('#');
        const hash = href.substring(hashIndex); // ex: #post4
        const targetId = hash.substring(1); // ex: post4

        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Adăugăm efectul de highlight
          element.classList.add('highlight-post');
          setTimeout(() => element.classList.remove('highlight-post'), 2000);

          // Actualizăm URL-ul fără refresh
          window.history.pushState(null, '', hash);
        } else {
          // Dacă elementul nu e în pagină (ex: alt topic), navigăm normal
          navigate(href);
        }
      }
    };

    mentionLinks.forEach(link => {
      link.addEventListener('click', handleMentionClick);
    });

    quoteLinks.forEach(link => {
      link.addEventListener('click', handleQuoteClick);
    });

    return () => {
      mentionLinks.forEach(link => {
        link.removeEventListener('click', handleMentionClick);
      });
      quoteLinks.forEach(link => {
        link.removeEventListener('click', handleQuoteClick);
      });
    };
  }, [parsedContent, navigate]);

  const [isLoadingGear, setIsLoadingGear] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleGearClick = async () => {
    if (!post.authorId) return;

    setIsLoadingGear(true);
    try {
      const { data, error } = await supabase
        .from('user_gear')
        .select('*')
        .eq('user_id', post.authorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading gear:', error);
        setUserGear([]);
      } else {
        setUserGear(data || []);
      }
    } catch (error) {
      console.error('Error loading gear:', error);
      setUserGear([]);
    } finally {
      setIsLoadingGear(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(post.content);
    setEditReason('');
    // Focus textarea după ce se montează
    setTimeout(() => {
      editTextareaRef.current?.focus();
    }, 100);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(post.content);
    setEditReason('');
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      showToast('Conținutul nu poate fi gol!', 'error');
      return;
    }

    if (forumUser?.isAdmin && !editReason.trim()) {
      showToast('Motivul este obligatoriu pentru editare!', 'error');
      return;
    }

    const result = await update(post.id, editContent.trim(), editReason.trim() || undefined);
    if (result.success) {
      showToast('Postarea a fost editată cu succes', 'success');
      setIsEditing(false);
      onPostEdited?.();
    } else {
      showToast(result.error?.message || 'Eroare la editarea postării', 'error');
    }
  };

  const handlePostDeleted = () => {
    setShowDeleteModal(false);
    onPostDeleted?.();
    // Reîncarcă postările
    if (onPostEdited) {
      setTimeout(() => onPostEdited(), 100);
    }
  };

  const handlePostEdited = () => {
    setIsEditing(false);
    onPostEdited?.();
    // Reîncarcă postările
    if (onPostEdited) {
      setTimeout(() => onPostEdited(), 100);
    }
  };

  // ID-ul pentru anchor trebuie să folosească post_number real (ex: post1, post2)
  const postAnchorId = postNumber ? `post${postNumber}` : `post-${post.id}`;

  // Map post props to MessagePost type
  const messagePost: MessagePost = {
    id: post.id,
    content: post.content,
    author: post.author,
    authorId: post.authorId,
    authorRank: post.authorRank,
    authorAvatar: post.authorAvatar,
    createdAt: post.createdAt,
    editedAt: post.editedAt,
    editedBy: post.editedBy,
    editedByUsername: post.editedByUsername,
    editReason: post.editReason,
    likes: post.likes,
    dislikes: post.dislikes,
    respect: post.respect,
    authorLocation: post.authorLocation,
    authorPostCount: post.authorPostCount,
    authorReputationPower: post.authorReputationPower
  };

  return (
    <>
      <div
        id={postAnchorId}
        style={{
          backgroundColor: theme.surface,
          border: isMobile ? `1px solid ${theme.border}` : `2px solid ${theme.border}`,
          borderRadius: isMobile ? '0.5rem' : '0.75rem',
          marginBottom: isMobile ? '0.5rem' : '0.75rem',
          overflow: 'visible', // Changed from 'hidden' to 'visible' to allow ribbon to show
          boxShadow: isMobile ? '0 1px 3px rgba(0, 0, 0, 0.05)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
      >
        {/* Permalink simplu în colțul dreapta sus - #1, #2, etc. - ascuns în editare */}
        {postNumber && topicId && !isEditing && (
          <div
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '0.25rem',
              zIndex: 15,
              opacity: isEditing ? 0 : 1,
              pointerEvents: isEditing ? 'none' : 'auto'
            }}
          >
            <a
              href={`#${postAnchorId}`}
              onClick={async (e) => {
                e.preventDefault();
                // Navigare la post
                const element = document.getElementById(postAnchorId);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  window.history.replaceState(null, '', `#${postAnchorId}`);
                }
                // Copy to clipboard - cu fallback pentru mobile
                const fullUrl = `${window.location.origin}${window.location.pathname}#${postAnchorId}`;
                try {
                  // Încearcă navigator.clipboard (nu funcționează pe toate mobile browsers)
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(fullUrl);
                    showToast('Link copiat în clipboard!', 'success');
                  } else {
                    // Fallback pentru mobile - creează input temporar
                    const textArea = document.createElement('textarea');
                    textArea.value = fullUrl;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try {
                      document.execCommand('copy');
                      showToast('Link copiat în clipboard!', 'success');
                    } catch (err) {
                      showToast('Eroare la copierea link-ului', 'error');
                    }
                    document.body.removeChild(textArea);
                  }
                } catch (err) {
                  console.error('Error copying to clipboard:', err);
                  // Fallback pentru mobile
                  try {
                    const textArea = document.createElement('textarea');
                    textArea.value = fullUrl;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    showToast('Link copiat în clipboard!', 'success');
                  } catch (fallbackErr) {
                    showToast('Eroare la copierea link-ului', 'error');
                  }
                }
              }}
              style={{
                fontSize: '0.75rem',
                color: theme.textSecondary,
                textDecoration: 'none',
                padding: '0.25rem 0.5rem',
                backgroundColor: theme.background,
                borderRadius: '0.25rem',
                border: `1px solid ${theme.border}`,
                transition: 'all 0.2s',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.primary;
                e.currentTarget.style.borderColor = theme.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.textSecondary;
                e.currentTarget.style.borderColor = theme.border;
              }}
              title={`Post #${postNumber} - Click pentru a naviga și copia link-ul`}
            >
              #{postNumber}
            </a>
            {/* Badge "Nou" ca ribbon sub permalink, care vine din spatele cardului */}
            {isPostUnread && forumUser && (
              <NewBadge isMobile={isMobile} />
            )}
          </div>
        )}

        {/* Layout: Sidebar + Content - Optimizat pentru mobil */}
        <div style={{
          display: 'flex',
          minHeight: isMobile ? '150px' : '200px',
          flexDirection: 'row',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          {/* Sidebar - Mai mic pe mobil, dar păstrat */}
          <MessageSidebar
            post={messagePost}
            isOriginalPost={isOriginalPost}
            isMobile={isMobile}
            onGearClick={handleGearClick}
            userGear={userGear}
            isLoadingGear={isLoadingGear}
          />

          {/* Content area - Flex pentru a nu ieși din lățime */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0, // Important pentru overflow
            maxWidth: '100%'
          }}>
            {/* Message content - Word wrap și overflow control */}
            <div
              style={{
                flex: 1,
                padding: isMobile ? '0.75rem' : '1.5rem',
                paddingTop: isMobile ? '0.75rem' : '1.5rem',
                paddingRight: postNumber && topicId && !isEditing ? (isMobile ? '3.5rem' : '4rem') : (isMobile ? '0.75rem' : '1.5rem'), // Safe space pentru permalink-uri (#4, etc.)
                paddingBottom: isMobile ? '2rem' : '2.5rem',
                paddingLeft: isMobile ? '0.75rem' : '1.5rem',
                fontSize: isMobile ? '0.8125rem' : '0.875rem',
                color: theme.text,
                lineHeight: '1.6',
                position: 'relative',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                maxWidth: '100%',
                overflowX: 'hidden',
                transition: 'all 0.3s ease-in-out'
              }}
            >
              {isEditing ? (
                /* Editor inline pentru editare */
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    animation: 'fadeIn 0.3s ease-in-out'
                  }}
                >
                  {/* Editor Toolbar */}
                  <EditorToolbar
                    textareaRef={editTextareaRef}
                    onContentChange={setEditContent}
                    currentContent={editContent}
                    isMobile={isMobile}
                  />

                  {/* Textarea pentru editare */}
                  <textarea
                    ref={editTextareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: isMobile ? '200px' : '300px',
                      padding: '0.75rem',
                      fontSize: isMobile ? '0.8125rem' : '0.875rem',
                      fontFamily: 'inherit',
                      color: theme.text,
                      backgroundColor: theme.background,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '0.5rem',
                      resize: 'vertical',
                      lineHeight: '1.6',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.primary;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.border;
                    }}
                  />

                  {/* Motiv editare (doar pentru admin) */}
                  {forumUser?.isAdmin && (
                    <div>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontSize: '0.8125rem',
                          color: theme.textSecondary,
                          fontWeight: '500'
                        }}
                      >
                        Motiv editare (obligatoriu):
                      </label>
                      <input
                        type="text"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Ex: Corectare greșeală, clarificare..."
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.8125rem',
                          fontFamily: 'inherit',
                          color: theme.text,
                          backgroundColor: theme.background,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '0.375rem',
                          outline: 'none',
                          transition: 'border-color 0.2s'
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

                  {/* Preview pentru editare */}
                  {showEditPreview && (
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: theme.background,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.5rem',
                        marginTop: '0.5rem'
                      }}
                    >
                      <PreviewContent
                        content={editContent}
                        style={{
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          maxWidth: '100%'
                        }}
                      />
                    </div>
                  )}

                  {/* Butoane Salvează/Anulează */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowEditPreview(!showEditPreview)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: showEditPreview ? theme.primary : 'transparent',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.375rem',
                        color: showEditPreview ? 'white' : theme.textSecondary,
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={updating}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'transparent',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.375rem',
                        color: theme.textSecondary,
                        cursor: updating ? 'not-allowed' : 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!updating) {
                          e.currentTarget.style.borderColor = theme.textSecondary;
                          e.currentTarget.style.color = theme.text;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = theme.border;
                        e.currentTarget.style.color = theme.textSecondary;
                      }}
                    >
                      <X size={16} />
                      Anulează
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={updating || !editContent.trim() || (forumUser?.isAdmin && !editReason.trim())}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: updating || !editContent.trim() || (forumUser?.isAdmin && !editReason.trim()) ? '#9ca3af' : theme.primary,
                        border: 'none',
                        borderRadius: '0.375rem',
                        color: 'white',
                        cursor: updating || !editContent.trim() || (forumUser?.isAdmin && !editReason.trim()) ? 'not-allowed' : 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!updating && editContent.trim() && (!forumUser?.isAdmin || editReason.trim())) {
                          e.currentTarget.style.opacity = '0.9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      <Save size={16} />
                      {updating ? 'Se salvează...' : 'Salvează'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Conținut normal al postului */
                <div
                  style={{
                    animation: 'fadeIn 0.3s ease-in-out'
                  }}
                >
                  <div
                    ref={contentRef}
                    style={{
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%'
                    }}
                    dangerouslySetInnerHTML={{ __html: parsedContent }}
                  />

                  {/* Image Zoom Modal */}
                  {zoomedImage && (
                    <ImageZoom
                      src={zoomedImage.src}
                      alt={zoomedImage.alt}
                      className="bbcode-image"
                      onClose={() => setZoomedImage(null)}
                    />
                  )}

                  {/* Edit Info - afișează informații despre editare */}
                  {post.editedAt && (
                    <EditInfo
                      editedAt={post.editedAt}
                      editedByUsername={post.editedByUsername}
                      editReason={post.editReason}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Actions - ascunse când se editează */}
            {!isEditing && (
              <MessageActions
                postId={post.id}
                authorId={post.authorId}
                onRespectChange={onRespectChange}
                onReply={onReply}
                onQuote={onQuote}
                onMultiQuoteToggle={onMultiQuoteToggle}
                onDelete={forumUser?.isAdmin ? handleDelete : undefined}
                onEdit={forumUser?.isAdmin ? handleEdit : undefined}
                onReputationChange={onReputationChange}
                isAdmin={forumUser?.isAdmin || false}
                isMultiQuoteMode={isMultiQuoteMode}
                isQuoteSelected={isQuoteSelected}
                isMultiQuoteSelected={isMultiQuoteSelected}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDeleteModal && (
        <DeletePostModal
          postId={post.id}
          isAdmin={forumUser?.isAdmin || false}
          onDeleted={handlePostDeleted}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

    </>
  );
}