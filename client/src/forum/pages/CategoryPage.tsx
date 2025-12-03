import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Pin, Lock } from 'lucide-react';
import { useTopics } from '../hooks/useTopics';
import CreateTopicModal from '../components/CreateTopicModal';
import ActiveViewers from '../components/ActiveViewers';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function CategoryPage() {
  // Acceptă atât /category/:id (legacy) cât și /:subcategorySlug (clean)
  const { id: categoryId, subcategorySlug } = useParams<{ id?: string; subcategorySlug?: string }>();
  const { forumUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Folosește subcategorySlug dacă există, altfel categoryId (legacy)
  const slugToUse = subcategorySlug || categoryId;

  // Obține ID-ul subcategoriei din slug
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);

  useEffect(() => {
    const getSubcategoryId = async () => {
      if (!slugToUse) {
        // No slug provided
        setSubcategoryId(null);
        return;
      }

      // Looking for subcategory with slug

      // Caută DOAR după slug (nu mai folosim UUID)
      // Încearcă mai întâi cu exact match (cel mai rapid și sigur)
      const { data: subcategoryExact, error: exactError } = await supabase
        .from('forum_subcategories')
        .select('id, slug, name')
        .eq('slug', slugToUse)
        .eq('is_active', true)
        .single();

      if (exactError) {
        // Exact match failed, trying ilike

        // Dacă exact match nu funcționează, încercă cu ilike (case-insensitive)
        const { data: subcategoryIlike, error: ilikeError } = await supabase
          .from('forum_subcategories')
          .select('id, slug, name')
          .ilike('slug', slugToUse)
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
  }, [slugToUse]);

  // Supabase hooks - folosește subcategoryId (UUID) pentru query (intern folosim UUID, extern slug)
  const { topics, loading: supabaseLoading, error: topicsError, refetch: refetchTopics } = useTopics(subcategoryId || '', 1, 50);

  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryDescription, setSubcategoryDescription] = useState('');
  const [parentCategoryName, setParentCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll la top când se încarcă pagina (previne scroll-ul automat jos)
  useEffect(() => {
    // Scroll instant la top când se schimbă ruta
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Asigură-te că rămâne la top după ce se încarcă totul
    const ensureTop = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 100);

    return () => clearTimeout(ensureTop);
  }, [location.pathname]);

  // Load subcategory by slug și categoria părinte
  useEffect(() => {
    const loadHierarchy = async () => {
      if (!slugToUse || slugToUse.trim() === '') {
        setSubcategoryName('');
        setSubcategoryDescription('');
        setParentCategoryName('');
        return;
      }

      try {
        // Caută subcategoria după slug - exact match mai întâi
        const { data: subcategory, error: subError } = await supabase
          .from('forum_subcategories')
          .select('id, name, description, slug, category_id')
          .eq('slug', slugToUse)
          .eq('is_active', true)
          .maybeSingle();

        if (subError) {
          console.error('CategoryPage: Error loading subcategory name:', subError);
        }

        if (subcategory) {
          setSubcategoryName(subcategory.name);
          setSubcategoryDescription(subcategory.description || '');

          // Obține categoria părinte
          if (subcategory.category_id) {
            setParentCategoryId(subcategory.category_id);
            const { data: parentCategory } = await supabase
              .from('forum_categories')
              .select('name, slug')
              .eq('id', subcategory.category_id)
              .maybeSingle();

            if (parentCategory) {
              setParentCategoryName(parentCategory.name);
            }
          }
          return;
        }

        // Fallback la ilike dacă exact match nu funcționează
        const { data: subcategoryIlike, error: ilikeError } = await supabase
          .from('forum_subcategories')
          .select('id, name, description, slug, category_id')
          .ilike('slug', slugToUse)
          .eq('is_active', true)
          .maybeSingle();

        if (ilikeError) {
          console.error('CategoryPage: Error with ilike:', ilikeError);
        }

        if (subcategoryIlike) {
          setSubcategoryName(subcategoryIlike.name);
          setSubcategoryDescription(subcategoryIlike.description || '');

          // Obține categoria părinte
          if (subcategoryIlike.category_id) {
            setParentCategoryId(subcategoryIlike.category_id);
            const { data: parentCategory } = await supabase
              .from('forum_categories')
              .select('name, slug')
              .eq('id', subcategoryIlike.category_id)
              .maybeSingle();

            if (parentCategory) {
              setParentCategoryName(parentCategory.name);
            }
          }
          return;
        }

        // Nu s-a găsit nimic
        setSubcategoryName('');
        setSubcategoryDescription('');
        setParentCategoryName('');
        setParentCategoryId(null);
      } catch (error) {
        console.error('Error loading hierarchy:', error);
        setSubcategoryName('');
        setSubcategoryDescription('');
        setParentCategoryName('');
        setParentCategoryId(null);
      }
    };

    loadHierarchy();
  }, [slugToUse]);

  const handleTopicClick = (topic: { id: string; slug?: string }) => {
    const topicSlug = topic.slug || topic.id;
    const subcategorySlugToUse = slugToUse || 'unknown';
    // URL clean: /forum/subcategorySlug/topicSlug
    navigate(`/forum/${subcategorySlugToUse}/${topicSlug}`);
  };

  const handleTopicCreated = () => {
    // Refetch topics instead of reloading the page
    refetchTopics();
    setShowCreateModal(false);
  };

  // Verifică dacă slugToUse există (poate fi subcategorySlug sau categoryId)
  if (!slugToUse) {
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

  // Nu afișăm "not found" - lăsăm datele să se încarce în background
  // Verificare doar dacă există o eroare explicită
  if (topicsError && topicsError.message.includes('not found')) {
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0.5rem' : '1rem 0.75rem', width: '100%', overflowX: 'hidden' }}>
        {/* Breadcrumbs: FishTrophy › Categorie › SubCategorie - Toate linkuri funcționale */}
        <nav style={{
          marginBottom: isMobile ? '0.75rem' : '1.5rem',
          fontSize: isMobile ? '0.75rem' : '0.875rem',
          color: '#6b7280',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          paddingBottom: '0.25rem'
        }}>
          <Link to="/forum" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>FishTrophy</Link>
          {parentCategoryName && parentCategoryId && (
            <>
              <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>
              <Link
                to={`/forum#category-${parentCategoryId}`}
                style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
                onClick={(e) => {
                  // Scroll la categorie pe homepage
                  e.preventDefault();
                  navigate('/forum');
                  setTimeout(() => {
                    const element = document.getElementById(`category-${parentCategoryId}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }}
              >
                {parentCategoryName}
              </Link>
            </>
          )}
          {subcategoryName && (
            <>
              <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>
              <span style={{ color: '#6b7280', fontWeight: '500' }}>{subcategoryName}</span>
            </>
          )}
        </nav>

        {/* Header categorie - Compact pentru mobil */}
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
              padding: isMobile ? '0.75rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.5rem' : '1rem'
            }}
          >
            <Link
              to="/forum"
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
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ fontSize: isMobile ? '1rem' : '1.5rem', fontWeight: '600', marginBottom: '0.125rem', lineHeight: '1.2' }}>
                {subcategoryName || '\u00A0'}
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: isMobile ? '0.75rem' : '0.875rem', lineHeight: '1.3' }}>
                {subcategoryDescription || 'Discuții și postări despre pescuit'}
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
          {/* Header pentru topicuri - Optimizat pentru mobil */}
          <div className="hidden sm:grid" style={{
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            padding: '0.75rem 1rem',
            gridTemplateColumns: '1fr 80px 80px 180px',
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
                  className="topic-item"
                  style={{
                    padding: isMobile ? '0.5rem' : '0.75rem',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? '0.5rem' : '0.75rem',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => handleTopicClick(topic)}
                >
                  {/* Topic info - Layout diferit pe mobil */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: 0, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem', flexShrink: 0 }}>
                      {topic.is_pinned && <Pin style={{ width: isMobile ? '0.875rem' : '1rem', height: isMobile ? '0.875rem' : '1rem', color: '#f59e0b' }} />}
                      {topic.is_locked && <Lock style={{ width: isMobile ? '0.875rem' : '1rem', height: isMobile ? '0.875rem' : '1rem', color: '#6b7280' }} />}
                      <MessageSquare style={{ width: isMobile ? '0.875rem' : '1rem', height: isMobile ? '0.875rem' : '1rem', color: topic.is_pinned ? '#f59e0b' : '#2563eb' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: isMobile ? '0.8125rem' : '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem', lineHeight: '1.3', wordBreak: 'break-word' }}>
                        {topic.title}
                      </h3>
                      <div style={{ fontSize: isMobile ? '0.6875rem' : '0.75rem', color: '#6b7280', marginBottom: isMobile ? '0.25rem' : '0.5rem' }}>
                        de <span style={{ color: '#2563eb', fontWeight: '600' }}>{topic.author_username || 'Unknown'}</span>
                      </div>
                      {/* Statistici pe mobil - sub titlu */}
                      <div className="sm:hidden" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        <span>💬 {topic.reply_count}</span>
                        <span>👁️ {topic.view_count.toLocaleString('ro-RO')}</span>
                        {topic.last_post_at && (
                          <span>{new Date(topic.last_post_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Răspunsuri - Ascuns pe mobil */}
                  <div className="hidden sm:flex" style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#059669',
                    minHeight: '2rem'
                  }}>
                    {topic.reply_count}
                  </div>

                  {/* Vizualizări - Ascuns pe mobil */}
                  <div className="hidden sm:flex" style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    minHeight: '2rem'
                  }}>
                    {topic.view_count.toLocaleString('ro-RO')}
                  </div>

                  {/* Ultima postare - Ascuns pe mobil */}
                  <div className="hidden sm:flex" style={{
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

        {/* Create Topic Modal - Fixed to use slugToUse for both legacy and clean URLs */}
        {forumUser && (
          <CreateTopicModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            categoryId={slugToUse || ''}
            categoryName={subcategoryName}
            user={{
              username: forumUser.username,
              rank: forumUser.rank
            }}
            onTopicCreated={handleTopicCreated}
          />
        )}

        {/* Active Viewers */}
        <ActiveViewers subcategoryId={subcategoryId || categoryId || ''} />
      </div>
    </ForumLayout>
  );
}
