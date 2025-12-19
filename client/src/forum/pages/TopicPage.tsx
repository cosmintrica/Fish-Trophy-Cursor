import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, User, Pin, Star } from 'lucide-react';
import { usePosts, useCreatePost } from '../hooks/usePosts';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import MessageContainer from '../components/MessageContainer';
import ActiveViewers from '../components/ActiveViewers';
import QuickReplyBox from '../components/QuickReplyBox';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { ForumTopic, ForumPost } from '../types/forum';
import { useMarkTopicAsRead } from '../hooks/useTopicReadStatus';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { useForumContext } from '../hooks/useForumContext';
import SEOHead from '../../components/SEOHead';
import { useStructuredData } from '../../hooks/useStructuredData';
import ShareButton from '../../components/ShareButton';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleTopicPin, toggleTopicImportant } from '../../services/forum/topics';

export default function TopicPage() {
  // Acceptă:
  // - /:potentialSlug/:topicSlug (clean - potentialSlug poate fi subcategorie SAU subforum)
  // - /topic/:id (legacy)
  // IMPORTANT: Nu mai includem categorySlug în URL-uri - slug-urile subcategoriilor/subforum-urilor sunt unice global
  // IMPORTANT: potentialSlug poate fi subcategorie SAU subforum - detectăm automat
  const { topicId, topicSlug, potentialSlug } = useParams<{
    topicId?: string;
    topicSlug?: string;
    potentialSlug?: string; // Unificat pentru subcategorie/subforum
  }>();

  // Determinăm slug-ul real (subcategorie sau subforum)
  const actualSubcategoryOrSubforumSlug = potentialSlug;
  const navigate = useNavigate();
  const { forumUser, signOut } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // Check if user is admin or moderator
  const isAdmin = forumUser?.isAdmin || false;

  const handleLogout = async () => {
    await signOut();
  };

  // Paginare - salvat în localStorage pentru preferințe utilizator
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem('forum_posts_page');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('forum_posts_page_size');
    return saved ? parseInt(saved, 10) : 20;
  });

  // Multi-Quote System
  const [isMultiQuoteMode, setIsMultiQuoteMode] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const insertQuotesRef = useRef<((quotes: Array<{ postId: string; author: string; content: string }>) => void) | null>(null);
  const quickReplyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Folosește topicSlug dacă există (clean URL), altfel topicId (legacy)
  const topicIdentifier = topicSlug || topicId || '';

  // -- SEQUENTIAL PROBING (Option A) --
  // 1. Try Subcategory as parent
  const ctxSubcategoryParent = useForumContext({
    slug: topicSlug || topicId,
    parentSlug: potentialSlug,
    parentType: 'subcategory'
  });

  const subcategoryParentFailed = !ctxSubcategoryParent.isLoading && ctxSubcategoryParent.data && !ctxSubcategoryParent.data.entity;

  // 2. Try Subforum as parent
  const ctxSubforumParent = useForumContext({
    slug: topicSlug || topicId,
    parentSlug: potentialSlug,
    parentType: 'subforum',
    options: { enabled: !!subcategoryParentFailed }
  });

  // MERGE RESULTS
  const effectiveContext = ctxSubcategoryParent.data?.entity ? ctxSubcategoryParent.data : ctxSubforumParent.data;
  const topic = effectiveContext?.entity;
  const topicError = ctxSubcategoryParent.error || ctxSubforumParent.error;
  const topicLoading = ctxSubcategoryParent.isLoading || (subcategoryParentFailed && ctxSubforumParent.isLoading);
  const breadcrumbs = effectiveContext?.breadcrumbs || [];

  // Alias names for compatibility with original JSX
  const subcategoryIdFromCache = (effectiveContext?.hierarchy?.parent?.type === 'subcategory') ? effectiveContext.hierarchy.parent.id : null;
  const subforumIdFromCache = (effectiveContext?.hierarchy?.parent?.type === 'subforum') ? effectiveContext.hierarchy.parent.id : null;

  // IMPORTANT: Folosim DOAR topic.id (UUID) pentru usePosts
  // NU folosim topicIdentifier ca fallback - asta cauza double query și flickering
  // Posturile se încarcă DOAR când avem UUID-ul topicului
  const { posts, loading: postsLoading, error: postsError, refetch: refetchPosts, total, hasMore } = usePosts(topic?.id || null, page, pageSize);

  // -- CANONICAL REDIRECT --
  // If the user visits a topic via the wrong parent/category URL, redirect them to the correct one.
  // This solves the issue where /fly-tying/topic-test shows Fly Fishing breadcrumbs if the topic is actually in Fly Fishing.
  useEffect(() => {
    // Only redirect if we have fully loaded the data and identified the entity as a topic
    if (
      !topicLoading &&
      effectiveContext?.type === 'topic' &&
      effectiveContext.hierarchy?.parent?.slug &&
      topicSlug &&
      potentialSlug
    ) {
      const actualParentSlug = effectiveContext.hierarchy.parent.slug;

      // If the URL parent slug doesn't match the actual parent slug from the DB
      if (actualParentSlug !== potentialSlug) {
        console.log(`[Canonical Redirect] Fixed parent slug mismatch. URL: ${potentialSlug} -> Actual: ${actualParentSlug}`);
        navigate(`/forum/${actualParentSlug}/${topicSlug}`, { replace: true });
      }
    }
  }, [effectiveContext, potentialSlug, topicSlug, navigate, topicLoading]);
  const { create: createPost } = useCreatePost();

  // Hook pentru marcarea topicului ca citit
  const { markAsRead } = useMarkTopicAsRead();

  // Mutations pentru toggle sticky și important
  const togglePinMutation = useMutation({
    mutationFn: ({ topicId, isPinned }: { topicId: string; isPinned: boolean }) =>
      toggleTopicPin(topicId, isPinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicIdentifier] });
      queryClient.invalidateQueries({ queryKey: ['forum-context', topicSlug] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      showToast('Status sticky actualizat!', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Eroare la actualizarea status-ului sticky', 'error');
    },
  });

  const toggleImportantMutation = useMutation({
    mutationFn: ({ topicId, isImportant }: { topicId: string; isImportant: boolean }) =>
      toggleTopicImportant(topicId, isImportant),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicIdentifier] });
      queryClient.invalidateQueries({ queryKey: ['forum-context', topicSlug] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      showToast('Status important actualizat!', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Eroare la actualizarea status-ului important', 'error');
    },
  });

  // IMPORTANT: TOȚI hooks-ii trebuie declarați ÎNAINTE de orice early return
  // Topic not found state
  const [showNotFound, setShowNotFound] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // SIMPLIFICAT: Breadcrumbs - folosim DIRECT datele din hook, fără state-uri intermediare
  const categoryCrumb = breadcrumbs.find(b => b.type === 'category');
  const categoryName = categoryCrumb?.name || '';
  const categoryId = null; // Nu mai avem ID-ul direct aici dar nici nu e critic pentru breadcrumbs
  const categorySlug = categoryCrumb?.slug || '';

  const containerCrumb = breadcrumbs.find(b => b.type === 'subcategory' || b.type === 'subforum');
  const subcategoryName = containerCrumb?.name || '';
  const subcategorySlug = containerCrumb?.slug || potentialSlug || '';

  // Detect mobil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll automat la hash când se încarcă pagina (ex: #post1, #post2, #post5)
  // SIMPLIFICAT: Un singur useEffect simplu
  // Scroll automat la hash îmbunătățit (handles retry if element not ready)
  useEffect(() => {
    const handleScrollToHash = () => {
      const hash = window.location.hash;
      if (!hash || !hash.startsWith('#post')) return;

      const postId = hash.substring(1); // 'post123' -> 'post123' (matches id attribute)

      const scrollToElement = (attempts = 0) => {
        const element = document.getElementById(postId);
        if (element) {
          // Scroll with offset for header
          const headerOffset = 100;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          // Optional: Highlight effect
          element.classList.add('highlight-post');
          setTimeout(() => element.classList.remove('highlight-post'), 2000);
        } else if (attempts < 5) {
          // Retry if not found yet (DOM rendering delay)
          setTimeout(() => scrollToElement(attempts + 1), 500);
        }
      };

      // Initial delay to ensure render cycle is complete
      setTimeout(() => scrollToElement(), 100);
    };

    handleScrollToHash();

    // Listen for hash changes manually if needed (though React Router usually handles nav)
    window.addEventListener('hashchange', handleScrollToHash);
    return () => window.removeEventListener('hashchange', handleScrollToHash);
  }, [posts, window.location.hash]);

  // -- DERIVED DATA & HOOKS (Must be before early returns) --
  const displayPosts = posts || [];

  // Creează un map de postId -> postNumber pentru permalink-uri în quote-uri
  const postNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    displayPosts.forEach((post) => {
      const postNum = (post as any).post_number;
      if (postNum) {
        map.set(post.id, postNum);
      }
    });
    return map;
  }, [displayPosts]);

  // SEO Data - OG tags dinamice pentru topic
  const { websiteData, organizationData, createArticleData, createBreadcrumbData } = useStructuredData();

  // Topic-related derived vars
  const topicTitle = (topic as any)?.title || (topic as any)?.name || 'Topic Forum';

  const topicDescription = displayPosts.length > 0
    ? `${displayPosts[0].content?.substring(0, 150).replace(/\[.*?\]/g, '') || 'Discuție despre pescuit'}...`
    : `Discuție despre pescuit în ${subcategoryName || 'forum'}. ${topic?.stats?.reply_count || 0} răspunsuri.`;

  const topicAuthor = (displayPosts[0] as any)?.author_username || 'Pescar';

  const topicUrl = topic ? `https://fishtrophy.ro/forum/${actualSubcategoryOrSubforumSlug}/${topic.slug}` : '';

  const topicImage = 'https://fishtrophy.ro/social-media-banner-v2.jpg';

  const topicTags = [
    subcategoryName || 'pescuit',
    categoryName || 'forum',
    'discuții',
    'sfaturi'
  ].filter(Boolean);

  const parentCategory = effectiveContext?.hierarchy?.parent;

  // Structured data pentru Article
  const articleStructuredData = topic && topic.created_at ? createArticleData({
    headline: topicTitle,
    description: topicDescription,
    image: topicImage,
    datePublished: topic.created_at,
    dateModified: (topic as any)?.updated_at || topic.stats?.last_post_at || topic.created_at,
    author: topicAuthor,
    url: topicUrl
  }) : null;

  // Error handling
  useEffect(() => {
    if (topicError) console.error('Error loading topic:', topicError);
    if (postsError) console.error('Error loading posts:', postsError);
  }, [topicError, postsError]);

  // Topic not found effect - doar dacă există eroare EXPLICITĂ (nu mai folosim timeout)
  // IMPORTANT: Nu setăm showNotFound la true dacă datele se încarcă încă
  useEffect(() => {
    // Așteaptă puțin pentru a evita false positives la hard refresh
    const timeoutId = setTimeout(() => {
      if (topicError && topicError.message?.includes('not found') && !topic && !topicLoading) {
        setShowNotFound(true);
      } else {
        setShowNotFound(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [topicError, topic, topicLoading]);

  // Marchează topicul ca citit când user-ul intră pe pagină
  // IMPORTANT: Delay mic pentru a permite verificarea statusului unread în MessageContainer
  useEffect(() => {
    // topic?.id este deja UUID valid
    if (topic?.id && forumUser && posts.length > 0) {
      // Delay de 500ms pentru a permite verificarea statusului unread în MessageContainer
      const timeoutId = setTimeout(() => {
        // Marchează topicul ca citit cu ultimul post
        const lastPost = posts[posts.length - 1];
        markAsRead({
          topicId: topic.id,
          postId: lastPost?.id
        }).catch(error => {
          // Silent fail - nu afișăm eroare dacă marcarea nu reușește
          console.error('Error marking topic as read:', error);
        });
      }, 500); // Delay de 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [topic?.id, forumUser, posts.length, markAsRead]);


  // Format smart: dacă e azi → doar ora, dacă > 24h → data + ora (FĂRĂ secunde)
  const formatSmartDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();

    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (isToday) {
      // Dacă e azi → doar ora
      return `${hours}:${minutes}`;
    } else {
      // Dacă > 24h → data + ora
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }
  };

  // Nu mai afișăm loading - afișăm conținutul instant

  // Error state - DUPĂ toate hooks-urile
  if (topicError || postsError) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={handleLogout}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 0.75rem', width: '100%', overflowX: 'hidden' }}>
          <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
            <div style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Eroare la încărcarea topicului</div>
            <div style={{ color: '#6b7280', marginBottom: '1rem' }}>
              {topicError?.message || postsError?.message || 'Eroare necunoscută'}
            </div>
            <Link to="/forum" style={{ color: '#2563eb', textDecoration: 'none', marginTop: '1rem', display: 'inline-block' }}>
              ← Înapoi la forum
            </Link>
          </div>
        </div>
      </ForumLayout>
    );
  }

  // Topic not found
  if (showNotFound) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={handleLogout}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 0.75rem', width: '100%', overflowX: 'hidden' }}>
          <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
            <div style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Topic nu a fost găsit!</div>
            <div style={{ color: '#6b7280', marginBottom: '1rem' }}>Topicul pe care îl cauți nu există sau a fost șters.</div>
            <Link to="/forum" style={{ color: '#2563eb', textDecoration: 'none', marginTop: '1rem', display: 'inline-block' }}>
              ← Înapoi la forum
            </Link>
          </div>
        </div>
      </ForumLayout>
    );
  }

  return (
    <>
      {topic && (
        <SEOHead
          title={`${topicTitle} - Forum Pescuit - Fish Trophy`}
          description={topicDescription}
          keywords={`${topicTitle}, ${subcategoryName}, ${categoryName}, forum pescuit, discuții pescuit, ${topicTags.join(', ')}`}
          image={topicImage}
          url={topicUrl}
          type="article"
          author={topicAuthor}
          publishedTime={topic.created_at}
          modifiedTime={(topic as any)?.updated_at || topic.stats?.last_post_at || topic.created_at}
          section={subcategoryName || 'Forum'}
          tags={topicTags}
          structuredData={articleStructuredData ? [websiteData, organizationData, articleStructuredData] as unknown as Record<string, unknown>[] : [websiteData, organizationData] as unknown as Record<string, unknown>[]}
        />
      )}
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={handleLogout}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '0.5rem' : '1.5rem 1rem', // UNIFIED PADDING with CategoryPage
          width: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}>

          {/* Unified Loading State for TopicPage */}
          {(topicLoading || postsLoading) ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '2rem',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.surface,
              borderRadius: '1rem',
              border: `1px solid ${theme.border}`,
              minHeight: '400px'
            }}>
              <div className="animate-spin" style={{
                width: '3rem',
                height: '3rem',
                border: `4px solid ${theme.border}`,
                borderTop: `4px solid ${theme.primary}`,
                borderRadius: '50%'
              }} />
              <div style={{ color: theme.textSecondary }}>Se încarcă discuția...</div>
            </div>
          ) : (
            <>
              {/* Breadcrumbs: FishTrophy › Categorie › SubCategorie › Topic - Toate linkuri funcționale */}
              <nav style={{
                marginBottom: isMobile ? '0.5rem' : '1.5rem',
                fontSize: isMobile ? '0.625rem' : '0.875rem',
                color: theme.textSecondary,
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                paddingBottom: '0.25rem'
              }}>
                <Link to="/forum" style={{ color: theme.primary, textDecoration: 'none', fontWeight: '500' }}>FishTrophy</Link>
                {(categoryName || subcategoryName || topicTitle) && (
                  <>
                    {/* Categoria */}
                    {categoryName && (
                      <>
                        <span style={{ margin: '0 0.375rem', color: theme.textSecondary }}>›</span>
                        <Link
                          to={categorySlug ? `/forum/${categorySlug}` : '/forum'}
                          style={{ color: theme.primary, textDecoration: 'none', fontWeight: '500' }}
                        >
                          {categoryName}
                        </Link>
                      </>
                    )}
                    {/* Subcategoria */}
                    {subcategorySlug && (
                      <>
                        <span style={{ margin: '0 0.375rem', color: theme.textSecondary }}>›</span>
                        <Link
                          to={`/forum/${subcategorySlug}`}
                          style={{ color: theme.primary, textDecoration: 'none', fontWeight: '500' }}
                        >
                          {subcategoryName || subcategorySlug}
                        </Link>
                      </>
                    )}
                    {/* Topic-ul */}
                    {topicTitle && (
                      <>
                        <span style={{ margin: '0 0.375rem', color: theme.textSecondary }}>›</span>
                        <span style={{ color: theme.textSecondary, fontWeight: '500' }}>{topicTitle}</span>
                      </>
                    )}
                  </>
                )}
              </nav>

              {/* Topic Header - COMPACT */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  borderRadius: '0.5rem',
                  padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                  marginBottom: isMobile ? '0.5rem' : '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Link
                  to={subcategorySlug ? `/forum/${subcategorySlug}` : '/forum'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '1.75rem',
                    height: '1.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '0.25rem',
                    color: 'white',
                    textDecoration: 'none',
                    flexShrink: 0
                  }}
                >
                  <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: '600',
                    color: 'white',
                    margin: 0,
                    lineHeight: '1.3',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const
                  }}>
                    {topicTitle || '\u00A0'}
                  </h1>
                  {topic && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.7rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginTop: '0.125rem'
                    }}>
                      <span>{displayPosts[0]?.author_username || '...'}</span>
                      <span>•</span>
                      <span>{topic.stats.view_count} viz</span>
                      <span>•</span>
                      <span>{topic.stats.reply_count} răsp</span>
                    </div>
                  )}
                </div>
                {topic && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {/* Admin/Moderator Buttons */}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            if (topic.id) {
                              togglePinMutation.mutate({
                                topicId: topic.id,
                                isPinned: !topic.is_pinned
                              });
                            }
                          }}
                          title={topic.is_pinned ? 'Elimină sticky' : 'Marchează ca sticky'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '1.75rem',
                            height: '1.75rem',
                            backgroundColor: topic.is_pinned ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                            border: topic.is_pinned ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid transparent',
                            borderRadius: '0.25rem',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = topic.is_pinned ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)';
                          }}
                        >
                          <Pin size={14} style={{ fill: topic.is_pinned ? 'white' : 'none' }} />
                        </button>
                        <button
                          onClick={() => {
                            if (topic.id) {
                              toggleImportantMutation.mutate({
                                topicId: topic.id,
                                isImportant: !(topic.is_important || false)
                              });
                            }
                          }}
                          title={topic.is_important ? 'Elimină important' : 'Marchează ca important'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '1.75rem',
                            height: '1.75rem',
                            backgroundColor: topic.is_important ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                            border: topic.is_important ? '1px solid rgba(255, 215, 0, 0.5)' : '1px solid transparent',
                            borderRadius: '0.25rem',
                            color: topic.is_important ? '#ffd700' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = topic.is_important ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.15)';
                          }}
                        >
                          <Star size={14} style={{ fill: topic.is_important ? '#ffd700' : 'none' }} />
                        </button>
                      </>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '1.75rem',
                        height: '1.75rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid transparent',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                      }}
                    >
                      <ShareButton
                        url={topicUrl}
                        title={topicTitle}
                        description={topicDescription}
                        size="sm"
                        variant="ghost"
                        className="w-full h-full flex items-center justify-center"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Posts List - Fără loading, afișăm direct datele */}
              {displayPosts.map((post, index) => (
                <MessageContainer
                  key={post.id}
                  post={{
                    id: post.id,
                    content: post.content,
                    author: post.author_username || 'Unknown',
                    authorId: (post as any).user_id, // ID-ul autorului pentru reputație
                    authorRank: (post as any).author_rank || 'pescar', // Rank real din forum_users
                    authorAvatar: (post as any).author_avatar || null, // Photo URL din profiles
                    createdAt: post.created_at,
                    editedAt: post.edited_at || undefined,
                    editedBy: post.edited_by || undefined,
                    editedByUsername: (post as any).edited_by_username || undefined,
                    editReason: post.edit_reason || undefined,
                    likes: post.like_count || 0,
                    dislikes: 0,
                    respect: (post as any).author_respect || 0, // Respect real din forum_users.reputation_points
                    authorLocation: (post as any).author_location || undefined,
                    authorPostCount: (post as any).author_post_count || 0,
                    authorReputationPower: (post as any).author_reputation_power || 0
                  }}
                  isOriginalPost={index === 0 && page === 1}
                  postNumber={(post as any).post_number || null} // Post number REAL din database
                  topicId={topic?.id || topicIdentifier}
                  categorySlug={undefined} // Nu mai folosim categorySlug
                  subcategorySlug={actualSubcategoryOrSubforumSlug || subcategorySlug}
                  topicSlug={topicSlug || (topic as any)?.slug}
                  postNumberMap={postNumberMap} // Map pentru permalink-uri în quote-uri
                  onRespectChange={(postId, delta, comment) => {
                    console.log(`Respect ${delta > 0 ? 'oferit' : 'retras'} pentru ${post.author_username}: "${comment}"`);
                    alert(`Ai ${delta > 0 ? 'oferit' : 'retras'} respect pentru ${post.author_username}!`);
                  }}
                  onReply={() => {
                    // Focus pe QuickReplyBox
                    if (quickReplyTextareaRef.current) {
                      quickReplyTextareaRef.current.focus();
                      quickReplyTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  onQuote={(postId) => {
                    if (isMultiQuoteMode) {
                      // Toggle selecție în multi-quote mode
                      setSelectedQuotes(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(postId)) {
                          newSet.delete(postId);
                        } else {
                          newSet.add(postId);
                        }
                        return newSet;
                      });
                    } else {
                      // Quote normal - inserare directă în editor
                      const selectedPost = posts.find(p => p.id === postId);
                      if (selectedPost && insertQuotesRef.current) {
                        // Inserează quote-ul direct în editor
                        // Folosim postNumber în loc de UUID pentru siguranță și claritate
                        const postNum = (selectedPost as any).post_number;
                        insertQuotesRef.current([{
                          postId: postNum ? postNum.toString() : selectedPost.id, // Folosim postNumber dacă există, altfel UUID
                          author: selectedPost.author_username || 'Unknown',
                          content: selectedPost.content
                        }]);
                        // Focus pe QuickReplyBox
                        if (quickReplyTextareaRef.current) {
                          quickReplyTextareaRef.current.focus();
                          quickReplyTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }
                    }
                  }}
                  isMultiQuoteMode={isMultiQuoteMode}
                  isQuoteSelected={selectedQuotes.has(post.id)}
                  onMultiQuoteToggle={(postId) => {
                    // Toggle selecție multi-quote
                    setSelectedQuotes(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(postId)) {
                        newSet.delete(postId);
                      } else {
                        newSet.add(postId);
                      }
                      return newSet;
                    });
                  }}
                  isMultiQuoteSelected={selectedQuotes.has(post.id)}
                  onReputationChange={() => {
                    // Reîncarcă postările pentru a actualiza reputația
                    refetchPosts();
                  }}
                  onPostDeleted={() => {
                    // Reîncarcă postările după ștergere
                    refetchPosts();
                  }}
                  onPostEdited={() => {
                    // Reîncarcă postările după editare
                    refetchPosts();
                  }}
                />
              ))}

              {/* Quick Reply Box - Înainte de ActiveViewers, sub ultimul post */}
              {topic?.id && (
                <QuickReplyBox
                  topicId={topic.id}
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    localStorage.setItem('forum_posts_page_size', newSize.toString());
                    setPageSize(newSize);
                  }}
                  onPostCreated={() => {
                    refetchPosts();
                    // Reset multi-quote după postare
                    setIsMultiQuoteMode(false);
                    setSelectedQuotes(new Set());
                  }}
                  isMultiQuoteMode={isMultiQuoteMode}
                  selectedQuotesCount={selectedQuotes.size}
                  onToggleMultiQuote={() => {
                    setIsMultiQuoteMode(prev => !prev);
                    if (isMultiQuoteMode) {
                      // Dezactivează - șterge selecțiile
                      setSelectedQuotes(new Set());
                    }
                  }}
                  onInsertQuotes={(insertFn) => {
                    // Salvează funcția de inserare pentru a o folosi când se apasă butonul "Quote" sau "Postează"
                    insertQuotesRef.current = insertFn;
                  }}
                  onInsertSelectedQuotes={(quotes) => {
                    // Colectează posturile selectate și le inserează
                    const selectedPosts = posts.filter(p => selectedQuotes.has(p.id));
                    const quotesToInsert = selectedPosts.map(post => ({
                      postId: post.id,
                      author: post.author_username || 'Unknown',
                      content: post.content
                    }));

                    if (insertQuotesRef.current && quotesToInsert.length > 0) {
                      insertQuotesRef.current(quotesToInsert);
                      // Reset selecțiile după inserare
                      setSelectedQuotes(new Set());
                      setIsMultiQuoteMode(false);
                    }
                  }}
                  focusRef={quickReplyTextareaRef}
                />
              )}

              {/* Active Viewers */}
              <ActiveViewers topicId={topic?.id || topicId || ''} />

              {/* Paginare */}
              {total > pageSize && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: isMobile ? '1rem' : '1.5rem',
                  backgroundColor: 'white',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  marginTop: '1rem'
                }}>
                  {/* Info pagină */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    fontSize: isMobile ? '0.875rem' : '0.9375rem',
                    color: '#6b7280'
                  }}>
                    <span>
                      Pagina {page} din {Math.ceil(total / pageSize)} ({total} postări)
                    </span>
                    <span>
                      Afișez {((page - 1) * pageSize + 1)} - {Math.min(page * pageSize, total)} din {total}
                    </span>
                  </div>

                  {/* Butoane navigare */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => {
                        setPage(1);
                        localStorage.setItem('forum_posts_page', '1');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page === 1}
                      style={{
                        padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                        backgroundColor: page === 1 ? '#f3f4f6' : 'white',
                        color: page === 1 ? '#9ca3af' : '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '500',
                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: page === 1 ? 0.5 : 1
                      }}
                    >
                      Prima
                    </button>

                    <button
                      onClick={() => {
                        const newPage = Math.max(1, page - 1);
                        setPage(newPage);
                        localStorage.setItem('forum_posts_page', newPage.toString());
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page === 1}
                      style={{
                        padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                        backgroundColor: page === 1 ? '#f3f4f6' : 'white',
                        color: page === 1 ? '#9ca3af' : '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '500',
                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: page === 1 ? 0.5 : 1
                      }}
                    >
                      ← Anterior
                    </button>

                    {/* Număr pagină curentă */}
                    <span style={{
                      padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      borderRadius: '0.375rem',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      fontWeight: '400',
                      minWidth: '3rem',
                      textAlign: 'center'
                    }}>
                      {page}
                    </span>

                    <button
                      onClick={() => {
                        const newPage = Math.min(Math.ceil(total / pageSize), page + 1);
                        setPage(newPage);
                        localStorage.setItem('forum_posts_page', newPage.toString());
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page >= Math.ceil(total / pageSize)}
                      style={{
                        padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                        backgroundColor: page >= Math.ceil(total / pageSize) ? '#f3f4f6' : 'white',
                        color: page >= Math.ceil(total / pageSize) ? '#9ca3af' : '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '500',
                        cursor: page >= Math.ceil(total / pageSize) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: page >= Math.ceil(total / pageSize) ? 0.5 : 1
                      }}
                    >
                      Următor →
                    </button>

                    <button
                      onClick={() => {
                        const lastPage = Math.ceil(total / pageSize);
                        setPage(lastPage);
                        localStorage.setItem('forum_posts_page', lastPage.toString());
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page >= Math.ceil(total / pageSize)}
                      style={{
                        padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                        backgroundColor: page >= Math.ceil(total / pageSize) ? '#f3f4f6' : 'white',
                        color: page >= Math.ceil(total / pageSize) ? '#9ca3af' : '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '500',
                        cursor: page >= Math.ceil(total / pageSize) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: page >= Math.ceil(total / pageSize) ? 0.5 : 1
                      }}
                    >
                      Ultima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ForumLayout>
    </>
  );
}
