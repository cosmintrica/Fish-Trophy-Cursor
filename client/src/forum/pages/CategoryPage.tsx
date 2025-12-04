import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Pin, Lock } from 'lucide-react';
import { useTopics } from '../hooks/useTopics';
import CreateTopicModal from '../components/CreateTopicModal';
import ActiveViewers from '../components/ActiveViewers';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import ReadStatusMarker from '../components/ReadStatusMarker';
import { useMultipleTopicsReadStatus, useMultipleSubcategoriesUnreadStatus } from '../hooks/useTopicReadStatus';
import { usePrefetch } from '../hooks/usePrefetch';

export default function CategoryPage() {
  // Acceptă:
  // - /:categorySlug (categorie)
  // - /:categorySlug/:subcategorySlug (subcategorie)
  // - /category/:id (legacy)
  // - /:subcategorySlug (legacy - pentru compatibilitate)
  const { id: categoryIdFromParams, categorySlug, subcategorySlug } = useParams<{ 
    id?: string; 
    categorySlug?: string; 
    subcategorySlug?: string;
  }>();
  const { forumUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Determină dacă e categorie sau subcategorie
  // Dacă avem categorySlug și subcategorySlug → subcategorie
  // Dacă avem doar categorySlug → categorie
  // Dacă avem doar subcategorySlug (legacy) → subcategorie
  const isSubcategory = !!(subcategorySlug || (categorySlug && !subcategorySlug && categoryIdFromParams === undefined));
  const slugToUse = subcategorySlug || categorySlug || categoryIdFromParams;

  // Obține ID-ul subcategoriei din slug
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    const getSubcategoryId = async () => {
      // Dacă e doar categorie (categorySlug && !subcategorySlug), nu căuta subcategorii
      if (categorySlug && !subcategorySlug) {
        setSubcategoryId(null);
        return;
      }

      // Folosim DOAR subcategorySlug (nu slugToUse care poate fi categorySlug)
      // slugToUse este folosit doar pentru legacy routes fără categorySlug
      const slugToSearch = subcategorySlug || (categorySlug ? null : slugToUse);

      if (!slugToSearch) {
        // No slug provided sau e doar categorie
        setSubcategoryId(null);
        return;
      }

      // Looking for subcategory with slug

      // Caută DOAR după slug (nu mai folosim UUID)
      // Încearcă mai întâi cu exact match (cel mai rapid și sigur)
      const { data: subcategoryExact, error: exactError } = await supabase
        .from('forum_subcategories')
        .select('id, slug, name')
        .eq('slug', slugToSearch)
        .eq('is_active', true)
        .maybeSingle(); // Folosim maybeSingle pentru a evita erori

      if (subcategoryExact) {
        // Found subcategory with exact match
        setSubcategoryId(subcategoryExact.id);
      } else {
        // No subcategory found - nu mai încercăm cu ilike pentru a evita eroarea 406
        // Dacă exact match nu funcționează, înseamnă că nu există subcategorie cu acest slug
        setSubcategoryId(null);
      }
    };

    getSubcategoryId();
  }, [slugToUse, categorySlug, subcategorySlug]);

  // Supabase hooks - folosește subcategoryId (UUID) pentru query (intern folosim UUID, extern slug)
  const { topics, loading: supabaseLoading, isLoading: topicsIsLoading, error: topicsError, refetch: refetchTopics } = useTopics(subcategoryId || '', 1, 50);
  
  // Hook pentru prefetch pe hover
  const { prefetchTopic } = usePrefetch();

  // Hook pentru status-ul read/unread al topicurilor
  const topicIds = topics.map(topic => topic.id);
  const { unreadMap, hasUnread: hasUnreadPost } = useMultipleTopicsReadStatus(topicIds);

  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryDescription, setSubcategoryDescription] = useState('');
  const [parentCategoryName, setParentCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [parentCategorySlug, setParentCategorySlug] = useState<string | null>(categorySlug || null);
  const [resolvedSubcategorySlug, setResolvedSubcategorySlug] = useState<string | null>(subcategorySlug || null);
  const [categorySubcategories, setCategorySubcategories] = useState<any[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Hook pentru status-ul read/unread al subcategoriilor (pentru pagina de categorie)
  // Trebuie să fie după declararea categorySubcategories - folosim useMemo pentru a evita erorile de hoisting
  const subcategoryIdsForReadStatus = useMemo(() => {
    return categorySubcategories.map(subcat => subcat.id);
  }, [categorySubcategories]);
  
  const { hasUnread: hasUnreadSubcategory } = useMultipleSubcategoriesUnreadStatus(
    subcategoryIdsForReadStatus.length > 0 ? subcategoryIdsForReadStatus : []
  );
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
      // Dacă e doar categorie (categorySlug && !subcategorySlug), nu căuta subcategorii aici
      if (categorySlug && !subcategorySlug) {
        // Nu căuta subcategorii când e doar categorie
        setSubcategoryName('');
        setSubcategoryDescription('');
        setParentCategoryName('');
        setParentCategoryId(null);
        return; // Va fi gestionat în alt useEffect
      }

      // Dacă avem categorySlug și subcategorySlug, folosim subcategorySlug
      // IMPORTANT: Nu folosim slugToUse aici pentru că poate fi categorySlug
      const slugToSearch = subcategorySlug;

      if (!slugToSearch || slugToSearch.trim() === '') {
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
          .eq('slug', slugToSearch)
          .eq('is_active', true)
          .maybeSingle();

        if (subError) {
          console.error('CategoryPage: Error loading subcategory name:', subError);
        }

        if (subcategory) {
          setSubcategoryName(subcategory.name);
          setSubcategoryDescription(subcategory.description || '');
          setResolvedSubcategorySlug(subcategory.slug || null);

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
              setParentCategorySlug(parentCategory.slug || null);
            }
          }
          return;
        }

        // Nu mai folosim ilike - dacă exact match nu funcționează, înseamnă că nu există subcategorie
        // Eliminăm ilike pentru a evita eroarea 406

        // Nu s-a găsit nimic (nu e subcategorie)
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
  }, [slugToUse, categorySlug, subcategorySlug]);

  // Detect and redirect if categorySlug is actually a subcategory
  useEffect(() => {
    const checkAndRedirect = async () => {
      // Doar dacă avem categorySlug dar nu subcategorySlug
      if (!categorySlug || subcategorySlug) {
        return;
      }

      try {
        // Verifică mai întâi dacă este categorie
        const { data: category } = await supabase
          .from('forum_categories')
          .select('id, slug')
          .eq('slug', categorySlug)
          .eq('is_active', true)
          .maybeSingle();

        // Dacă nu este categorie, verifică dacă este subcategorie
        if (!category) {
          const { data: subcategory } = await supabase
            .from('forum_subcategories')
            .select('id, slug, category_id')
            .eq('slug', categorySlug)
            .eq('is_active', true)
            .maybeSingle();

          if (subcategory && subcategory.category_id) {
            // Este subcategorie - găsește categoria părinte
            const { data: parentCategory } = await supabase
              .from('forum_categories')
              .select('slug')
              .eq('id', subcategory.category_id)
              .maybeSingle();

            if (parentCategory?.slug && subcategory.slug) {
              // Redirecționează la URL-ul corect: /forum/categorySlug/subcategorySlug
              navigate(`/forum/${parentCategory.slug}/${subcategory.slug}`, { replace: true });
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking redirect:', error);
      }
    };

    checkAndRedirect();
  }, [categorySlug, subcategorySlug, navigate]);

  // Load category and subcategories when it's just a category (not subcategory)
  useEffect(() => {
    const loadCategory = async () => {
      if (!categorySlug || subcategorySlug) {
        // Nu e doar categorie, sau nu avem categorySlug
        return;
      }

      try {
        setLoadingSubcategories(true);
        
        // Caută categoria după slug
        const { data: category, error: catError } = await supabase
          .from('forum_categories')
          .select('id, name, description, slug')
          .eq('slug', categorySlug)
          .eq('is_active', true)
          .maybeSingle();

        if (category) {
          setCategoryName(category.name);
          setCategoryId(category.id);
          setSubcategoryName('');
          setSubcategoryDescription('');
          setParentCategoryName('');
          setParentCategoryId(null);
          
          // Încarcă subcategoriile pentru această categorie
          const { data: subcategories, error: subcatsError } = await supabase
            .from('forum_subcategories')
            .select('id, name, description, slug, icon, sort_order')
            .eq('category_id', category.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
          
          if (!subcatsError && subcategories) {
            setCategorySubcategories(subcategories || []);
          } else {
            setCategorySubcategories([]);
          }
        } else {
          setCategoryName('');
          setCategoryId(null);
          setCategorySubcategories([]);
        }
      } catch (error) {
        console.error('Error loading category:', error);
        setCategorySubcategories([]);
      } finally {
        setLoadingSubcategories(false);
      }
    };

    loadCategory();
  }, [categorySlug, subcategorySlug]);

  const handleTopicClick = (topic: { id: string; slug?: string }) => {
    const topicSlug = topic.slug || topic.id;
    // URL clean: /forum/categorySlug/subcategorySlug/topicSlug
    if (categorySlug && subcategorySlug) {
      // Format complet: category/subcategory/topic
      navigate(`/forum/${categorySlug}/${subcategorySlug}/${topicSlug}`);
    } else if (subcategorySlug) {
      // Legacy: doar subcategorySlug (fără category)
      navigate(`/forum/${subcategorySlug}/${topicSlug}`);
    } else if (parentCategorySlug && resolvedSubcategorySlug) {
      // Dacă avem parentCategorySlug și subcategorySlug din state
      navigate(`/forum/${parentCategorySlug}/${resolvedSubcategorySlug}/${topicSlug}`);
    } else {
      // Fallback - încearcă să găsească slug-urile
      const subcategorySlugToUse = resolvedSubcategorySlug || slugToUse || 'unknown';
      if (parentCategorySlug) {
        navigate(`/forum/${parentCategorySlug}/${subcategorySlugToUse}/${topicSlug}`);
      } else {
        navigate(`/forum/${subcategorySlugToUse}/${topicSlug}`);
      }
    }
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
          {/* Dacă avem categorySlug și subcategorySlug, afișăm categoria părinte */}
          {categorySlug && subcategorySlug && parentCategoryName && parentCategorySlug && (
            <>
              <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>
              <Link
                to={`/forum/${parentCategorySlug}`}
                style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
              >
                {parentCategoryName}
              </Link>
            </>
          )}
          {/* Dacă avem doar categorySlug (categorie), afișăm categoria */}
          {categorySlug && !subcategorySlug && categoryName && (
            <>
              <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>
              <span style={{ color: '#6b7280', fontWeight: '500' }}>{categoryName}</span>
            </>
          )}
          {/* Dacă avem subcategorySlug (subcategorie), afișăm subcategoria */}
          {subcategorySlug && subcategoryName && (
            <>
              <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>
              <span style={{ color: '#6b7280', fontWeight: '500' }}>{subcategoryName}</span>
            </>
          )}
          {/* Fallback pentru legacy routes */}
          {!categorySlug && !subcategorySlug && parentCategoryName && parentCategoryId && (
            <>
              <span style={{ margin: '0 0.375rem', color: '#9ca3af' }}>›</span>
              <Link
                to={parentCategorySlug ? `/forum/${parentCategorySlug}` : `/forum#category-${parentCategoryId}`}
                style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
                onClick={(e) => {
                  if (!parentCategorySlug && parentCategoryId) {
                    // Scroll la categorie pe homepage
                    e.preventDefault();
                    navigate('/forum');
                    setTimeout(() => {
                      const element = document.getElementById(`category-${parentCategoryId}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 100);
                  }
                }}
              >
                {parentCategoryName}
              </Link>
            </>
          )}
          {!categorySlug && !subcategorySlug && subcategoryName && (
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
                {subcategoryName || categoryName || '\u00A0'}
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: isMobile ? '0.75rem' : '0.875rem', lineHeight: '1.3' }}>
                {subcategoryDescription || 'Selectează o subcategorie pentru a vedea topicurile'}
              </p>
            </div>
          </div>
        </div>

        {/* Lista topicuri SAU subcategorii */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}
        >
          {/* Dacă e doar categorie (fără subcategorie), afișează subcategoriile */}
          {categorySlug && !subcategorySlug && categoryId ? (
            <div>
              {categorySubcategories.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {categorySubcategories.map((subcat) => (
                    <Link
                      key={subcat.id}
                      to={`/forum/${categorySlug}/${subcat.slug || subcat.id}`}
                      style={{
                        display: 'block',
                        padding: '1rem 1.5rem',
                        transition: 'background-color 0.2s',
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Read Status Marker - în stânga iconiței */}
                        {forumUser && (
                          <ReadStatusMarker 
                            hasUnread={hasUnreadSubcategory(subcat.id)} 
                            style={{ marginRight: '0.25rem', alignSelf: 'center', flexShrink: 0 }}
                          />
                        )}
                        {subcat.icon && (
                          <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{subcat.icon}</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem', color: '#111827' }}>
                            {subcat.name}
                          </h3>
                          {subcat.description && (
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                              {subcat.description}
                            </p>
                          )}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '1.25rem' }}>›</div>
                      </div>
                    </Link>
                  ))}
                  
                  {/* Legendă pentru iconread marker */}
                  {forumUser && categorySubcategories.length > 0 && (
                    <div style={{
                      padding: '1rem 1.5rem',
                      borderTop: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb',
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ReadStatusMarker hasUnread={true} size={20} />
                        <span>Forumul <strong>conține</strong> posturi noi</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ReadStatusMarker hasUnread={false} size={20} />
                        <span>Forumul <strong>nu conține</strong> posturi noi</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#111827' }}>
                    Nu există subcategorii în această categorie
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
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
            {/* Fără skeleton - afișăm direct datele când sunt gata */}
            {topics.length === 0 && !topicsIsLoading && subcategoryId ? (
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    // Prefetch topic-ul când utilizatorul trece cu mouse-ul
                    const topicSlug = (topic as any).slug;
                    if (topicSlug) {
                      prefetchTopic(topicSlug, resolvedSubcategorySlug || undefined);
                    }
                  }}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => handleTopicClick(topic)}
                >
                  {/* Topic info - Layout diferit pe mobil */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: 0, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem', flexShrink: 0 }}>
                      {/* Read Status Marker - în stânga iconițelor, 90% din înălțimea row-ului */}
                      {forumUser && (
                        <ReadStatusMarker 
                          hasUnread={hasUnreadPost(topic.id)} 
                          style={{ marginRight: '0.25rem', alignSelf: 'center' }}
                        />
                      )}
                      {topic.is_pinned && <Pin style={{ width: isMobile ? '0.875rem' : '1rem', height: isMobile ? '0.875rem' : '1rem', color: '#f59e0b' }} />}
                      {topic.is_locked && <Lock style={{ width: isMobile ? '0.875rem' : '1rem', height: isMobile ? '0.875rem' : '1rem', color: '#6b7280' }} />}
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
            </>
          )}
        </div>

        {/* Buton creare topic nou - doar dacă e subcategorie (nu categorie) */}
        {subcategorySlug && (
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
        )}

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
        <ActiveViewers 
          subcategoryId={subcategoryId || undefined} 
          categoryId={categorySlug && !subcategorySlug ? categoryId || undefined : undefined}
        />
      </div>
    </ForumLayout>
  );
}
