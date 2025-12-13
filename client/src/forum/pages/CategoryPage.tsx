import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Pin, Lock } from 'lucide-react';
import { useTopics } from '../hooks/useTopics';
import CreateTopicEditor from '../components/CreateTopicEditor';
import ActiveViewers from '../components/ActiveViewers';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import ReadStatusMarker from '../components/ReadStatusMarker';
import { useMultipleTopicsReadStatus, useMultipleSubcategoriesUnreadStatus, useMultipleSubforumsUnreadStatus } from '../hooks/useTopicReadStatus';
import { usePrefetch } from '../hooks/usePrefetch';
import { useSubcategoryOrSubforum } from '../hooks/useSubcategoryOrSubforum';
import SEOHead from '../../components/SEOHead';
import { useStructuredData } from '../../hooks/useStructuredData';
import NotFound404 from '../../components/NotFound404';

export default function CategoryPage() {
  // Acceptă:
  // - /:subcategoryOrSubforumSlug (subcategorie SAU subforum - detectăm automat)
  // - /category/:id (legacy)
  // IMPORTANT: Nu mai avem categorySlug în URL - doar subcategoryOrSubforumSlug
  const { id: categoryIdFromParams, subcategoryOrSubforumSlug } = useParams<{
    id?: string;
    subcategoryOrSubforumSlug?: string;
  }>();

  const { forumUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Slug-ul din URL poate fi categorie, subcategorie sau subforum
  const slugToUse = subcategoryOrSubforumSlug || categoryIdFromParams;

  // State pentru a detecta dacă slug-ul este categorie
  const [isCategory, setIsCategory] = useState(false);
  const [checkingCategory, setCheckingCategory] = useState(true); // Default true la început



  const [categoryData, setCategoryData] = useState<{ id: string; name: string; slug: string } | null>(null);

  // Folosim React Query hook pentru subcategorie/subforum - cache automat, fără flickering
  // IMPORTANT: Nu mai trecem categorySlug - slug-urile sunt unice global
  const { data: subcategoryOrSubforumData, isLoading: loadingSubcategoryOrSubforum } = useSubcategoryOrSubforum(
    undefined, // categorySlug nu mai este necesar
    slugToUse // potentialSlug poate fi subcategorySlug sau categorySlug
  );

  // Detectăm dacă slug-ul este categorie (dacă hook-ul nu găsește subcategorie/subforum)
  useEffect(() => {
    // 1. Dacă avem deja date despre subcategorie/subforum (găsit de hook)
    if (subcategoryOrSubforumData && subcategoryOrSubforumData.type) {
      if (checkingCategory) setCheckingCategory(false);
      if (isCategory) setIsCategory(false);
      if (categoryData) setCategoryData(null);
      return;
    }

    // 2. Dacă hook-ul încă încarcă
    if (loadingSubcategoryOrSubforum) {
      if (!checkingCategory) setCheckingCategory(true);
      return;
    }

    // 3. Dacă hook-ul a terminat și nu a găsit nimic → Verificăm manual dacă e categorie
    const checkIfCategory = async () => {
      // Notă: Nu setăm checkingCategory(true) aici pt a evita bucle, presupunem că e deja true din starea inițială sau pasul anterior
      // Dar dacă cumva e false, îl setăm doar dacă e necesar

      try {
        const { data: category } = await supabase
          .from('forum_categories')
          .select('id, name, slug')
          .eq('slug', slugToUse)
          .eq('is_active', true)
          .maybeSingle();

        if (category) {
          setIsCategory(true);
          setCategoryData(category);
        } else {
          setIsCategory(false);
          setCategoryData(null);
        }
      } catch (error) {
        console.error('Error checking category:', error);
        setIsCategory(false);
        setCategoryData(null);
      } finally {
        setCheckingCategory(false);
      }
    };

    checkIfCategory();
  }, [slugToUse, subcategoryOrSubforumData, loadingSubcategoryOrSubforum]);

  // Extragem datele din hook folosind useMemo pentru performanță
  const {
    subcategoryId,
    subforumId,
    subcategoryName,
    subcategoryDescription,
    subforumName,
    subforumDescription,
    categoryDescription,
    parentCategory,
    subforums,
  } = useMemo(() => {
    if (!subcategoryOrSubforumData) {
      return {
        subcategoryId: null,
        subforumId: null,
        subcategoryName: '',
        subcategoryDescription: '',
        subforumName: '',
        subforumDescription: '',
        categoryDescription: '',
        parentCategory: null,
        subforums: [],
      };
    }

    if (subcategoryOrSubforumData.type === 'subcategory' && subcategoryOrSubforumData.subcategory) {
      return {
        subcategoryId: subcategoryOrSubforumData.subcategory.id,
        subforumId: null,
        subcategoryName: subcategoryOrSubforumData.subcategory.name,
        subcategoryDescription: subcategoryOrSubforumData.subcategory.description || '',
        subforumName: '',
        subforumDescription: '',
        categoryDescription: (subcategoryOrSubforumData.parentCategory as any)?.description || '',
        parentCategory: subcategoryOrSubforumData.parentCategory,
        subforums: subcategoryOrSubforumData.subforums,
      };
    }

    if (subcategoryOrSubforumData.type === 'subforum' && subcategoryOrSubforumData.subforum) {
      return {
        subcategoryId: null,
        subforumId: subcategoryOrSubforumData.subforum.id,
        subcategoryName: '',
        subcategoryDescription: '',
        subforumName: subcategoryOrSubforumData.subforum.name,
        subforumDescription: subcategoryOrSubforumData.subforum.description || '',
        categoryDescription: (subcategoryOrSubforumData.parentCategory as any)?.description || '',
        parentCategory: subcategoryOrSubforumData.parentCategory,
        subforums: [],
      };
    }

    return {
      subcategoryId: null,
      subforumId: null,
      subcategoryName: '',
      subcategoryDescription: '',
      subforumName: '',
      subforumDescription: '',
      categoryDescription: '',
      parentCategory: null,
      subforums: [],
    };
  }, [subcategoryOrSubforumData]);


  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // Supabase hooks - folosește subcategoryId sau subforumId (UUID) pentru query (intern folosim UUID, extern slug)
  const { topics, loading: supabaseLoading, isLoading: topicsIsLoading, error: topicsError, refetch: refetchTopics } = useTopics(subcategoryId, 1, 50, subforumId || undefined);



  // Hook pentru prefetch pe hover
  const { prefetchTopic } = usePrefetch();

  // Hook pentru status-ul read/unread al topicurilor
  const topicIds = topics.map(topic => topic.id);
  const { unreadMap, hasUnread: hasUnreadPost } = useMultipleTopicsReadStatus(topicIds);

  // Folosim parentCategory pentru breadcrumbs (nu mai avem categorySlug în URL)
  const displayCategorySlug = parentCategory?.slug || categoryData?.slug || null;
  const displayCategoryName = parentCategory?.name || categoryName || categoryData?.name || '';
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

  // Hook pentru status-ul read/unread al subforumurilor
  const subforumIdsForReadStatus = useMemo(() => {
    return subforums.map(sf => sf.id);
  }, [subforums]);

  const { hasUnread: hasUnreadSubforum } = useMultipleSubforumsUnreadStatus(
    subforumIdsForReadStatus.length > 0 ? subforumIdsForReadStatus : []
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

  // loadHierarchy a fost eliminat - folosim useSubcategoryOrSubforum hook care face tot ce trebuie

  // NOTĂ: Acest useEffect a fost eliminat - nu mai avem categorySlug în URL
  // Redirect-ul este gestionat de useSubcategoryOrSubforum hook

  // Load category and subcategories when it's just a category (not subcategory)
  useEffect(() => {
    const loadCategory = async () => {
      if (!isCategory || !categoryData || subcategoryId || subforumId) {
        // Nu e doar categorie, sau nu avem datele categoriei
        return;
      }

      try {
        setLoadingSubcategories(true);

        // Caută categoria după slug (folosim categoryData dacă există, altfel slugToUse)
        const slugToCheck = categoryData?.slug || slugToUse;
        if (!slugToCheck) return;

        const { data: category, error: catError } = await supabase
          .from('forum_categories')
          .select('id, name, description, slug')
          .eq('slug', slugToCheck)
          .eq('is_active', true)
          .maybeSingle();

        if (category) {
          setCategoryName(category.name);
          setCategoryId(category.id);

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
  }, [isCategory, categoryData, subcategoryId, subforumId]);

  const handleTopicClick = (topic: { id: string; slug?: string }) => {
    const topicSlug = topic.slug || topic.id;
    // URL clean: FĂRĂ categorySlug - doar subcategorySlug/topicSlug
    // Format: subcategorySlug/topicSlug (sau subforumSlug/topicSlug)
    const subcategorySlugToUse = slugToUse || 'unknown';
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
            <div style={{ color: theme.error || '#dc2626', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Categorie lipsă!</div>
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
            <div style={{ color: theme.error || '#dc2626', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Categorie nu a fost găsită!</div>
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
          <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: theme.surface, borderRadius: '1rem', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ color: theme.error || '#dc2626', marginBottom: '1rem' }}>Eroare la încărcarea topicurilor</div>
            <div style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>{topicsError.message}</div>
            <button
              onClick={() => navigate('/forum')}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: theme.primary,
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

  // SEO Data for Category/Subcategory
  const { websiteData, organizationData, createBreadcrumbData } = useStructuredData();
  const currentUrl = `https://fishtrophy.ro/forum/${slugToUse}`;
  const pageTitle = subcategoryName || subforumName || categoryName || 'Categorii Forum';
  const pageDescription = subcategoryDescription || subforumDescription || categoryDescription || 'Discuții despre pescuit, tehnici, echipament și locații în România.';
  const pageKeywords = [
    pageTitle,
    'forum pescuit',
    'discuții pescuit',
    'comunitate pescari',
    'Fish Trophy',
    'pescuit romania'
  ].filter(Boolean).join(', ');
  const pageImage = 'https://fishtrophy.ro/social-media-banner-v2.jpg';

  return (
    <>
      <SEOHead
        title={`${pageTitle} - Forum Pescuit - Fish Trophy`}
        description={pageDescription}
        keywords={pageKeywords}
        image={pageImage}
        url={currentUrl}
        type="website"
        structuredData={[websiteData, organizationData] as unknown as Record<string, unknown>[]}
      />
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0.5rem' : '1rem 0.75rem', width: '100%', overflowX: 'hidden' }}>
          {/* Breadcrumbs: FishTrophy › Categorie › SubCategorie - Toate linkuri funcționale */}
          <nav style={{
            marginBottom: isMobile ? '0.5rem' : '1.5rem',
            fontSize: isMobile ? '0.625rem' : '0.875rem',
            color: theme.textSecondary,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            paddingBottom: '0.25rem'
          }}>
            <Link to="/forum" style={{ color: theme.primary, textDecoration: 'none', fontWeight: '500' }}>FishTrophy</Link>
            {/* Categoria părinte - afișăm întotdeauna dacă există */}
            {parentCategory && parentCategory.slug && (subcategoryId || subforumId) && (
              <>
                <span style={{ margin: '0 0.375rem', color: theme.textSecondary }}>›</span>
                <Link
                  to={`/forum/${parentCategory.slug}`}
                  style={{ color: theme.primary, textDecoration: 'none', fontWeight: '500' }}
                >
                  {parentCategory.name}
                </Link>
              </>
            )}
            {/* Subcategoria sau subforum-ul */}
            {(subcategoryId || subforumId) && (subcategoryName || subforumName) && (
              <>
                <span style={{ margin: '0 0.375rem', color: theme.textSecondary }}>›</span>
                <span style={{ color: theme.textSecondary, fontWeight: '500' }}>
                  {subforumName || subcategoryName}
                </span>
              </>
            )}
            {/* Dacă avem doar categorie (nu subcategorie sau subforum), afișăm categoria */}
            {isCategory && categoryData && !subcategoryId && !subforumId && categoryName && (
              <>
                <span style={{ margin: '0 0.375rem', color: theme.textSecondary }}>›</span>
                <span style={{ color: theme.textSecondary, fontWeight: '500' }}>{categoryName}</span>
              </>
            )}
          </nav>

          {/* Header subcategorie/categorie - COMPACT */}
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
              to="/forum"
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
            <h1 style={{
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '600',
              color: 'white',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {/* Nu afișăm slug-ul - așteptăm până avem numele real */}
              {subforumName || subcategoryName || categoryName || (isCategory && categoryData?.name) || '\u00A0'}
            </h1>
          </div>

          {/* Loading state - afișăm skeleton când se încarcă datele pentru subcategorie/subforum */}
          {/* IMPORTANT: Nu afișăm conținutul categoriei când se încarcă datele pentru subcategorie/subforum */}
          {((loadingSubcategoryOrSubforum || checkingCategory) && !isCategory) ? (
            <div style={{
              backgroundColor: theme.surface,
              borderRadius: '1rem',
              border: `1px solid ${theme.border}`,
              padding: '2rem',
              textAlign: 'center',
              color: theme.textSecondary
            }}>
              Se încarcă...
            </div>
          ) : !loadingSubcategoryOrSubforum && !checkingCategory && slugToUse && !subcategoryId && !subforumId && !isCategory ? (
            <NotFound404 />
          ) : (
            <>
              {/* Lista topicuri SAU subcategorii */}
              {/* Dacă e doar categorie (fără subcategorie sau subforum), afișează subcategoriile */}
              {/* IMPORTANT: Verificăm dacă avem subcategoryId sau subforumId - dacă avem, afișăm topicurile, altfel subcategoriile */}
              {isCategory && categoryData && !subcategoryId && !subforumId ? (
                <div
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: '1rem',
                    border: `1px solid ${theme.border}`,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden'
                  }}
                >
                  <div>
                    {loadingSubcategories ? (
                      <div style={{ padding: '3rem', textAlign: 'center', color: theme.textSecondary }}>
                        <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: `3px solid ${theme.border}`, borderTopColor: theme.primary, borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
                        <div>Se încarcă subcategoriile...</div>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      </div>
                    ) : categorySubcategories.length > 0 ? (
                      <div>
                        {categorySubcategories.map((subcat, index) => (
                          <Link
                            key={subcat.id}
                            to={`/forum/${subcat.slug || subcat.id}`}
                            style={{
                              display: 'block',
                              padding: '1rem 1.5rem',
                              transition: 'background-color 0.2s',
                              textDecoration: 'none',
                              color: 'inherit',
                              borderBottom: index !== categorySubcategories.length - 1 ? `1px solid ${theme.border}` : 'none',
                              backgroundColor: theme.surface
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.surfaceHover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = theme.surface;
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
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem', color: theme.text }}>
                                  {subcat.name}
                                </h3>
                                {subcat.description && (
                                  <p style={{ fontSize: '0.875rem', color: theme.textSecondary, lineHeight: '1.5' }}>
                                    {subcat.description}
                                  </p>
                                )}
                              </div>
                              <div style={{ color: theme.textSecondary, fontSize: '1.25rem' }}>›</div>
                            </div>
                          </Link>
                        ))}

                        {/* Legendă pentru iconread marker */}
                        {forumUser && categorySubcategories.length > 0 && (
                          <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: `1px solid ${theme.border}`,
                            backgroundColor: theme.background,
                            fontSize: '0.875rem',
                            color: theme.textSecondary,
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
                        color: theme.textSecondary,
                        backgroundColor: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.75rem',
                        margin: '1rem'
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: theme.text }}>
                          Nu există subcategorii în această categorie
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Subforums - afișate doar când ești într-o subcategorie, deasupra topicelor */}
                  {subcategoryId && subforums.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{
                        backgroundColor: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.75rem',
                        overflow: 'hidden'
                      }}>
                        {/* Header pentru subforums */}
                        <div style={{
                          backgroundColor: theme.background,
                          borderBottom: `1px solid ${theme.border}`,
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: theme.textSecondary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.025em'
                        }}>
                          Sub-forumuri
                        </div>
                        {/* Lista subforums */}
                        {subforums.map((subforum, index) => (
                          <div
                            key={subforum.id}
                            style={{
                              padding: '0.75rem 1rem',
                              borderBottom: index === subforums.length - 1 ? 'none' : `1px solid ${theme.border}`,
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}
                            onClick={() => {
                              // Navigate to subforum - IMPORTANT: format simplificat (doar subforumSlug)
                              if (subforum.slug) {
                                navigate(`/forum/${subforum.slug}`);
                              }
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.surfaceHover}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.surface}
                          >
                            {/* Read Status Marker */}
                            {forumUser && (
                              <ReadStatusMarker
                                hasUnread={hasUnreadSubforum(subforum.id)}
                                style={{ alignSelf: 'center', flexShrink: 0 }}
                              />
                            )}
                            <div style={{ fontSize: '1.25rem' }}>
                              {subforum.icon || '📁'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: theme.text, marginBottom: '0.125rem' }}>
                                {subforum.name}
                              </div>
                              {subforum.description && (
                                <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                                  {subforum.description}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: theme.textSecondary, textAlign: 'right' }}>
                              <div>{subforum.topicCount || 0} subiecte</div>
                              <div>{subforum.postCount || 0} postări</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Topicuri directe din subcategorie SAU subforum */}
                  {(subcategoryId || subforumId) && (
                    <div style={{ marginTop: subforums.length > 0 ? '1.5rem' : '0' }}>
                      {/* Create Topic Button - Always visible if logged in */}
                      {/* Create Topic Button - Top Left - Doar dacă sunt topicuri */}
                      {forumUser && topics.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
                          <button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 1rem',
                              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                              color: 'white',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              borderRadius: '0.5rem',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                            Topic nou
                          </button>
                        </div>
                      )}

                      <div style={{
                        backgroundColor: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '0.75rem',
                        overflow: 'hidden'
                      }}>
                        {/* Header pentru topicuri directe */}
                        <div className="hidden sm:grid" style={{
                          backgroundColor: theme.background,
                          borderBottom: `1px solid ${theme.border}`,
                          padding: '0.75rem 1rem',
                          gridTemplateColumns: '1fr 80px 80px 180px',
                          gap: '0.75rem',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: theme.textSecondary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.025em'
                        }}>
                          <div>Topic</div>
                          <div style={{ textAlign: 'center' }}>Răspunsuri</div>
                          <div style={{ textAlign: 'center' }}>Vizualizări</div>
                          <div style={{ textAlign: 'center' }}>Ultima postare</div>
                        </div>

                        {/* Fără skeleton - afișăm direct datele când sunt gata */}
                        {topics.length === 0 && !topicsIsLoading ? (
                          <div style={{
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            color: theme.textSecondary,
                            backgroundColor: theme.surface,
                            borderRadius: '0.75rem',
                            margin: '1rem',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                          }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                            <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.375rem', color: theme.text }}>
                              Niciun topic încă în această {subforumId ? 'secțiune' : 'categorie'}
                            </div>
                            <div style={{ fontSize: '0.8rem', marginBottom: '1.25rem', color: theme.textSecondary }}>
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
                                padding: '0.625rem 1.25rem',
                                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                                color: 'white',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                borderRadius: '0.5rem',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9';
                                e.currentTarget.style.boxShadow = '0 6px 10px rgba(0, 0, 0, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
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
                                borderBottom: `1px solid ${theme.border}`,
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
                                e.currentTarget.style.backgroundColor = theme.surfaceHover;
                                // Prefetch topic-ul când utilizatorul trece cu mouse-ul
                                const topicSlug = (topic as any).slug;
                                if (topicSlug) {
                                  prefetchTopic(topicSlug, subforumId ? slugToUse : undefined);
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
                                  {topic.is_locked && <Lock style={{ width: isMobile ? '0.875rem' : '1rem', height: isMobile ? '0.875rem' : '1rem', color: theme.textSecondary }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <h3 style={{ fontSize: isMobile ? '0.8125rem' : '0.875rem', fontWeight: '600', color: theme.text, marginBottom: '0.25rem', lineHeight: '1.3', wordBreak: 'break-word' }}>
                                    {topic.title}
                                  </h3>

                                  {/* Author - Line 2 */}
                                  <div style={{ fontSize: isMobile ? '0.75rem' : '0.8125rem', color: theme.textSecondary, marginBottom: '0.125rem' }}>
                                    <span>de <span style={{ color: theme.primary, fontWeight: '600' }}>{topic.author_username || 'Unknown'}</span></span>
                                  </div>

                                  {/* Full Date & Time - Line 3 */}
                                  <div style={{ fontSize: isMobile ? '0.6875rem' : '0.75rem', color: theme.textSecondary, marginBottom: isMobile ? '0.25rem' : '0.5rem' }}>
                                    {/* Afisam data si ora complete pentru topic creation */}
                                    <span>{new Date(topic.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'numeric', year: 'numeric' })} {new Date(topic.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Răspunsuri - Ascuns pe mobil */}
                              <div className="hidden sm:flex" style={{
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: theme.success || '#059669',
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
                                color: theme.textSecondary,
                                minHeight: '2rem'
                              }}>
                                {topic.view_count.toLocaleString('ro-RO')}
                              </div>

                              {/* Ultima postare - Ascuns pe mobil */}
                              <div className="hidden sm:flex" style={{
                                flexDirection: 'column',
                                alignItems: 'flex-end', // Aliniere dreapta
                                justifyContent: 'center',
                                textAlign: 'right',
                                fontSize: '0.75rem',
                                color: theme.textSecondary,
                                minHeight: '2rem',
                                paddingRight: '0.5rem'
                              }}>
                                {(topic as any).last_post_at ? (
                                  <>
                                    <div style={{ fontWeight: '600', marginBottom: '0.125rem', color: '#ef4444' }}>
                                      {/* Format Dată + Oră - Afișăm mereu data completă */}
                                      {new Date((topic as any).last_post_at).toLocaleDateString('ro-RO')}
                                      <span style={{ color: theme.textSecondary, marginLeft: '4px', fontWeight: '400' }}>
                                        {new Date((topic as any).last_post_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <span>
                                        de <span style={{ color: theme.primary, fontWeight: '600' }}>{(topic as any).last_post_author || 'Unknown'}</span>
                                      </span>
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation(); // Previne navigarea la topic general
                                          handleTopicClick({ ...topic, slug: (topic as any).slug });
                                          // Permalink navigation could be enhanced here to specific post anchor
                                        }}
                                        style={{
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          marginLeft: '2px'
                                        }}
                                        title="Mergi la ultima postare"
                                      >
                                        <div style={{
                                          width: '14px',
                                          height: '14px',
                                          backgroundColor: 'white', // Sau culoare deschisă
                                          border: '1px solid #d1d5db',
                                          borderRadius: '2px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}>
                                          <span style={{ fontSize: '10px', lineHeight: 1, color: '#374151' }}>▶</span>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Create Topic Button - Bottom Left - Doar dacă sunt topicuri */}
                      {forumUser && topics.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
                          <button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 1rem',
                              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                              color: 'white',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              borderRadius: '0.5rem',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                            Topic nou
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Create Topic Editor - Apare doar când sunt topicuri existente (când nu sunt, e afișat în zona goală) */}
          {forumUser && (
            <CreateTopicEditor
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              categoryName={subcategoryName || subforumName || categoryName || ''}
              categoryId={slugToUse || ''}
              subcategoryId={subcategoryId}
              subforumId={subforumId}
              isSubforum={!!subforumId}
              onSuccess={() => {
                setShowCreateModal(false);
                // Invalidate topics query
                // queryClient is not available here directly unless we use useQueryClient hook
                // But CreateTopicEditor handles its own invalidation usually, or we can trust the topics list to auto-refresh due to key change
              }}
              user={{
                username: forumUser.username,
                rank: forumUser.rank || 'ou_de_peste'
              }}
              onTopicCreated={handleTopicCreated}
            />
          )}

          {/* Active Viewers */}
          <ActiveViewers
            subcategoryId={subcategoryId || undefined}
            subforumId={subforumId || undefined}
            categoryId={isCategory && categoryData && !subcategoryId && !subforumId ? categoryId || undefined : undefined}
          />
        </div>
      </ForumLayout >
    </>
  );
}
