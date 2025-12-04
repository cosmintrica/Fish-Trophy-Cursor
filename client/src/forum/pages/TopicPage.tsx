import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, User } from 'lucide-react';
import { useTopic } from '../hooks/useTopics';
import { usePosts, useCreatePost } from '../hooks/usePosts';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import MessageContainer from '../components/MessageContainer';
import ActiveViewers from '../components/ActiveViewers';
import QuickReplyBox from '../components/QuickReplyBox';
import AdvancedEditorModal from '../components/AdvancedEditorModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { ForumTopic, ForumPost } from '../types/forum';
import { useMarkTopicAsRead } from '../hooks/useTopicReadStatus';
import { useToast } from '../contexts/ToastContext';

export default function TopicPage() {
  // Acceptă:
  // - /:categorySlug/:subcategorySlug/:topicSlug (clean - complet)
  // - /:subcategorySlug/:topicSlug (legacy - pentru compatibilitate)
  // - /topic/:id (legacy)
  const { topicId, topicSlug, subcategorySlug, categorySlug } = useParams<{ 
    topicId?: string; 
    topicSlug?: string; 
    subcategorySlug?: string;
    categorySlug?: string;
  }>();
  const navigate = useNavigate();
  const { forumUser } = useAuth();
  const { showToast } = useToast();
  
  // Paginare - salvat în localStorage pentru preferințe utilizator
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem('forum_posts_page');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('forum_posts_page_size');
    return saved ? parseInt(saved, 10) : 20;
  });

  // Advanced Editor Modal state
  const [isAdvancedEditorOpen, setIsAdvancedEditorOpen] = useState(false);
  const [advancedEditorContent, setAdvancedEditorContent] = useState<string>('');

  // Folosește topicSlug dacă există (clean URL), altfel topicId (legacy)
  const topicIdentifier = topicSlug || topicId || '';
  
  // Supabase hooks
  // Folosim subcategorySlug pentru a evita duplicate (slug-ul nu e unic global)
  const { topic, loading: topicLoading, error: topicError } = useTopic(topicIdentifier, subcategorySlug);
  
  // IMPORTANT: Folosim topic.id (UUID) în loc de slug pentru usePosts
  // Astfel evităm duplicatele și erorile de "Topic not found"
  const actualTopicId = topic?.id || topicIdentifier;
  const { posts, loading: postsLoading, error: postsError, refetch: refetchPosts, total, hasMore } = usePosts(actualTopicId, page, pageSize);
  const { create: createPost } = useCreatePost();
  
  // Hook pentru marcarea topicului ca citit
  const { markAsRead } = useMarkTopicAsRead();

  // IMPORTANT: TOȚI hooks-ii trebuie declarați ÎNAINTE de orice early return
  // Topic not found state
  const [showNotFound, setShowNotFound] = useState(false);
  
  // Slug-urile pentru link-uri
  const [resolvedSubcategorySlug, setResolvedSubcategorySlug] = useState<string | null>(subcategorySlug || null);
  const [resolvedCategorySlug, setResolvedCategorySlug] = useState<string | null>(categorySlug || null);
  const [subcategoryName, setSubcategoryName] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll automat la hash când se încarcă pagina (ex: #post1, #post2)
  useEffect(() => {
    if (posts.length > 0) {
      const hash = window.location.hash;
      if (hash) {
        // Așteaptă ca posturile să fie randate
        const scrollTimeout = setTimeout(() => {
          const element = document.getElementById(hash.substring(1)); // Remove #
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 200);
        return () => clearTimeout(scrollTimeout);
      }
    }
  }, [posts.length]);

  // Nu mai folosim loading state - afișăm conținutul instant

  // Error handling
  useEffect(() => {
    if (topicError) console.error('Error loading topic:', topicError);
    if (postsError) console.error('Error loading posts:', postsError);
  }, [topicError, postsError]);
  
  // Topic not found effect - doar dacă există eroare EXPLICITĂ (nu mai folosim timeout)
  useEffect(() => {
    if (topicError && topicError.message?.includes('not found')) {
      setShowNotFound(true);
    } else {
      setShowNotFound(false);
    }
  }, [topicError]);
  
  // Obține informații despre subcategorie și categorie pentru breadcrumbs
  useEffect(() => {
    const getHierarchy = async () => {
      if (!topic?.subcategory_id && !subcategorySlug) return;
      
      try {
        let subcategoryData;
        
        if (subcategorySlug) {
          // Obține subcategoria după slug
          const { data } = await supabase
            .from('forum_subcategories')
            .select('id, slug, name, category_id')
            .eq('slug', subcategorySlug)
            .maybeSingle();
          subcategoryData = data;
          setResolvedSubcategorySlug(subcategorySlug);
        } else if (topic?.subcategory_id) {
          // Obține subcategoria după ID
          const { data } = await supabase
            .from('forum_subcategories')
            .select('id, slug, name, category_id')
            .eq('id', topic.subcategory_id)
            .maybeSingle();
          subcategoryData = data;
          if (data?.slug) {
            setResolvedSubcategorySlug(data.slug);
          }
        }
        
        if (subcategoryData) {
          setSubcategoryName(subcategoryData.name);
          
          // Obține categoria părinte
          if (subcategoryData.category_id) {
            setCategoryId(subcategoryData.category_id);
            const { data: category } = await supabase
              .from('forum_categories')
              .select('name, slug')
              .eq('id', subcategoryData.category_id)
              .maybeSingle();
            
            if (category) {
              setCategoryName(category.name);
              setResolvedCategorySlug(category.slug || null);
            }
          }
        }
      } catch (error) {
        console.error('Error loading hierarchy:', error);
      }
    };
    
    getHierarchy();
  }, [topic, subcategorySlug]);

  // Marchează topicul ca citit când user-ul intră pe pagină
  useEffect(() => {
    if (actualTopicId && forumUser && posts.length > 0) {
      // Marchează topicul ca citit cu ultimul post
      const lastPost = posts[posts.length - 1];
      markAsRead({ 
        topicId: actualTopicId, 
        postId: lastPost?.id 
      }).catch(error => {
        // Silent fail - nu afișăm eroare dacă marcarea nu reușește
        console.error('Error marking topic as read:', error);
      });
    }
  }, [actualTopicId, forumUser, posts.length, markAsRead]);


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

  return (
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
              <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>
              {categoryName && (resolvedCategorySlug || categoryId) && (
                <Link 
                  to={resolvedCategorySlug ? `/forum/${resolvedCategorySlug}` : `/forum#category-${categoryId}`}
                  style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
                  onClick={(e) => {
                    if (!resolvedCategorySlug && categoryId) {
                      // Legacy: scroll la categorie pe homepage
                      e.preventDefault();
                      navigate('/forum');
                      setTimeout(() => {
                        const element = document.getElementById(`category-${categoryId}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 100);
                    }
                  }}
                >
                  {categoryName}
                </Link>
              )}
              {categoryName && subcategoryName && <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>}
              {subcategoryName && resolvedSubcategorySlug && (
                <Link 
                  to={resolvedCategorySlug ? `/forum/${resolvedCategorySlug}/${resolvedSubcategorySlug}` : `/forum/${resolvedSubcategorySlug}`}
                  style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
                >
                  {subcategoryName}
                </Link>
              )}
              {subcategoryName && displayTopic.title && <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>}
              {displayTopic.title && (
                <span style={{ color: '#6b7280', fontWeight: '500' }}>{displayTopic.title}</span>
              )}
            </>
          )}
        </nav>

        {/* Topic Header - Compact pentru mobil */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: isMobile ? '0.5rem' : '1rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            marginBottom: isMobile ? '0.75rem' : '1.5rem',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: 'white',
              padding: isMobile ? '0.75rem' : '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.5rem' : '0.75rem'
            }}
          >
            {resolvedSubcategorySlug ? (
              <Link
                to={`/forum/${resolvedSubcategorySlug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isMobile ? '2rem' : '2.5rem',
                  height: isMobile ? '2rem' : '2.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.375rem',
                  color: 'white',
                  textDecoration: 'none',
                  transition: 'background-color 0.2s',
                  flexShrink: 0
                }}
              >
                <ArrowLeft style={{ width: isMobile ? '1rem' : '1.25rem', height: isMobile ? '1rem' : '1.25rem' }} />
              </Link>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isMobile ? '2rem' : '2.5rem',
                  height: isMobile ? '2rem' : '2.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.375rem',
                  color: 'white',
                  textDecoration: 'none',
                  transition: 'background-color 0.2s',
                  flexShrink: 0
                }}
              >
                <ArrowLeft style={{ width: isMobile ? '1rem' : '1.25rem', height: isMobile ? '1rem' : '1.25rem' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: isMobile ? '1rem' : '1.5rem', fontWeight: '600', marginBottom: '0.25rem', lineHeight: '1.2', wordBreak: 'break-word' }}>
                {displayTopic.title || '\u00A0'}
              </h1>
              {displayTopic.title && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: isMobile ? '0.5rem' : '1rem', 
                  fontSize: isMobile ? '0.75rem' : '0.875rem', 
                  color: 'rgba(255, 255, 255, 0.8)',
                  flexWrap: isMobile ? 'wrap' : 'nowrap'
                }}>
                  <span>de <strong>{displayPosts[0]?.author_username || 'Se încarcă...'}</strong></span>
                  <span>•</span>
                  <span>{formatSmartDateTime(displayTopic.created_at)}</span>
                  <span>•</span>
                  <span>{displayTopic.view_count} viz</span>
                  <span>•</span>
                  <span>{displayTopic.reply_count} răsp</span>
                </div>
              )}
            </div>
          </div>
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
            onRespectChange={(postId, delta, comment) => {
              console.log(`Respect ${delta > 0 ? 'oferit' : 'retras'} pentru ${post.author_username}: "${comment}"`);
              alert(`Ai ${delta > 0 ? 'oferit' : 'retras'} respect pentru ${post.author_username}!`);
            }}
            onReply={() => console.log(`Reply to ${post.author_username}`)}
            onQuote={() => console.log(`Quote ${post.author_username}`)}
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
        {actualTopicId && (
          <QuickReplyBox
            topicId={actualTopicId}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              // Nu resetăm pagina - păstrăm poziția utilizatorului
              // Doar schimbăm numărul de postări pe pagină
              setPageSize(newSize);
              localStorage.setItem('forum_posts_page_size', newSize.toString());
              // Nu resetăm page - păstrăm poziția curentă
              // React Query va reîncărca automat datele pentru query key nou
            }}
            onPostCreated={() => {
              refetchPosts();
            }}
            onOpenAdvancedEditor={(content) => {
              setAdvancedEditorContent(content);
              setIsAdvancedEditorOpen(true);
            }}
          />
        )}

        {/* Advanced Editor Modal */}
        {actualTopicId && (
          <AdvancedEditorModal
            isOpen={isAdvancedEditorOpen}
            onClose={() => {
              setIsAdvancedEditorOpen(false);
              setAdvancedEditorContent(''); // Clear content when closing
            }}
            topicId={actualTopicId}
            initialContent={advancedEditorContent}
            onPostCreated={() => {
              refetchPosts();
              setIsAdvancedEditorOpen(false);
              setAdvancedEditorContent(''); // Clear content after posting
            }}
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
  );
}
