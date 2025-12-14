import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Clock, TrendingUp, Users, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { usePrefetch } from '../hooks/usePrefetch';
import { parseBBCode, stripBBCode } from '../../services/forum/bbcode';
import SEOHead from '../../components/SEOHead';
import { RecentPostListSkeleton } from '../../components/skeletons/RecentPostSkeleton';

export default function RecentPosts() {
  const { forumUser, signOut } = useAuth();
  const { theme } = useTheme();
  const { prefetchTopic } = usePrefetch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
  };
  const postsContainerRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [stats, setStats] = useState({
    postsToday: 0,
    postsThisWeek: 0,
    mostActiveUser: null as { username: string; count: number } | null
  });

  const POSTS_PER_PAGE = 20;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Intercept clicks on mention links to use React Router navigation
  useEffect(() => {
    if (!postsContainerRef.current) return;

    const mentionLinks = postsContainerRef.current.querySelectorAll('.bbcode-mention');
    const handleMentionClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const link = e.currentTarget as HTMLAnchorElement;
      const href = link.getAttribute('href');
      if (href && href.startsWith('/forum/user/')) {
        navigate(href);
      }
    };

    mentionLinks.forEach(link => {
      link.addEventListener('click', handleMentionClick);
    });

    return () => {
      mentionLinks.forEach(link => {
        link.removeEventListener('click', handleMentionClick);
      });
    };
  }, [posts, navigate]);

  useEffect(() => {
    const loadRecentPosts = async () => {
      try {
        setLoading(true);
        const offset = (currentPage - 1) * POSTS_PER_PAGE;

        // Get total count first
        const { count: totalCount } = await supabase
          .from('forum_posts')
          .select('*', { count: 'exact', head: true })
          .eq('is_deleted', false);

        setTotalPosts(totalCount || 0);

        // Get posts with topic info and post_number (paginated)
        const { data: postsData, error: postsError } = await supabase
          .from('forum_posts')
          .select(`
            id,
            content,
            created_at,
            user_id,
            topic_id,
            post_number,
            topic:forum_topics!topic_id(id, title, subcategory_id, subforum_id, slug, reply_count, view_count)
          `)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .range(offset, offset + POSTS_PER_PAGE - 1);

        if (postsError) throw postsError;

        // Get user IDs
        const userIds = [...new Set((postsData || []).map(p => p.user_id))];

        // Get forum_users data (username, avatar_url)
        const { data: forumUsersData } = await supabase
          .from('forum_users')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        // Get profiles data (photo_url - real profile picture)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, photo_url')
          .in('id', userIds);

        const forumUsersMap = new Map((forumUsersData || []).map(u => [u.user_id, u]));
        const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

        // Get subcategory and category slugs
        const subcategoryIds = [...new Set((postsData || []).map(p => {
          const topic = Array.isArray(p.topic) ? p.topic[0] : p.topic;
          return topic?.subcategory_id;
        }).filter(Boolean))];

        const subforumIds = [...new Set((postsData || []).map(p => {
          const topic = Array.isArray(p.topic) ? p.topic[0] : p.topic;
          return topic?.subforum_id;
        }).filter(Boolean))];

        // Fetch Subcategories
        let subcategoriesMap = new Map();
        let categoriesMap = new Map();

        if (subcategoryIds.length > 0) {
          const { data: subcategoriesData } = await supabase
            .from('forum_subcategories')
            .select('id, slug, category_id, name')
            .in('id', subcategoryIds);

          subcategoriesMap = new Map((subcategoriesData || []).map(sc => [sc.id, sc]));

          const categoryIds = [...new Set((subcategoriesData || []).map(sc => sc.category_id).filter(Boolean))];
          if (categoryIds.length > 0) {
            const { data: categoriesData } = await supabase
              .from('forum_categories')
              .select('id, slug, name')
              .in('id', categoryIds);
            categoriesMap = new Map((categoriesData || []).map(c => [c.id, c]));
          }
        }

        // Fetch Subforums
        let subforumsMap = new Map();
        if (subforumIds.length > 0) {
          const { data: subforumsData } = await supabase
            .from('forum_subforums')
            .select('id, slug, subcategory_id, name')
            .in('id', subforumIds);

          subforumsMap = new Map((subforumsData || []).map(sf => [sf.id, sf]));

          // Also fetch parent subcategories of these subforums if not already fetched
          const missingSubcategoryIds = [...new Set((subforumsData || []).map(sf => sf.subcategory_id).filter(id => !subcategoriesMap.has(id)))];

          if (missingSubcategoryIds.length > 0) {
            const { data: missingSubcategoriesData } = await supabase
              .from('forum_subcategories')
              .select('id, slug, category_id, name')
              .in('id', missingSubcategoryIds);

            (missingSubcategoriesData || []).forEach(sc => subcategoriesMap.set(sc.id, sc));

            const missingCategoryIds = [...new Set((missingSubcategoriesData || []).map(sc => sc.category_id).filter(id => !categoriesMap.has(id)))];
            if (missingCategoryIds.length > 0) {
              const { data: missingCategoriesData } = await supabase
                .from('forum_categories')
                .select('id, slug, name')
                .in('id', missingCategoryIds);
              (missingCategoriesData || []).forEach(c => categoriesMap.set(c.id, c));
            }
          }
        }

        // Combine data
        const data = (postsData || []).map(post => {
          const topic = Array.isArray(post.topic) ? post.topic[0] : post.topic;
          const forumUser = forumUsersMap.get(post.user_id);
          const profile = profilesMap.get(post.user_id);

          const subforum = topic?.subforum_id ? subforumsMap.get(topic.subforum_id) : null;
          // If in subforum, get subcategory from subforum's parent. If not, from topic's subcategory_id
          const subcategoryId = subforum ? subforum.subcategory_id : topic?.subcategory_id;
          const subcategory = subcategoryId ? subcategoriesMap.get(subcategoryId) : null;
          const categoryId = subcategory ? subcategory.category_id : null;
          const category = categoryId ? categoriesMap.get(categoryId) : null;

          const username = forumUser?.username || 'Unknown';
          const photoUrl = profile?.photo_url;

          return {
            ...post,
            topic: topic,
            author: {
              username: username,
              photo_url: photoUrl,
              avatar_url: forumUser?.avatar_url || null
            },
            subforumSlug: subforum?.slug || null,
            subforumName: subforum?.name || null,
            subcategorySlug: subcategory?.slug || null,
            subcategoryName: (subcategory as any)?.name || null,
            categorySlug: category?.slug || null,
            categoryName: (category as any)?.name || null,
            post_number: post.post_number || null
          };
        });

        setPosts(data || []);

        // Calculate additional statistics
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);

        const postsToday = data.filter(p => new Date(p.created_at) >= todayStart).length;
        const postsThisWeek = data.filter(p => new Date(p.created_at) >= weekStart).length;

        // Find most active user (by post count in this dataset)
        const userPostCounts = new Map<string, number>();
        data.forEach(post => {
          const username = post.author?.username || 'Unknown';
          userPostCounts.set(username, (userPostCounts.get(username) || 0) + 1);
        });

        let mostActiveUser: { username: string; count: number } | null = null;
        userPostCounts.forEach((count, username) => {
          if (!mostActiveUser || count > mostActiveUser.count) {
            mostActiveUser = { username, count };
          }
        });

        setStats({
          postsToday,
          postsThisWeek,
          mostActiveUser
        });
      } catch (error) {
        console.error('Error loading recent posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentPosts();
  }, [currentPage]);

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
      return `${hours}:${minutes}`;
    } else {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }
  };

  const generateUserColor = (name: string) => {
    const colors = [
      'linear-gradient(135deg, #6366f1, #8b5cf6)',
      'linear-gradient(135deg, #ec4899, #d946ef)',
      'linear-gradient(135deg, #3b82f6, #06b6d4)',
      'linear-gradient(135deg, #f59e0b, #f97316)',
      'linear-gradient(135deg, #10b981, #34d399)'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <ForumLayout onLogin={() => { }} onLogout={handleLogout} user={forumUserToLayoutUser(forumUser)}>
      <div className="max-w-6xl mx-auto px-0 md:px-0 scroll-mt-20" style={{ paddingTop: '1.5rem' }}>
        <SEOHead
          title="Postări Recente | Fish Trophy"
          description="Cele mai recente discuții și postări din comunitatea Fish Trophy."
          canonical="https://fishtrophy.ro/forum/recent"
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 px-4 md:px-0 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              Postări Recente
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Discuțiile active din comunitate
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex flex-col items-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <span className="font-bold text-blue-600 text-lg">{stats.postsToday}</span>
              <span className="text-xs text-center leading-tight">Postări azi</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <span className="font-bold text-green-600 text-lg">{stats.postsThisWeek}</span>
              <span className="text-xs text-center leading-tight">Săptămâna asta</span>
            </div>
            {stats.mostActiveUser && (
              <Link to={`/forum/user/${stats.mostActiveUser.username}`} className="flex flex-col items-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:ring-2 ring-blue-500 transition-all">
                <span className="font-bold text-indigo-600 text-lg">{stats.mostActiveUser.count}</span>
                <span className="text-xs flex items-center gap-1 text-center leading-tight">
                  <span className="max-w-[80px] truncate">{stats.mostActiveUser.username}</span>
                  <Award size={12} className="text-yellow-500 flex-shrink-0" />
                </span>
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <RecentPostListSkeleton count={POSTS_PER_PAGE} />
        ) : (
          <div style={{
            backgroundColor: theme.surface,
            borderRadius: '0.75rem',
            border: `1px solid ${theme.border}`,
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            {/* Header Row (Desktop only) */}
            {!isMobile && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 2fr) 150px 200px',
                padding: '0.75rem 1rem',
                backgroundColor: theme.background,
                borderBottom: `1px solid ${theme.border}`,
                fontSize: '0.75rem',
                fontWeight: '600',
                color: theme.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <div>SUBIECT</div>
                <div style={{ textAlign: 'center' }}>Statistici</div>
                <div style={{ textAlign: 'right' }}>Ultima Postare</div>
              </div>
            )}

            {/* Posts List */}
            {posts.map((post, index) => {
              const topic = Array.isArray(post.topic) ? post.topic[0] : post.topic;
              // Construiește permalink complet
              let topicLink = '';
              if (post.subforumSlug && topic?.slug) {
                // Format: /forum/subforumSlug/topicSlug
                topicLink = `/forum/${post.subforumSlug}/${topic.slug}${post.post_number ? `#post${post.post_number}` : ''}`;
              } else if (post.subcategorySlug && topic?.slug) {
                // Format: /forum/subcategorySlug/topicSlug
                topicLink = `/forum/${post.subcategorySlug}/${topic.slug}${post.post_number ? `#post${post.post_number}` : ''}`;
              } else if (topic?.slug) {
                // Fallback: doar topic slug
                topicLink = `/forum/topic/${topic.slug}${post.post_number ? `#post${post.post_number}` : ''}`;
              } else {
                // Fallback final: topic ID
                topicLink = `/forum/topic/${topic?.id || post.topic_id}${post.post_number ? `#post${post.post_number}` : ''}`;
              }

              // Date formatting logic
              const dateObj = new Date(post.created_at);
              const dateStr = dateObj.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const timeStr = dateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={post.id}
                  style={{
                    display: isMobile ? 'flex' : 'grid',
                    flexDirection: isMobile ? 'column' : 'unset',
                    gridTemplateColumns: isMobile ? '1fr' : 'minmax(300px, 2fr) 150px 200px',
                    padding: isMobile ? '0.75rem' : '0.75rem 1rem',
                    borderBottom: index !== posts.length - 1 ? `1px solid ${theme.border}` : 'none',
                    alignItems: 'center',
                    gap: isMobile ? '0.5rem' : '0',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                    // Prefetch topic-ul când utilizatorul trece cu mouse-ul
                    if (topic?.slug) {
                      prefetchTopic(topic.slug, post.subcategorySlug || undefined);
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Column 1: Topic Info */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', minWidth: 0 }}>
                    {/* Icon */}
                    <div style={{
                      marginTop: '0.15rem',
                      color: theme.textSecondary,
                      flexShrink: 0
                    }}>
                      <MessageSquare size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Topic Title - REVERTED TO TOP */}
                      <div style={{ marginBottom: '0.125rem' }}>
                        <Link
                          to={topicLink}
                          style={{
                            fontSize: isMobile ? '0.9rem' : '0.95rem',
                            fontWeight: '600',
                            color: theme.text,
                            textDecoration: 'none',
                            lineHeight: '1.4',
                            display: 'block'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = theme.primary}
                          onMouseLeave={(e) => e.currentTarget.style.color = theme.text}
                        >
                          {topic?.title || 'Subiect fără titlu'}
                        </Link>
                      </div>

                      {/* Category Path (Hierarchy) - NOW BELOW */}
                      <div style={{
                        fontSize: '0.75rem',
                        color: theme.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        flexWrap: 'wrap'
                      }}>
                        {post.categoryName && (
                          <>
                            <span style={{ fontWeight: '500' }}>
                              {/* Category Link Corrected to /forum/:slug */}
                              {post.categorySlug ? (
                                <Link
                                  to={`/forum/${post.categorySlug}`}
                                  style={{ color: theme.textSecondary, textDecoration: 'none' }}
                                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                >
                                  {post.categoryName}
                                </Link>
                              ) : (
                                post.categoryName
                              )}
                            </span>
                          </>
                        )}

                        {/* 
                            Logic: If subforum exists, display Category > Subforum. 
                            Else display Category > Subcategory.
                            We skip showing "Subcategory" if "Subforum" is present, as per user request.
                        */}
                        {post.subforumName ? (
                          <>
                            <span>›</span>
                            <Link
                              to={`/forum/${post.subforumSlug || '#'}`}
                              style={{ color: theme.textSecondary, textDecoration: 'none' }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                              {post.subforumName}
                            </Link>
                          </>
                        ) : (
                          post.subcategoryName && (
                            <>
                              <span>›</span>
                              <Link
                                to={`/forum/${post.subcategorySlug || '#'}`}
                                style={{ color: theme.textSecondary, textDecoration: 'none' }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                              >
                                {post.subcategoryName}
                              </Link>
                            </>
                          )
                        )}

                      </div>
                    </div>
                  </div>

                  {/* Column 2: Stats (Hidden on Mobile) */}
                  {!isMobile && (
                    <div style={{
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      color: theme.textSecondary,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.125rem'
                    }}>
                      <div>Răspunsuri: {topic?.reply_count || 0}</div>
                      <div>Vizualizări: {topic?.view_count || 0}</div>
                    </div>
                  )}

                  {/* Column 3: Last Post Info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isMobile ? 'flex-start' : 'flex-end',
                    gap: '0.75rem',
                    width: '100%',
                    paddingTop: isMobile ? '0.5rem' : '0',
                    borderTop: isMobile ? `1px solid ${theme.border}` : 'none',
                    marginTop: isMobile ? '0.25rem' : '0'
                  }}>
                    <div style={{
                      textAlign: isMobile ? 'left' : 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      minWidth: 0,
                      flex: 1
                    }}>
                      {/* Date + Time (No Icon, Time Red) */}
                      <div style={{
                        fontSize: '0.75rem',
                        marginBottom: '0.125rem'
                      }}>
                        <span style={{ color: theme.textSecondary, marginRight: '6px' }}>{dateStr}</span>
                        <span style={{ color: '#ef4444', fontWeight: '500' }}>{timeStr}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: theme.textSecondary, marginRight: '3px' }}>de</span>
                        <Link
                          to={`/forum/user/${post.author?.username || 'unknown'}`}
                          style={{
                            fontWeight: '600',
                            color: theme.text,
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = theme.primary}
                          onMouseLeave={(e) => e.currentTarget.style.color = theme.text}
                        >
                          {post.author?.username || 'Anonim'}
                        </Link>
                      </div>
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      background: post.author?.photo_url
                        ? `url(${post.author.photo_url}) center/cover`
                        : post.author?.avatar_url
                          ? `url(${post.author.avatar_url}) center/cover`
                          : generateUserColor(post.author?.username || 'User'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      flexShrink: 0,
                      border: `1px solid ${theme.border}`
                    }}>
                      {!post.author?.photo_url && !post.author?.avatar_url &&
                        (post.author?.username?.charAt(0).toUpperCase() || '?')}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Pagination - Only show if not loading and has content */}
        {
          !loading && posts.length > 0 && totalPosts > POSTS_PER_PAGE && (
            <div style={{
              marginTop: isMobile ? '1.5rem' : '2rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: isMobile ? '0.5rem' : '0.75rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                  backgroundColor: currentPage === 1 ? theme.surfaceHover : theme.surface,
                  color: currentPage === 1 ? theme.textSecondary : theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.375rem',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (currentPage > 1) {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                    e.currentTarget.style.borderColor = theme.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage > 1) {
                    e.currentTarget.style.backgroundColor = theme.surface;
                    e.currentTarget.style.borderColor = theme.border;
                  }
                }}
              >
                <ChevronLeft size={isMobile ? 16 : 18} />
                <span>Anterior</span>
              </button>

              {/* Page Numbers */}
              <div style={{
                display: 'flex',
                gap: '0.25rem',
                alignItems: 'center'
              }}>
                {Array.from({ length: Math.min(5, Math.ceil(totalPosts / POSTS_PER_PAGE)) }, (_, i) => {
                  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
                  let pageNum: number;

                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  if (pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        minWidth: isMobile ? '2rem' : '2.5rem',
                        height: isMobile ? '2rem' : '2.5rem',
                        padding: '0.5rem',
                        backgroundColor: currentPage === pageNum ? theme.primary : theme.surface,
                        color: currentPage === pageNum ? 'white' : theme.text,
                        border: `1px solid ${currentPage === pageNum ? theme.primary : theme.border}`,
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: currentPage === pageNum ? '600' : '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== pageNum) {
                          e.currentTarget.style.backgroundColor = theme.surfaceHover;
                          e.currentTarget.style.borderColor = theme.primary;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== pageNum) {
                          e.currentTarget.style.backgroundColor = theme.surface;
                          e.currentTarget.style.borderColor = theme.border;
                        }
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalPosts / POSTS_PER_PAGE), p + 1))}
                disabled={currentPage >= Math.ceil(totalPosts / POSTS_PER_PAGE)}
                style={{
                  padding: isMobile ? '0.5rem 0.75rem' : '0.625rem 1rem',
                  backgroundColor: currentPage >= Math.ceil(totalPosts / POSTS_PER_PAGE) ? theme.surfaceHover : theme.surface,
                  color: currentPage >= Math.ceil(totalPosts / POSTS_PER_PAGE) ? theme.textSecondary : theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.375rem',
                  cursor: currentPage >= Math.ceil(totalPosts / POSTS_PER_PAGE) ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s',
                  opacity: currentPage >= Math.ceil(totalPosts / POSTS_PER_PAGE) ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (currentPage < Math.ceil(totalPosts / POSTS_PER_PAGE)) {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                    e.currentTarget.style.borderColor = theme.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage < Math.ceil(totalPosts / POSTS_PER_PAGE)) {
                    e.currentTarget.style.backgroundColor = theme.surface;
                    e.currentTarget.style.borderColor = theme.border;
                  }
                }}
              >
                <span>Următor</span>
                <ChevronRight size={isMobile ? 16 : 18} />
              </button>
            </div>
          )
        }

        {/* Page Info */}
        {
          !loading && posts.length > 0 && (
            <div style={{
              marginTop: isMobile ? '0.75rem' : '1rem',
              textAlign: 'center',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: theme.textSecondary
            }}>
              Afișând {posts.length} din {totalPosts} postări
            </div>
          )
        }
      </div >
    </ForumLayout >
  );
}
