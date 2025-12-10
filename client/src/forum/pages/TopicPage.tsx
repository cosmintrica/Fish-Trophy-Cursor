import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, User } from 'lucide-react';
import { useTopic } from '../hooks/useTopics';
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
import { useSubcategoryOrSubforum } from '../hooks/useSubcategoryOrSubforum';
import SEOHead from '../../components/SEOHead';
import { useStructuredData } from '../../hooks/useStructuredData';
import ShareButton from '../../components/ShareButton';

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
  const { forumUser } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  
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
  
  // IMPORTANT: Folosim hook-ul pentru a detecta automat dacă e subcategorie sau subforum
  // Asta ne permite să folosim datele din cache și să găsim topicul corect
  // Nu mai trecem categorySlug - nu este necesar
  const { data: subcategoryOrSubforumData } = useSubcategoryOrSubforum(
    undefined, // categorySlug nu mai este necesar
    actualSubcategoryOrSubforumSlug
  );
  
  // Determinăm subcategoryId și subforumId din datele din cache
  const subcategoryIdFromCache = subcategoryOrSubforumData?.type === 'subcategory' 
    ? subcategoryOrSubforumData.subcategory?.id 
    : null;
  const subforumIdFromCache = subcategoryOrSubforumData?.type === 'subforum'
    ? subcategoryOrSubforumData.subforum?.id
    : null;
  
  // Supabase hooks - folosim ID-urile din cache pentru o căutare precisă
  const { topic, loading: topicLoading, error: topicError } = useTopic(
    topicIdentifier, 
    actualSubcategoryOrSubforumSlug, 
    subforumIdFromCache ? actualSubcategoryOrSubforumSlug : undefined,
    subcategoryIdFromCache || undefined,
    subforumIdFromCache || undefined
  );
  
  // IMPORTANT: Folosim DOAR topic.id (UUID) pentru usePosts
  // NU folosim topicIdentifier ca fallback - asta cauza double query și flickering
  // Posturile se încarcă DOAR când avem UUID-ul topicului
  const { posts, loading: postsLoading, error: postsError, refetch: refetchPosts, total, hasMore } = usePosts(topic?.id || null, page, pageSize);
  const { create: createPost } = useCreatePost();
  
  // Hook pentru marcarea topicului ca citit
  const { markAsRead } = useMarkTopicAsRead();

  // IMPORTANT: TOȚI hooks-ii trebuie declarați ÎNAINTE de orice early return
  // Topic not found state
  const [showNotFound, setShowNotFound] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // SIMPLIFICAT: Breadcrumbs - folosim DIRECT datele din hook, fără state-uri intermediare
  // Asta elimină flickering-ul cauzat de useEffect-uri care actualizează state-uri
  const categoryName = subcategoryOrSubforumData?.parentCategory?.name || '';
  const categoryId = subcategoryOrSubforumData?.parentCategory?.id || null;
  const subcategoryName = subcategoryOrSubforumData?.subcategory?.name || subcategoryOrSubforumData?.subforum?.name || '';
  const subcategorySlug = actualSubcategoryOrSubforumSlug || subcategoryOrSubforumData?.subcategory?.slug || subcategoryOrSubforumData?.subforum?.slug || '';
  
  // Detect mobil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll automat la hash când se încarcă pagina (ex: #post1, #post2, #post5)
  // SIMPLIFICAT: Un singur useEffect simplu
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#post') || posts.length === 0) return;
    
    const postId = hash.substring(1);
    const element = document.getElementById(postId);
    if (element) {
      const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementTop - 100, behavior: 'auto' });
    }
  }, [posts.length]);

  // Nu mai folosim loading state - afișăm conținutul instant

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
  useEffect(() => {
    // topic?.id este deja UUID valid
    if (topic?.id && forumUser && posts.length > 0) {
      // Marchează topicul ca citit cu ultimul post
      const lastPost = posts[posts.length - 1];
      markAsRead({ 
        topicId: topic.id, 
        postId: lastPost?.id 
      }).catch(error => {
        // Silent fail - nu afișăm eroare dacă marcarea nu reușește
        console.error('Error marking topic as read:', error);
      });
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
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
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
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
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

  // ZERO LOADING: Afișăm întotdeauna conținut, chiar dacă datele se încarcă
  // Skeleton-uri doar cu date placeholder, nu animații de loading
  
  // Dacă nu avem topic, afișăm un placeholder pân se încarcă
  const displayTopic = topic || {
    title: '',
    created_at: new Date().toISOString(),
    view_count: 0,
    reply_count: 0
  };
  
  const displayPosts = posts.length > 0 ? posts : [];
  
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
  const { websiteData, organizationData, createArticleData } = useStructuredData();
  const topicUrl = topic ? `https://fishtrophy.ro/forum/${actualSubcategoryOrSubforumSlug}/${topic.slug}` : '';
  const topicTitle = displayTopic.title || 'Topic Forum';
  const topicDescription = displayPosts.length > 0 
    ? `${displayPosts[0].content?.substring(0, 150).replace(/\[.*?\]/g, '') || 'Discuție despre pescuit'}...`
    : `Discuție despre pescuit în ${subcategoryName || 'forum'}. ${displayTopic.reply_count || 0} răspunsuri.`;
  const topicAuthor = (displayPosts[0] as any)?.author_username || 'Pescar';
  const topicImage = 'https://fishtrophy.ro/social-media-banner-v2.jpg';
  const topicTags = [
    subcategoryName || 'pescuit',
    categoryName || 'forum',
    'discuții',
    'sfaturi'
  ].filter(Boolean);
  const parentCategory = subcategoryOrSubforumData?.parentCategory;

  // Structured data pentru Article
  const articleStructuredData = topic && displayTopic.created_at ? createArticleData({
    headline: topicTitle,
    description: topicDescription,
    image: topicImage,
    datePublished: displayTopic.created_at,
    dateModified: displayTopic.updated_at || displayTopic.created_at,
    author: topicAuthor,
    url: topicUrl
  }) : null;

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
          publishedTime={displayTopic.created_at}
          modifiedTime={displayTopic.updated_at || displayTopic.created_at}
          section={subcategoryName || 'Forum'}
          tags={topicTags}
          structuredData={articleStructuredData ? [websiteData, organizationData, articleStructuredData] as unknown as Record<string, unknown>[] : [websiteData, organizationData] as unknown as Record<string, unknown>[]}
        />
      )}
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: isMobile ? '0.5rem' : '2rem 1rem',
        width: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* Breadcrumbs: FishTrophy › Categorie › SubCategorie › Topic - Toate linkuri funcționale */}
        <nav style={{ 
          marginBottom: isMobile ? '0.5rem' : '1.5rem', 
          fontSize: isMobile ? '0.625rem' : '0.875rem', 
          color: '#6b7280',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          paddingBottom: '0.25rem'
        }}>
          <Link to="/forum" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>FishTrophy</Link>
          {(categoryName || subcategoryName || displayTopic.title) && (
            <>
              {/* Categoria */}
              {categoryName && (
                <>
                  <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>
                  <Link
                    to="/forum"
                    style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
                  >
                    {categoryName}
                  </Link>
                </>
              )}
              {/* Subcategoria */}
              {subcategorySlug && (
                <>
                  <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>
                  <Link 
                    to={`/forum/${subcategorySlug}`}
                    style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
                  >
                    {subcategoryName || subcategorySlug}
                  </Link>
                </>
              )}
              {/* Topic-ul */}
              {displayTopic.title && (
                <>
                  <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>{displayTopic.title}</span>
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
              {displayTopic.title || '\u00A0'}
            </h1>
            {displayTopic.title && (
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
                <span>{displayTopic.view_count} viz</span>
                <span>•</span>
                <span>{displayTopic.reply_count} răsp</span>
              </div>
            )}
          </div>
          {topic && (
            <div style={{ flexShrink: 0 }}>
              <ShareButton
                url={topicUrl}
                title={topicTitle}
                description={topicDescription}
                size="sm"
                variant="ghost"
              />
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
              respect: (post as any).author_respect || 0 // Respect real din forum_users.reputation_points
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
                fontWeight: '600',
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
      </div>
    </ForumLayout>
    </>
  );
}
