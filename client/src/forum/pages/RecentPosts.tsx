import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Clock, User } from 'lucide-react';

export default function RecentPosts() {
  const { forumUser } = useAuth();
  const { theme } = useTheme();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentPosts = async () => {
      setLoading(true);
      try {
        // forum_posts.user_id references auth.users, not forum_users
        // Need to join through forum_users separately
        const { data: postsData, error: postsError } = await supabase
          .from('forum_posts')
          .select(`
            id,
            content,
            created_at,
            user_id,
            topic_id,
            topic:forum_topics!topic_id(id, title, subcategory_id, slug)
          `)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(50);

        if (postsError) throw postsError;

        // Get user info separately
        const userIds = [...new Set((postsData || []).map(p => p.user_id))];
        const { data: usersData } = await supabase
          .from('forum_users')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const usersMap = new Map((usersData || []).map(u => [u.user_id, u]));

        const data = (postsData || []).map(post => ({
          ...post,
          author: usersMap.get(post.user_id) || { username: 'Unknown', avatar_url: null }
        }));

        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error('Error loading recent posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentPosts();
  }, []);

  return (
    <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: theme.text, marginBottom: '2rem' }}>
          📝 Postări Recente
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎣</div>
            <div>Se încarcă postările...</div>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: theme.surface, borderRadius: '0.5rem', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
            <div style={{ color: theme.textSecondary }}>Nu există postări recente</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {posts.map((post) => (
              <div
                key={post.id}
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: '0.5rem',
                  border: `1px solid ${theme.border}`,
                  padding: '1.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.primary;
                  e.currentTarget.style.boxShadow = `0 4px 6px rgba(0, 0, 0, 0.1)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    backgroundColor: theme.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {post.author?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '600', color: theme.text }}>{post.author?.username || 'Anonim'}</span>
                      <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                        <Clock style={{ width: '0.75rem', height: '0.75rem', display: 'inline', marginRight: '0.25rem' }} />
                        {new Date(post.created_at).toLocaleString('ro-RO')}
                      </span>
                    </div>
                    {post.topic && (
                      <Link
                        to={`/forum/topic/${post.topic.slug || post.topic.id}`}
                        style={{
                          color: theme.primary,
                          textDecoration: 'none',
                          fontWeight: '500',
                          fontSize: '0.875rem'
                        }}
                      >
                        <MessageSquare style={{ width: '0.875rem', height: '0.875rem', display: 'inline', marginRight: '0.25rem' }} />
                        {post.topic.title}
                      </Link>
                    )}
                  </div>
                </div>
                <div style={{
                  color: theme.text,
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  maxHeight: '4.5rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {post.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ForumLayout>
  );
}

