import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Pin, Lock } from 'lucide-react';
import { useTopics } from '../hooks/useTopics';
import CreateTopicModal from '../components/CreateTopicModal';
import ActiveViewers from '../components/ActiveViewers';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function CategoryPage() {
  const { id: categoryId } = useParams<{ id: string }>();
  const { forumUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // categoryId from params

  // Obține ID-ul subcategoriei din slug
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  
  useEffect(() => {
    const getSubcategoryId = async () => {
      if (!categoryId) {
        // No categoryId provided
        setSubcategoryId(null);
        return;
      }
      
      // Looking for subcategory with slug
      
      // Caută DOAR după slug (nu mai folosim UUID)
      // Încearcă mai întâi cu exact match (cel mai rapid și sigur)
      const { data: subcategoryExact, error: exactError } = await supabase
        .from('forum_subcategories')
        .select('id, slug, name')
        .eq('slug', categoryId)
        .eq('is_active', true)
        .single();
      
      if (exactError) {
        // Exact match failed, trying ilike
        
        // Dacă exact match nu funcționează, încercă cu ilike (case-insensitive)
        const { data: subcategoryIlike, error: ilikeError } = await supabase
          .from('forum_subcategories')
          .select('id, slug, name')
          .ilike('slug', categoryId)
          .eq('is_active', true)
          .maybeSingle(); // Folosim maybeSingle în loc de single pentru a evita erori
        
        if (ilikeError) {
          console.error('CategoryPage: ilike match also failed:', ilikeError);
          setSubcategoryId(null);
        } else if (subcategoryIlike) {
          // Found subcategory with ilike
          setSubcategoryId(subcategoryIlike.id);
        } else {
          // No subcategory found with slug
          setSubcategoryId(null);
        }
      } else if (subcategoryExact) {
        // Found subcategory with exact match
        setSubcategoryId(subcategoryExact.id);
      } else {
        // No subcategory found
        setSubcategoryId(null);
      }
    };
    
    getSubcategoryId();
  }, [categoryId]);
  
  // Supabase hooks - folosește subcategoryId (UUID) pentru query (intern folosim UUID, extern slug)
  const { topics, loading: supabaseLoading, error: topicsError, refetch: refetchTopics } = useTopics(subcategoryId || '', 1, 50);

  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingName, setLoadingName] = useState(true);

  // Load subcategory by slug (categoryId este de fapt slug-ul)
  useEffect(() => {
    const loadSubcategoryName = async () => {
      if (!categoryId || categoryId.trim() === '') {
        setLoadingName(false);
        setCategoryName('');
        setCategoryDescription('');
        return;
      }
      
      setLoadingName(true);
      try {
        // Loading name for slug
        
        // Caută subcategoria după slug - exact match mai întâi
        const { data: subcategory, error: subError } = await supabase
          .from('forum_subcategories')
          .select('id, name, description, slug')
          .eq('slug', categoryId)
          .eq('is_active', true)
          .maybeSingle(); // Folosim maybeSingle pentru a evita erori când nu găsește
        
        if (subError) {
          console.error('CategoryPage: Error loading subcategory name:', subError);
        }
        
        if (subcategory) {
          // Found subcategory
          setCategoryName(subcategory.name);
          setCategoryDescription(subcategory.description || '');
          setLoadingName(false);
          return;
        }
        
        // Fallback la ilike dacă exact match nu funcționează
        // Trying ilike match
        const { data: subcategoryIlike, error: ilikeError } = await supabase
          .from('forum_subcategories')
          .select('id, name, description, slug')
          .ilike('slug', categoryId)
          .eq('is_active', true)
          .maybeSingle();
        
        if (ilikeError) {
          console.error('CategoryPage: Error with ilike:', ilikeError);
        }
        
        if (subcategoryIlike) {
          // Found subcategory with ilike
          setCategoryName(subcategoryIlike.name);
          setCategoryDescription(subcategoryIlike.description || '');
          setLoadingName(false);
          return;
        }

        // Nu mai folosim fallback la UUID - doar slug-uri

        // Fallback: încercă categoria
        const { data: category, error: catError } = await supabase
          .from('forum_categories')
          .select('id, name, description')
          .eq('id', categoryId)
          .eq('is_active', true)
          .single();

        if (!catError && category) {
          setCategoryName(category.name);
          setCategoryDescription(category.description || '');
          setLoadingName(false);
          return;
        }

        // Nu s-a găsit nimic
        setCategoryName('');
        setCategoryDescription('');
        setLoadingName(false);
      } catch (error) {
        console.error('Error loading category name:', error);
        setCategoryName('');
        setCategoryDescription('');
        setLoadingName(false);
      }
    };

    loadSubcategoryName();
  }, [categoryId]);

  const handleTopicClick = (topic: { id: string; slug?: string }) => {
    const topicIdentifier = topic.slug || topic.id;
    navigate(`/forum/topic/${topicIdentifier}`);
  };

  const handleTopicCreated = () => {
    // Refetch topics instead of reloading the page
    refetchTopics();
    setShowCreateModal(false);
  };

  // Verifică dacă categoryId există
  if (!categoryId) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: theme.surface, borderRadius: '1rem', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
            <div style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Categorie lipsă!</div>
            <div style={{ color: theme.textSecondary, marginBottom: '1rem' }}>Categoria pe care o cauți nu există.</div>
            <Link to="/forum" style={{ color: theme.primary, textDecoration: 'none', marginTop: '1rem', display: 'inline-block' }}>
              ← Înapoi la forum
            </Link>
          </div>
        </div>
      </ForumLayout>
    );
  }
  
  // Dacă nu s-a găsit subcategoria (verificăm după un mic delay pentru a permite query-ului să se execute)
  // Folosim un timeout pentru a evita false positives
  const [showNotFound, setShowNotFound] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loadingName && !supabaseLoading && !categoryName && !topicsError && categoryId) {
        setShowNotFound(true);
      } else {
        setShowNotFound(false);
      }
    }, 500); // Așteaptă 500ms înainte de a afișa "not found"
    
    return () => clearTimeout(timer);
  }, [loadingName, supabaseLoading, categoryName, topicsError, categoryId]);
  
  if (showNotFound && !categoryName && !topicsError) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: theme.surface, borderRadius: '1rem', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
            <div style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Categorie nu a fost găsită!</div>
            <div style={{ color: theme.textSecondary, marginBottom: '1rem' }}>Categoria pe care o cauți nu există sau a fost ștearsă.</div>
            <Link to="/forum" style={{ color: theme.primary, textDecoration: 'none', marginTop: '1rem', display: 'inline-block' }}>
              ← Înapoi la forum
            </Link>
          </div>
        </div>
      </ForumLayout>
    );
  }

  // Nu mai afișăm loading - afișăm conținutul instant, datele se încarcă în background

  if (topicsError) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ color: '#dc2626', marginBottom: '1rem' }}>Eroare la încărcarea topicurilor</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>{topicsError.message}</div>
            <button
              onClick={() => navigate('/forum')}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Înapoi la Forum
            </button>
          </div>
        </div>
      </ForumLayout>
    );
  }

  return (
    <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Breadcrumbs */}
        <nav style={{ marginBottom: '2rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <Link to="/forum" style={{ color: '#2563eb', textDecoration: 'none' }}>Forum</Link>
          <span style={{ margin: '0 0.5rem' }}>›</span>
          <span>{categoryName}</span>
        </nav>

        {/* Header categorie */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            marginBottom: '2rem',
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
            <Link
              to="/forum"
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
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                {categoryName}
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                {categoryDescription || 'Discuții și postări despre pescuit'}
              </p>
            </div>
          </div>
        </div>

        {/* Lista topicuri */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}
        >
          {/* Header pentru topicuri */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            padding: '0.75rem 1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 100px 100px 220px',
            gap: '0.75rem',
            alignItems: 'center',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.025em'
          }}>
            <div>Topic</div>
            <div style={{ textAlign: 'center' }}>Răspunsuri</div>
            <div style={{ textAlign: 'center' }}>Vizualizări</div>
            <div style={{ textAlign: 'center' }}>Ultima postare</div>
          </div>

          {/* Topicuri */}
          <div>
            {topics.length === 0 ? (
              <div style={{ 
                padding: '4rem 2rem', 
                textAlign: 'center', 
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                margin: '1rem'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#111827' }}>
                  Niciun topic încă în această categorie
                </div>
                <div style={{ fontSize: '0.875rem', marginBottom: '1.5rem', color: '#6b7280' }}>
                  Fii primul care creează un topic și pornește o discuție!
                </div>
                <button
                  onClick={() => {
                    if (forumUser) {
                      setShowCreateModal(true);
                    } else {
                      alert('Te rog să te conectezi pentru a crea un topic!');
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderRadius: '0.75rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8, #4338ca)';
                    e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #4f46e5)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                  Creează primul topic
                </button>
              </div>
            ) : (
              topics.map((topic) => (
              <div
                key={topic.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 100px 220px',
                  gap: '0.75rem',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => handleTopicClick(topic)}
              >
                {/* Topic info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }}>
                    {topic.is_pinned && <Pin style={{ width: '1rem', height: '1rem', color: '#f59e0b' }} />}
                    {topic.is_locked && <Lock style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />}
                    <MessageSquare style={{ width: '1rem', height: '1rem', color: topic.is_pinned ? '#f59e0b' : '#2563eb' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem', lineHeight: '1.3' }}>
                      {topic.title}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      de <span style={{ color: '#2563eb', fontWeight: '600' }}>{topic.author_username || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Răspunsuri - perfect centrat */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#059669',
                  minHeight: '2rem'
                }}>
                  {topic.reply_count}
                </div>

                {/* Vizualizări - perfect centrat */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  minHeight: '2rem'
                }}>
                  {topic.view_count.toLocaleString('ro-RO')}
                </div>

                {/* Ultima postare - perfect centrat */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  minHeight: '2rem'
                }}>
                  <div style={{ fontWeight: '500', marginBottom: '0.125rem' }}>
                    {topic.last_post_at ? new Date(topic.last_post_at).toLocaleDateString('ro-RO') : '-'}
                  </div>
                  <div>
                    {/* Last post author not available in basic fetch, showing generic */}
                  </div>
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* Buton creare topic nou */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8, #4338ca)';
              e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #4f46e5)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
            onClick={() => {
              if (forumUser) {
                setShowCreateModal(true);
              } else {
                alert('Te rog să te conectezi pentru a crea un topic!');
              }
            }}
          >
            <MessageSquare style={{ width: '1rem', height: '1rem' }} />
            Creează Topic Nou
          </button>
        </div>

        {/* Create Topic Modal */}
        {forumUser && (
          <CreateTopicModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            categoryId={categoryId || ''}
            categoryName={categoryName}
            user={{
              username: forumUser.username,
              rank: forumUser.rank
            }}
            onTopicCreated={handleTopicCreated}
          />
        )}

        {/* Active Viewers */}
        <ActiveViewers subcategoryId={categoryId} />
      </div>
    </ForumLayout>
  );
}
