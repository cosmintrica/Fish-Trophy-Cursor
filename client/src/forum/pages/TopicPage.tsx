import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, User } from 'lucide-react';
import { useTopic } from '../hooks/useTopics';
import { usePosts, useCreatePost } from '../hooks/usePosts';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import MessageContainer from '../components/MessageContainer';
import ActiveViewers from '../components/ActiveViewers';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { ForumTopic, ForumPost } from '../types/forum';

export default function TopicPage() {
  const { topicId } = useParams();
  const { forumUser } = useAuth();
  const page = 1; // Default to page 1 for now

  // Supabase hooks
  const { topic, loading: topicLoading, error: topicError } = useTopic(topicId || '');
  const { posts, loading: postsLoading, error: postsError, refetch: refetchPosts } = usePosts(topicId || '', 1, 50);
  const { create: createPost } = useCreatePost();

  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loading doar dacă încă se încarcă (nu avem erori)
  const loading = (topicLoading || postsLoading) && !topicError && !postsError;

  // Error handling
  useEffect(() => {
    if (topicError) console.error('Error loading topic:', topicError);
    if (postsError) console.error('Error loading posts:', postsError);
  }, [topicError, postsError]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim() || !forumUser || !topicId) {
      alert('Te rog să te conectezi și să scrii un răspuns!');
      return;
    }

    setIsSubmitting(true);

    try {
      const { success, error } = await createPost({
        topic_id: topicId,
        content: replyContent.trim()
      });

      if (!success) throw error;
      await refetchPosts(); // Reload real posts

      setReplyContent('');
      alert('Răspuns postat cu succes!');
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('A apărut o eroare la postarea răspunsului!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'acum';
    if (diffInMinutes < 60) return `acum ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `acum ${Math.floor(diffInMinutes / 60)}h`;
    return `acum ${Math.floor(diffInMinutes / 1440)}z`;
  };

  // Loading state
  if (loading) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎣</div>
            <div>Se încarcă topicul...</div>
          </div>
        </div>
      </ForumLayout>
    );
  }

  // Error state
  if (topicError || postsError) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
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
  if (!topic && !topicLoading && !postsLoading) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
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

  // Fallback - dacă topic e null dar nu suntem în loading
  if (!topic) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <div>Se încarcă...</div>
          </div>
        </div>
      </ForumLayout>
    );
  }

  // Obține slug-ul subcategoriei pentru link-uri
  const [subcategorySlug, setSubcategorySlug] = useState<string | null>(null);
  
  useEffect(() => {
    const getSubcategorySlug = async () => {
      if (!topic?.subcategory_id) return;
      
      const { data: subcategory } = await supabase
        .from('forum_subcategories')
        .select('slug')
        .eq('id', topic.subcategory_id)
        .single();
      
      if (subcategory?.slug) {
        setSubcategorySlug(subcategory.slug);
      }
    };
    
    if (topic) {
      getSubcategorySlug();
    }
  }, [topic]);

  return (
    <ForumLayout user={forumUser ? { id: forumUser.id, username: forumUser.username, email: '', isAdmin: false } as ForumUser : null} onLogin={() => { }} onLogout={() => { }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Breadcrumbs */}
        <nav style={{ marginBottom: '2rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <Link to="/forum" style={{ color: '#2563eb', textDecoration: 'none' }}>Forum</Link>
          <span style={{ margin: '0 0.5rem' }}>›</span>
          {subcategorySlug ? (
            <Link to={`/forum/category/${subcategorySlug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
              Subcategorie
            </Link>
          ) : (
            <span>Subcategorie</span>
          )}
          <span style={{ margin: '0 0.5rem' }}>›</span>
          <span>{topic.title}</span>
        </nav>

        {/* Topic Header */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            marginBottom: '1.5rem',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: 'white',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            {subcategorySlug ? (
              <Link
                to={`/forum/category/${subcategorySlug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  textDecoration: 'none',
                  transition: 'background-color 0.2s'
                }}
              >
                <ArrowLeft style={{ width: '1.25rem', height: '1.25rem' }} />
              </Link>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  textDecoration: 'none',
                  transition: 'background-color 0.2s'
                }}
              >
                <ArrowLeft style={{ width: '1.25rem', height: '1.25rem' }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', lineHeight: '1.3' }}>
                {topic.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {/* Author info might need to be fetched or passed from list */}
                <span>de <strong>{posts[0]?.author_username || 'Unknown'}</strong></span>
                {/* <span className={`user-rank rank-${topic.authorRank}`}>{topic.authorRank}</span> */}
                <span>•</span>
                <span>{formatTimeAgo(topic.created_at)}</span>
                <span>•</span>
                <span>{topic.view_count} vizualizări</span>
                <span>•</span>
                <span>{topic.reply_count} răspunsuri</span>
              </div>
            </div>
          </div>
        </div>

        {/* Posts List */}
        {posts.map((post, index) => (
          <MessageContainer
            key={post.id}
            post={{
              id: post.id,
              content: post.content,
              author: post.author_username || 'Unknown',
              authorId: (post as any).user_id, // ID-ul autorului pentru reputație (din forum_posts.user_id)
              authorRank: 'user', // Placeholder until rank is available
              authorAvatar: post.author_avatar,
              createdAt: post.created_at,
              likes: post.like_count || 0,
              dislikes: 0,
              respect: 0 // Placeholder
            }}
            isOriginalPost={index === 0 && page === 1}
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
          />
        ))}

        {/* Reply Form */}
        {forumUser ? (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: 'white',
                padding: '1rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <MessageSquare style={{ width: '1.125rem', height: '1.125rem' }} />
              Răspunde la acest topic
            </div>

            <form onSubmit={handleReplySubmit} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                {/* Avatar utilizator */}
                <div
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '600',
                    flexShrink: 0
                  }}
                >
                  {forumUser.username.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: '600', color: '#111827' }}>{forumUser.username}</span>
                    <span className={`user-rank rank-${forumUser.rank}`}>{forumUser.rank}</span>
                  </div>

                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Scrie răspunsul tău aici..."
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    required
                  />
                </div>
              </div>

              {/* Submit button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || !replyContent.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: isSubmitting || !replyContent.trim()
                      ? '#9ca3af'
                      : 'linear-gradient(135deg, #059669, #047857)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: isSubmitting || !replyContent.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div
                        style={{
                          width: '1rem',
                          height: '1rem',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}
                      />
                      Se postează...
                    </>
                  ) : (
                    <>
                      <Send style={{ width: '1rem', height: '1rem' }} />
                      Postează Răspuns
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              padding: '2rem',
              textAlign: 'center'
            }}
          >
            <User style={{ width: '3rem', height: '3rem', color: '#9ca3af', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              Conectează-te pentru a răspunde
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Pentru a posta răspunsuri și a interacționa cu comunitatea, te rog să te conectezi.
            </p>
            <button
              onClick={() => navigate('/forum')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Conectează-te
            </button>
          </div>
        )}

        {/* Active Viewers */}
        <ActiveViewers topicId={topicId || ''} />
      </div>
    </ForumLayout>
  );
}
