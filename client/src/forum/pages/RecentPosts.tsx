import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Clock, TrendingUp, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrefetch } from '../hooks/usePrefetch';
import { parseBBCode } from '../../services/forum/bbcode';
import { RecentPostListSkeleton } from '../../components/skeletons/RecentPostSkeleton';

export default function RecentPosts() {
  const { forumUser } = useAuth();
  const { theme } = useTheme();
  const { prefetchTopic } = usePrefetch();
  const navigate = useNavigate();
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

  const POSTS_PER_PAGE = 30;

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
            topic:forum_topics!topic_id(id, title, subcategory_id, slug)
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

        const { data: subcategoriesData } = await supabase
          .from('forum_subcategories')
          .select('id, slug, category_id')
          .in('id', subcategoryIds);

        const subcategoriesMap = new Map((subcategoriesData || []).map(sc => [sc.id, sc]));

        const categoryIds = [...new Set((subcategoriesData || []).map(sc => sc.category_id).filter(Boolean))];
        const { data: categoriesData } = await supabase
          .from('forum_categories')
          .select('id, slug')
          .in('id', categoryIds);

        const categoriesMap = new Map((categoriesData || []).map(c => [c.id, c]));

        // Combine data
        const data = (postsData || []).map(post => {
          const topic = Array.isArray(post.topic) ? post.topic[0] : post.topic;
          const subcategory = topic?.subcategory_id ? subcategoriesMap.get(topic.subcategory_id) : null;
          const category = subcategory?.category_id ? categoriesMap.get(subcategory.category_id) : null;
          const forumUser = forumUsersMap.get(post.user_id);
          const profile = profilesMap.get(post.user_id);

          // Use photo_url from profiles (real profile picture) or avatar_url from forum_users as fallback
          const photoUrl = profile?.photo_url || forumUser?.avatar_url || null;
          const username = forumUser?.username || 'Anonim';

          return {
            ...post,
            topic: topic,
            author: {
              username: username,
              photo_url: photoUrl,
              avatar_url: forumUser?.avatar_url || null
            },
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
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #10b981, #047857)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #ef4444, #dc2626)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #06b6d4, #0891b2)'
    ];
    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isMobile ? '0.75rem 0.75rem' : '1rem 1rem',
        width: '100%',
        overflowX: 'hidden'
      }}>
        <h1 style={{
          fontSize: isMobile ? '1.25rem' : '1.75rem',
          fontWeight: '700',
          color: theme.text,
          marginBottom: isMobile ? '1rem' : '1.5rem'
        }}>
          📝 Postări Recente
        </h1>

        {loading ? (
          <RecentPostListSkeleton count={POSTS_PER_PAGE} />
        ) : posts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '2rem 1rem' : '4rem',
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
            <div style={{ color: theme.textSecondary }}>Nu există postări recente</div>
          </div>
        ) : (
          <div
            ref={postsContainerRef}
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: isMobile ? '0.5rem' : '0.75rem'
            }}
          >
            {posts.map((post) => {
              const topic = Array.isArray(post.topic) ? post.topic[0] : post.topic;
              // Construiește permalink complet: /forum/subcategorySlug/topicSlug#postN (FĂRĂ categorySlug)
              let topicLink = '';
              if (post.subcategorySlug && topic?.slug) {
                // URL simplificat: doar subcategorie și topic
                topicLink = `/forum/${post.subcategorySlug}/${topic.slug}${post.post_number ? `#post${post.post_number}` : ''}`;
              } else if (topic?.slug) {
                // Fallback: doar topic slug
                topicLink = `/forum/topic/${topic.slug}${post.post_number ? `#post${post.post_number}` : ''}`;
              } else {
                // Fallback final: topic ID
                topicLink = `/forum/topic/${topic?.id || post.topic_id}${post.post_number ? `#post${post.post_number}` : ''}`;
              }

              return (
                <div
                  key={post.id}
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: isMobile ? '0.375rem' : '0.5rem',
                    border: `1px solid ${theme.border}`,
                    padding: isMobile ? '0.5rem' : '0.75rem',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: isMobile ? '100px' : '120px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.primary;
                    e.currentTarget.style.boxShadow = `0 2px 4px rgba(0, 0, 0, 0.1)`;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    // Prefetch topic-ul când utilizatorul trece cu mouse-ul
                    if (topic?.slug) {
                      prefetchTopic(topic.slug, post.subcategorySlug || undefined);
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Permanent Link - Top Right Corner */}
                  {post.post_number && (
                    <Link
                      to={topicLink}
                      onClick={(e) => {
                        e.stopPropagation();
                        const hash = `#post${post.post_number}`;
                        setTimeout(() => {
                          const element = document.getElementById(`post${post.post_number}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }, 100);
                      }}
                      style={{
                        position: 'absolute',
                        top: isMobile ? '0.375rem' : '0.5rem',
                        right: isMobile ? '0.375rem' : '0.5rem',
                        fontSize: isMobile ? '0.625rem' : '0.75rem',
                        color: theme.textSecondary,
                        textDecoration: 'none',
                        padding: isMobile ? '0.125rem 0.375rem' : '0.25rem 0.5rem',
                        backgroundColor: theme.background,
                        borderRadius: '0.25rem',
                        border: `1px solid ${theme.border}`,
                        zIndex: 10,
                        transition: 'all 0.2s',
                        fontWeight: '500',
                        lineHeight: '1.2'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = theme.primary;
                        e.currentTarget.style.borderColor = theme.primary;
                        e.currentTarget.style.backgroundColor = theme.surface;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = theme.textSecondary;
                        e.currentTarget.style.borderColor = theme.border;
                        e.currentTarget.style.backgroundColor = theme.background;
                      }}
                      title={`Post #${post.post_number}`}
                    >
                      #{post.post_number}
                    </Link>
                  )}

                  {/* Compact Header: Avatar + Username + Date */}
                  <div style={{
                    display: 'flex',
                    gap: isMobile ? '0.375rem' : '0.5rem',
                    marginBottom: isMobile ? '0.375rem' : '0.5rem',
                    alignItems: 'flex-start',
                    paddingRight: post.post_number ? (isMobile ? '2.5rem' : '3rem') : '0'
                  }}>
                    {/* Avatar - Real profile picture - Smaller */}
                    <div style={{
                      width: isMobile ? '1.75rem' : '2rem',
                      height: isMobile ? '1.75rem' : '2rem',
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
                      fontSize: isMobile ? '0.6875rem' : '0.75rem',
                      fontWeight: '600',
                      flexShrink: 0,
                      border: `1.5px solid ${theme.border}`
                    }}>
                      {!post.author?.photo_url && !post.author?.avatar_url &&
                        (post.author?.username?.charAt(0).toUpperCase() || '?')}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Username + Date in one line */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '0.25rem' : '0.375rem',
                        marginBottom: isMobile ? '0.125rem' : '0.25rem',
                        flexWrap: 'wrap'
                      }}>
                        <Link
                          to={`/forum/user/${post.author?.username || 'unknown'}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontWeight: '600',
                            color: theme.text,
                            fontSize: isMobile ? '0.75rem' : '0.8125rem',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = theme.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = theme.text;
                          }}
                        >
                          {post.author?.username || 'Anonim'}
                        </Link>
                        <span style={{
                          fontSize: isMobile ? '0.625rem' : '0.6875rem',
                          color: theme.textSecondary
                        }}>
                          •
                        </span>
                        <span style={{
                          fontSize: isMobile ? '0.625rem' : '0.6875rem',
                          color: theme.textSecondary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.125rem',
                          whiteSpace: 'nowrap'
                        }}>
                          <Clock size={isMobile ? 9 : 10} />
                          {formatSmartDateTime(post.created_at)}
                        </span>
                      </div>

                      {/* Category and Topic link - Compact */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.125rem',
                        marginBottom: isMobile ? '0.25rem' : '0.375rem'
                      }}>
                        {/* Category link - redirecționează la homepage (categoriile nu mai au URL-uri separate) */}
                        {post.categoryName && (
                          <Link
                            to="/forum"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: isMobile ? '0.625rem' : '0.6875rem',
                              color: theme.textSecondary,
                              textDecoration: 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = 'underline';
                              e.currentTarget.style.color = theme.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = 'none';
                              e.currentTarget.style.color = theme.textSecondary;
                            }}
                          >
                            {post.categoryName}
                          </Link>
                        )}
                        {/* Topic link */}
                        {topic && (
                          <Link
                            to={topicLink}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: isMobile ? '0.6875rem' : '0.75rem',
                              color: theme.primary,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.125rem',
                              textDecoration: 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = 'underline';
                              // Prefetch topic-ul când utilizatorul trece cu mouse-ul
                              if (topic?.slug) {
                                prefetchTopic(topic.slug, post.subcategorySlug || undefined);
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = 'none';
                            }}
                          >
                            <MessageSquare size={isMobile ? 9 : 10} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {topic.title}
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Post content - Compact, max 2 lines */}
                  <div
                    style={{
                      color: theme.text,
                      fontSize: isMobile ? '0.75rem' : '0.8125rem',
                      lineHeight: '1.4',
                      maxHeight: isMobile ? '2.25rem' : '2.75rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      flex: 1
                    }}
                    onClick={(e) => {
                      // Navigate to topic when clicking content
                      e.preventDefault();
                      window.location.href = topicLink;
                    }}
                    dangerouslySetInnerHTML={{
                      __html: parseBBCode(post.content || '', {
                        subcategorySlug: post.subcategorySlug,
                        topicSlug: topic?.slug,
                        getPostPermalink: (postId: string) => {
                          // Find post number from posts array
                          const foundPost = posts.find(p => p.id === postId);
                          if (foundPost && post.subcategorySlug && topic?.slug) {
                            return `/forum/${post.subcategorySlug}/${topic.slug}${foundPost.post_number ? `#post${foundPost.post_number}` : ''}`;
                          }
                          return `/forum/post/${postId}`;
                        }
                      }).html
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Statistics Section - Bottom */}
        {!loading && posts.length > 0 && (
          <div style={{
            marginTop: isMobile ? '1.5rem' : '2rem',
            padding: isMobile ? '1rem' : '1.5rem',
            backgroundColor: theme.surface,
            borderRadius: isMobile ? '0.5rem' : '0.75rem',
            border: `1px solid ${theme.border}`
          }}>
            <h2 style={{
              fontSize: isMobile ? '1rem' : '1.25rem',
              fontWeight: '600',
              color: theme.text,
              marginBottom: isMobile ? '1rem' : '1.5rem'
            }}>
              📊 Statistici Postări Recente
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? '0.75rem' : '1rem'
            }}>
              {/* Total Postări Afișate */}
              <div style={{
                textAlign: 'center',
                padding: isMobile ? '0.75rem' : '1rem',
                backgroundColor: theme.background,
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  color: theme.textSecondary,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}>
                  <MessageSquare size={isMobile ? 14 : 16} />
                  <span>Total Afișate</span>
                </div>
                <div style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '700',
                  color: theme.text
                }}>
                  {posts.length}
                </div>
              </div>

              {/* Postări Astăzi */}
              <div style={{
                textAlign: 'center',
                padding: isMobile ? '0.75rem' : '1rem',
                backgroundColor: theme.background,
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  color: theme.textSecondary,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}>
                  <Clock size={isMobile ? 14 : 16} />
                  <span>Astăzi</span>
                </div>
                <div style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '700',
                  color: theme.primary
                }}>
                  {stats.postsToday}
                </div>
              </div>

              {/* Postări Săptămâna Aceasta */}
              <div style={{
                textAlign: 'center',
                padding: isMobile ? '0.75rem' : '1rem',
                backgroundColor: theme.background,
                borderRadius: '0.5rem'
              }}>
                <div style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  color: theme.textSecondary,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}>
                  <TrendingUp size={isMobile ? 14 : 16} />
                  <span>Săptămâna</span>
                </div>
                <div style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '700',
                  color: theme.secondary
                }}>
                  {stats.postsThisWeek}
                </div>
              </div>

              {/* Cel Mai Activ Utilizator */}
              {stats.mostActiveUser && (
                <div style={{
                  textAlign: 'center',
                  padding: isMobile ? '0.75rem' : '1rem',
                  backgroundColor: theme.background,
                  borderRadius: '0.5rem'
                }}>
                  <div style={{
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    color: theme.textSecondary,
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem'
                  }}>
                    <Users size={isMobile ? 14 : 16} />
                    <span>Cel Mai Activ</span>
                  </div>
                  <Link
                    to={`/forum/user/${stats.mostActiveUser.username}`}
                    style={{
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      fontWeight: '600',
                      color: theme.primary,
                      textDecoration: 'none',
                      display: 'block'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {stats.mostActiveUser.username}
                  </Link>
                  <div style={{
                    fontSize: isMobile ? '0.6875rem' : '0.75rem',
                    color: theme.textSecondary,
                    marginTop: '0.25rem'
                  }}>
                    {stats.mostActiveUser.count} postări
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Pagination */}
        {!loading && posts.length > 0 && totalPosts > POSTS_PER_PAGE && (
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
        )}

        {/* Page Info */}
        {!loading && posts.length > 0 && (
          <div style={{
            marginTop: isMobile ? '0.75rem' : '1rem',
            textAlign: 'center',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            color: theme.textSecondary
          }}>
            Afișând {posts.length} din {totalPosts} postări
          </div>
        )}
      </div>
    </ForumLayout>
  );
}
