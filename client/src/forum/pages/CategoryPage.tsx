import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Pin, Lock, Star } from 'lucide-react';
import ShareButton from '../../components/ShareButton';
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
import { useForumContext } from '../hooks/useForumContext';
import SEOHead from '../../components/SEOHead';
import { useStructuredData } from '../../hooks/useStructuredData';
import NotFound404 from '../../components/NotFound404';
import { useForumSetting } from '../hooks/useForumSetting';

export default function CategoryPage() {
  // Acceptă:
  // - /:subcategoryOrSubforumSlug (subcategorie SAU subforum - detectăm automat)
  // - /category/:id (legacy)
  // IMPORTANT: Nu mai avem categorySlug în URL - doar subcategoryOrSubforumSlug
  const { id: categoryIdFromParams, subcategoryOrSubforumSlug } = useParams<{
    id?: string;
    subcategoryOrSubforumSlug?: string;
  }>();

  const { forumUser, signOut } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
  };

  // Slug-ul din URL poate fi categorie, subcategorie sau subforum
  const slugToUse = subcategoryOrSubforumSlug || categoryIdFromParams;

  // -- SEQUENTIAL PROBING (Option A) --
  // 1. Try Subcategory
  const ctxSubcategory = useForumContext({
    slug: slugToUse,
    expectedType: 'subcategory'
  });

  const subcategoryFailed = !ctxSubcategory.isLoading && ctxSubcategory.data && !ctxSubcategory.data.type;

  // 2. Try Subforum
  const ctxSubforum = useForumContext({
    slug: slugToUse,
    expectedType: 'subforum',
    options: { enabled: !!subcategoryFailed }
  });

  const subforumFailed = subcategoryFailed && !ctxSubforum.isLoading && ctxSubforum.data && !ctxSubforum.data.type;

  // 3. Try Category
  const ctxCategory = useForumContext({
    slug: slugToUse,
    expectedType: 'category',
    options: { enabled: !!subforumFailed }
  });

  // MERGE RESULTS
  const effectiveContext = ctxSubcategory.data?.type ? ctxSubcategory.data : (ctxSubforum.data?.type ? ctxSubforum.data : ctxCategory.data);
  const loadingForumData = ctxSubcategory.isLoading || (subcategoryFailed && ctxSubforum.isLoading) || (subforumFailed && ctxCategory.isLoading);
  const isCategory = effectiveContext?.type === 'category';
  const subcategoryId = effectiveContext?.type === 'subcategory' ? effectiveContext.entity?.id : null;
  const subforumId = effectiveContext?.type === 'subforum' ? effectiveContext.entity?.id : null;
  const breadcrumbs = effectiveContext?.breadcrumbs || [];

  // Extragem datele din hook folosind useMemo pentru performanță
  const {
    subcategoryName,
    subcategoryDescription,
    subforumName,
    subforumDescription,
    categoryDescription,
    parentCategory,
    subforums,
  } = useMemo(() => {
    if (!effectiveContext) {
      return {
        subcategoryName: '',
        subcategoryDescription: '',
        subforumName: '',
        subforumDescription: '',
        categoryDescription: '',
        parentCategory: null,
        subforums: [],
      };
    }

    const entity = effectiveContext.entity;
    const parent = effectiveContext.hierarchy?.parent;
    const children = effectiveContext.hierarchy?.children || [];

    if (effectiveContext.type === 'subcategory') {
      return {
        subcategoryName: entity?.name || '',
        subcategoryDescription: entity?.description || '',
        subforumName: '',
        subforumDescription: '',
        categoryDescription: parent?.description || '',
        parentCategory: parent,
        subforums: children,
      };
    }

    if (effectiveContext.type === 'subforum') {
      return {
        subcategoryName: '',
        subcategoryDescription: '',
        subforumName: entity?.name || '',
        subforumDescription: entity?.description || '',
        categoryDescription: parent?.description || '',
        parentCategory: parent,
        subforums: [],
      };
    }

    return {
      subcategoryName: '',
      subcategoryDescription: '',
      subforumName: '',
      subforumDescription: '',
      categoryDescription: entity?.description || '',
      parentCategory: null,
      subforums: children,
    };
  }, [effectiveContext]);

  // Alias names for Category View (isCategory)
  const categoryData = isCategory ? effectiveContext?.entity : null;
  const categoryName = isCategory ? effectiveContext?.entity?.name : '';
  const categoryId = isCategory ? effectiveContext?.entity?.id : null;
  const categorySubcategories = isCategory ? (effectiveContext?.hierarchy?.children || []) : [];
  const loadingSubcategories = loadingForumData;

  // Supabase hooks - folosește subcategoryId sau subforumId (UUID) pentru query (intern folosim UUID, extern slug)
  const { topics, loading: supabaseLoading, isLoading: topicsIsLoading, error: topicsError, refetch: refetchTopics } = useTopics(subcategoryId, 1, 50, subforumId || undefined);



  // Hook pentru prefetch pe hover
  const { prefetchTopic } = usePrefetch();

  // Hook pentru status-ul read/unread al topicurilor
  const topicIds = topics.map(topic => topic.id);
  const { unreadMap, hasUnread: hasUnreadPost } = useMultipleTopicsReadStatus(topicIds);

  // Grupăm topicurile în sticky/important și normale
  const { stickyTopics, importantTopics, normalTopics } = useMemo(() => {
    const sticky: typeof topics = [];
    const important: typeof topics = [];
    const normal: typeof topics = [];

    topics.forEach(topic => {
      if (topic.is_pinned) {
        sticky.push(topic);
      } else if ((topic as any).is_important) {
        important.push(topic);
      } else {
        normal.push(topic);
      }
    });

    return {
      stickyTopics: sticky,
      importantTopics: important,
      normalTopics: normal
    };
  }, [topics]);

  // Verifică dacă user-ul este admin sau moderator
  const isAdminOrModerator = useMemo(() => {
    if (!forumUser) return false;
    // Verifică dacă este admin (din profiles.role)
    if (forumUser.isAdmin) return true;
    // TODO: Verifică dacă este moderator (din forum_moderators sau profiles.role)
    // Pentru moment, doar adminii pot face sticky/important
    return false;
  }, [forumUser]);

  // Folosim parentCategory pentru breadcrumbs (nu mai avem categorySlug în URL)
  const displayCategorySlug = parentCategory?.slug || categoryData?.slug || null;
  const displayCategoryName = parentCategory?.name || categoryName || categoryData?.name || '';
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

  // Settings pentru afișarea icon-urilor - folosim React Query pentru actualizări imediate
  const { value: showSubcategoryIcons } = useForumSetting('show_subcategory_icons', false);
  const { value: showSubforumIcons } = useForumSetting('show_subforum_icons', false);

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

  // Manual category loading removed - now handled by useForumContext (Option A - Category probing)


  const handleTopicClick = (topic: { id: string; slug?: string }) => {
    const topicSlug = topic.slug || topic.id;
    // IMPORTANT: Folosim slug-ul exact din subcategoryOrSubforumData pentru a evita erorile
    // Verificăm mai întâi dacă avem date despre subcategorie/subforum
    let subcategorySlugToUse: string | undefined = undefined;

    // Folosim datele din hook dacă sunt disponibile
    if (effectiveContext) {
      if (effectiveContext.type === 'subcategory' && effectiveContext.entity?.slug) {
        subcategorySlugToUse = effectiveContext.entity.slug;
      } else if (effectiveContext.type === 'subforum' && effectiveContext.entity?.slug) {
        subcategorySlugToUse = effectiveContext.entity.slug;
      }
    }

    // Fallback: folosim slug-ul din URL sau din useMemo
    if (!subcategorySlugToUse) {
      // Încercăm să folosim slug-ul din parentCategory sau din datele extrase
      if (parentCategory?.slug) {
        subcategorySlugToUse = parentCategory.slug;
      } else {
        subcategorySlugToUse = slugToUse;
      }
    }

    // Dacă tot nu avem slug, folosim slug-ul din URL ca fallback final
    if (!subcategorySlugToUse) {
      console.error('No subcategory/subforum slug found for topic navigation');
      return;
    }

    navigate(`/forum/${subcategorySlugToUse}/${topicSlug}`);
  };

  const handleTopicCreated = () => {
    // Refetch topics instead of reloading the page
    refetchTopics();
    setShowCreateModal(false);
  };

  // Funcție pentru a renderiza un topic item
  const renderTopicItem = (topic: typeof topics[0]) => {
    const hasUnread = forumUser ? hasUnreadPost(topic.id) : false;
    const isImportant = (topic as any).is_important;

    // Overlay color pentru pinned/important topics
    const overlayColor = topic.is_pinned ? '#f59e0b' : isImportant ? '#ef4444' : null;

    return (
      <div
        key={topic.id}
        className="topic-item"
        style={{
          padding: isMobile ? '0.5rem' : '0.75rem 1rem',
          borderBottom: `1px solid ${theme.border}`,
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : undefined,
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 40px 100px 100px 220px',
          gap: isMobile ? '0.5rem' : '0.75rem',
          alignItems: isMobile ? 'flex-start' : 'center',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          backgroundColor: overlayColor ? `${overlayColor}0D` : 'transparent',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          // Păstrăm overlay-ul dacă există, altfel folosim hover normal
          if (overlayColor) {
            e.currentTarget.style.backgroundColor = `${overlayColor}1A`; // ~10% opacity la hover
          } else {
            e.currentTarget.style.backgroundColor = theme.surfaceHover;
          }
          // Prefetch topic-ul când utilizatorul trece cu mouse-ul
          const topicSlug = (topic as any).slug;
          if (topicSlug) {
            prefetchTopic(topicSlug, slugToUse, effectiveContext?.type === 'subforum');
          }
        }}
        onMouseLeave={(e) => {
          // Revenim la overlay-ul inițial sau transparent
          e.currentTarget.style.backgroundColor = overlayColor ? `${overlayColor}0D` : 'transparent';
        }}
        onClick={() => handleTopicClick(topic)}
      >
        {/* Topic info - Layout diferit pe mobil - Coloana 1 */}
        <div
          style={{
            gridColumn: '1',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            minWidth: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem', flexShrink: 0 }}>
            {/* Read Status Marker - în stânga iconițelor */}
            {forumUser && (
              <ReadStatusMarker
                hasUnread={hasUnread}
                style={{ marginRight: '0.25rem', alignSelf: 'center' }}
              />
            )}
            {topic.is_locked && <Lock style={{ width: isMobile ? '0.875rem' : '1rem', height: isMobile ? '0.875rem' : '1rem', color: theme.textSecondary }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              {/* Tag "Important" - înainte de titlu */}
              {isImportant && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.125rem 0.375rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '0.625rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.025em',
                  borderRadius: '0.25rem',
                  border: '1px solid #dc2626',
                  lineHeight: '1'
                }}>
                  Important
                </span>
              )}
              <h3 style={{ fontSize: isMobile ? '0.8125rem' : '0.875rem', fontWeight: '400', color: theme.text, lineHeight: '1.5', wordBreak: 'break-word', margin: 0 }}>
                {topic.title}
              </h3>
            </div>

            {/* Author - Line 2 */}
            <div style={{ fontSize: isMobile ? '0.75rem' : '0.8125rem', color: theme.textSecondary, marginBottom: '0.125rem' }}>
              <span>de <span style={{ color: theme.primary, fontWeight: '600' }}>{topic.author_username || 'Unknown'}</span></span>
            </div>

            {/* Full Date & Time - Line 3 */}
            <div style={{ fontSize: isMobile ? '0.6875rem' : '0.75rem', color: theme.textSecondary, marginBottom: isMobile ? '0.25rem' : '0.5rem' }}>
              <span>{new Date(topic.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'numeric', year: 'numeric' })} {new Date(topic.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Iconuri Important/Pinned - coloană separată, înainte de Răspunsuri - Coloana 2 - Ascuns pe mobil */}
        <div
          className="hidden sm:flex"
          style={{
            gridColumn: '2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            minHeight: '2rem'
          }}
        >
          {isImportant && (
            <Star style={{
              width: '1rem',
              height: '1rem',
              color: '#ef4444',
              fill: '#ef4444',
              flexShrink: 0
            }} />
          )}
          {topic.is_pinned && (
            <Pin style={{
              width: '1rem',
              height: '1rem',
              color: '#f59e0b',
              flexShrink: 0
            }} />
          )}
        </div>

        {/* Răspunsuri - Coloana 3 - Ascuns pe mobil */}
        <div
          className="hidden sm:flex"
          style={{
            gridColumn: '3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: theme.success || '#059669',
            textAlign: 'center'
          }}
        >
          {topic.reply_count}
        </div>

        {/* Vizualizări - Coloana 4 - Ascuns pe mobil */}
        <div
          className="hidden sm:flex"
          style={{
            gridColumn: '4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: theme.textSecondary,
            textAlign: 'center'
          }}
        >
          {topic.view_count.toLocaleString('ro-RO')}
        </div>

        {/* Ultima postare - Coloana 5 - Ascuns pe mobil */}
        <div
          className="hidden sm:flex"
          style={{
            gridColumn: '5',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'center',
            textAlign: 'right',
            fontSize: '0.75rem',
            color: theme.textSecondary,
            paddingRight: '0.5rem'
          }}
        >
          {(topic as any).last_post_at ? (
            <>
              <div style={{ fontWeight: '600', marginBottom: '0.125rem', color: '#ef4444' }}>
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
                    e.stopPropagation();
                    handleTopicClick({ ...topic, slug: (topic as any).slug });
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
                    backgroundColor: 'white',
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
    );
  };

  // SEO Data for Category/Subcategory - MUTAT ÎNAINTE DE EARLY RETURNS
  const { websiteData, organizationData, createBreadcrumbData } = useStructuredData();
  const currentUrl = slugToUse ? `https://fishtrophy.ro/forum/${slugToUse}` : 'https://fishtrophy.ro/forum';
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

  // Verifică dacă slugToUse există (poate fi subcategorySlug sau categoryId)
  if (!slugToUse) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={handleLogout}>
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
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={handleLogout}>
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
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={handleLogout}>
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

  return (
    <>
      <SEOHead
        title={`${pageTitle} - Forum Pescuit - Fish Trophy`}
        description={pageDescription}
        keywords={pageKeywords}
        image={pageImage}
        url={currentUrl}
        type="website"
        structuredData={(() => {
          const breadcrumbItems = [
            { name: 'Acasă', url: 'https://fishtrophy.ro/' },
            { name: 'Forum', url: 'https://fishtrophy.ro/forum' }
          ];
          if (parentCategory && parentCategory.slug) {
            breadcrumbItems.push({ name: parentCategory.name, url: `https://fishtrophy.ro/forum/${parentCategory.slug}` });
          }
          if (subcategoryName && slugToUse) {
            breadcrumbItems.push({ name: subcategoryName, url: `https://fishtrophy.ro/forum/${slugToUse}` });
          } else if (subforumName && slugToUse) {
            breadcrumbItems.push({ name: subforumName, url: `https://fishtrophy.ro/forum/${slugToUse}` });
          } else if (categoryName && slugToUse) {
            breadcrumbItems.push({ name: categoryName, url: `https://fishtrophy.ro/forum/${slugToUse}` });
          }
          return [websiteData, organizationData, createBreadcrumbData(breadcrumbItems)] as unknown as Record<string, unknown>[];
        })()}
      />
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={handleLogout}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0.5rem' : '1.5rem 1rem', width: '100%', overflowX: 'hidden' }}>
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
            <button
              onClick={() => {
                // Dacă avem categorie părinte, mergem acolo
                if (parentCategory?.slug) {
                  navigate(`/forum/${parentCategory.slug}`);
                } else {
                  // Altfel mergem înapoi în istoric sau la forum
                  navigate(-1);
                }
              }}
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
                flexShrink: 0,
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            </button>
            <h1 style={{
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '600',
              color: 'white',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 0
            }}>
              {/* Nu afișăm slug-ul - așteptăm până avem numele real */}
              {subforumName || subcategoryName || categoryName || (isCategory && categoryData?.name) || '\u00A0'}
            </h1>
            <div style={{ flexShrink: 0 }}>
              <ShareButton
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={subforumName || subcategoryName || categoryName || (isCategory && categoryData?.name) || 'Forum'}
                description={`${subforumName || subcategoryName || categoryName || (isCategory && categoryData?.name) || 'Forum'} - Fish Trophy Forum`}
                size="sm"
                variant="ghost"
              />
            </div>
          </div>

          {/* Loading state - afișăm skeleton când se încarcă datele pentru subcategorie/subforum */}
          {/* IMPORTANT: Nu afișăm conținutul categoriei când se încarcă datele pentru subcategorie/subforum */}
          {/* Unified Loading State: Prevent "Cascade" */}
          {(loadingForumData || (effectiveContext && topicsIsLoading && !isCategory)) ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '2rem',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.surface,
              borderRadius: '1rem',
              border: `1px solid ${theme.border}`,
              minHeight: '400px'
            }}>
              <div className="animate-spin" style={{
                width: '3rem',
                height: '3rem',
                border: `4px solid ${theme.border}`,
                borderTop: `4px solid ${theme.primary}`,
                borderRadius: '50%'
              }} />
              <div style={{ color: theme.textSecondary }}>Se încarcă conținutul...</div>
            </div>
          ) : (!loadingForumData && slugToUse && !subcategoryId && !subforumId && !isCategory) ? (
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
                              {showSubcategoryIcons && subcat.icon && (
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
                            {/* Verifică atât setarea globală, cât și setarea individuală show_icon */}
                            {showSubforumIcons && (subforum.show_icon !== false) && (
                              <div style={{
                                fontSize: '1.25rem',
                                alignSelf: 'center',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {subforum.icon || '📁'}
                              </div>
                            )}
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
                              <div>{subforum.stats?.total_topics || 0} subiecte</div>
                              <div>{subforum.stats?.total_posts || 0} postări</div>
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
                      {forumUser && (
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

                      {/* Sticky Topics - COMPLET SEPARAT, sub butonul "Topic nou", deasupra topicurilor normale */}
                      {stickyTopics.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{
                            backgroundColor: theme.surface,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '0.75rem',
                            overflow: 'hidden'
                          }}>
                            {/* Header pentru sticky topics - Mobil */}
                            <div className="sm:hidden" style={{
                              backgroundColor: theme.background,
                              borderBottom: `1px solid ${theme.border}`,
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: theme.textSecondary,
                              textTransform: 'uppercase',
                              letterSpacing: '0.025em'
                            }}>
                              Topicuri Fixate
                            </div>
                            {/* Header pentru sticky topics */}
                            <div className="hidden sm:grid" style={{
                              backgroundColor: theme.background,
                              borderBottom: `1px solid ${theme.border}`,
                              padding: '0.75rem 1rem',
                              gridTemplateColumns: 'minmax(0, 1fr) 40px 100px 100px 220px',
                              gap: '0.75rem',
                              alignItems: 'center',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: theme.textSecondary,
                              textTransform: 'uppercase',
                              letterSpacing: '0.025em',
                              boxSizing: 'border-box',
                              width: '100%'
                            }}>
                              <div style={{ gridColumn: '1' }}>Topicuri Fixate</div>
                              <div style={{ gridColumn: '2' }}></div>
                              <div style={{ gridColumn: '3', textAlign: 'center', paddingLeft: '1rem' }}>Răspunsuri</div>
                              <div style={{ gridColumn: '4', textAlign: 'center', paddingLeft: '1rem' }}>Vizualizări</div>
                              <div style={{ gridColumn: '5', textAlign: 'right', paddingRight: '0.5rem' }}>Ultima postare</div>
                            </div>
                            {/* Lista sticky topics */}
                            {stickyTopics.map((topic) => renderTopicItem(topic))}
                          </div>
                        </div>
                      )}

                      {/* Normal Topics (inclusiv important) - chenar separat */}
                      {(importantTopics.length > 0 || normalTopics.length > 0) && (
                        <div style={{
                          backgroundColor: theme.surface,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '0.75rem',
                          overflow: 'hidden'
                        }}>
                          {/* Header pentru topicuri normale - Mobil */}
                          <div className="sm:hidden" style={{
                            backgroundColor: theme.background,
                            borderBottom: `1px solid ${theme.border}`,
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: theme.textSecondary,
                            textTransform: 'uppercase',
                            letterSpacing: '0.025em'
                          }}>
                            Topic
                          </div>
                          <div className="hidden sm:grid" style={{
                            backgroundColor: theme.background,
                            borderBottom: `1px solid ${theme.border}`,
                            padding: '0.75rem 1rem',
                            gridTemplateColumns: 'minmax(0, 1fr) 40px 100px 100px 220px',
                            gap: '0.75rem',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: theme.textSecondary,
                            textTransform: 'uppercase',
                            letterSpacing: '0.025em',
                            boxSizing: 'border-box',
                            width: '100%'
                          }}>
                            <div style={{ gridColumn: '1' }}>Topic</div>
                            <div style={{ gridColumn: '2' }}></div>
                            <div style={{ gridColumn: '3', textAlign: 'center', paddingLeft: '1rem' }}>Răspunsuri</div>
                            <div style={{ gridColumn: '4', textAlign: 'center', paddingLeft: '1rem' }}>Vizualizări</div>
                            <div style={{ gridColumn: '5', textAlign: 'right', paddingRight: '0.5rem' }}>Ultima postare</div>
                          </div>

                          {/* Important Topics - doar badge, fără chenar separat, apar primele în listă */}
                          {importantTopics.map((topic) => renderTopicItem(topic))}

                          {/* Normal Topics */}
                          {normalTopics.map((topic) => renderTopicItem(topic))}
                        </div>
                      )}

                      {/* Create Topic Button - Bottom (dupa topicuri) */}
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

                      {/* Fără topicuri */}
                      {topics.length === 0 && !topicsIsLoading && (
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
              categoryId={breadcrumbs.find(b => b.type === 'category')?.slug || slugToUse || ''}
              subcategoryId={subcategoryId}
              subforumId={subforumId}
              isSubforum={!!subforumId}
              onSuccess={() => {
                setShowCreateModal(false);
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
