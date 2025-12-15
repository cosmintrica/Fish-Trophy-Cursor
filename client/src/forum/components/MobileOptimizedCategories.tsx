import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, MessageSquare, Eye } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useTheme } from '../contexts/ThemeContext';
import type { ForumCategory } from '../types/forum';
import ReadStatusMarker from './ReadStatusMarker';
import { useMultipleSubcategoriesUnreadStatus, useMultipleSubforumsUnreadStatus } from '../hooks/useTopicReadStatus';
import { useAuth } from '../hooks/useAuth';
import { usePrefetch } from '../hooks/usePrefetch';
import { getForumSetting } from '../../services/forum/categories';

interface MobileOptimizedCategoriesProps {
  onSubcategoryClick: (subcategoryId: string, categorySlug?: string, subcategorySlug?: string) => void;
}

// Helper to compare last posts
const getLatestPost = (
  mainPost: any | null,
  subforums: any[] = []
) => {
  let latest = mainPost;
  let latestDate = mainPost?.date ? new Date((mainPost.date.includes('.') ? mainPost.date.split('.').reverse().join('-') : mainPost.date) + ' ' + mainPost.timeOnly) : null;
  // Fallback for "Azi HH:MM" which doesn't have date
  if (mainPost?.time?.includes(':') && !mainPost?.date) {
    latestDate = new Date(); // Assume today
    const [h, m] = mainPost.time.split(':');
    latestDate.setHours(parseInt(h), parseInt(m), 0);
  }


  for (const sf of subforums) {
    if (sf.lastPost) {
      let sfDate = sf.lastPost.date ? new Date((sf.lastPost.date.includes('.') ? sf.lastPost.date.split('.').reverse().join('-') : sf.lastPost.date) + ' ' + sf.lastPost.timeOnly) : null;
      if (sf.lastPost.time?.includes(':') && !sf.lastPost.date) {
        sfDate = new Date();
        const [h, m] = sf.lastPost.time.split(':');
        sfDate.setHours(parseInt(h), parseInt(m), 0);
      }

      if (!latest || (sfDate && latestDate && sfDate > latestDate)) {
        latest = sf.lastPost;
        latestDate = sfDate;
      }
    }
  }
  return latest;
};

export default function MobileOptimizedCategories({ onSubcategoryClick }: MobileOptimizedCategoriesProps) {
  // Load setting from database (global for all users)
  const [showIcons, setShowIcons] = useState(false);

  useEffect(() => {
    const loadSetting = async () => {
      const { getForumSetting } = await import('../../services/forum/categories');
      const result = await getForumSetting('show_subcategory_icons');
      if (result.data !== null) {
        setShowIcons(result.data === 'true');
      }
    };
    loadSetting();
    
    // Poll for changes every 30 seconds (or use React Query for real-time updates)
    const interval = setInterval(loadSetting, 30000);
    return () => clearInterval(interval);
  }, []);
  const { theme } = useTheme();

  // Try Supabase first
  const { categories: supabaseCategories } = useCategories();

  // Local state for collapse
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const categories = supabaseCategories || [];
  const { forumUser } = useAuth();

  // Hook pentru prefetch pe hover
  const { prefetchSubcategory } = usePrefetch();

  // Hook pentru status-ul read/unread al subcategoriilor
  const allSubcategoryIds = useMemo(() => {
    return categories.flatMap(cat => cat.subcategories?.map(sub => sub.id) || []);
  }, [categories]);

  // Hook pentru status-ul read/unread al subforumurilor
  const allSubforumIds = useMemo(() => {
    return categories.flatMap(cat =>
      cat.subcategories?.flatMap(sub =>
        sub.subforums?.map((sf: any) => sf.id) || []
      ) || []
    );
  }, [categories]);

  const { hasUnread: hasUnreadSubcategory } = useMultipleSubcategoriesUnreadStatus(allSubcategoryIds);


  const { hasUnread: hasUnreadSubforum } = useMultipleSubforumsUnreadStatus(allSubforumIds);

  const getEffectiveUnread = (subcategory: any) => {
    if (hasUnreadSubcategory(subcategory.id)) return true;
    if (subcategory.subforums?.some((sf: any) => hasUnreadSubforum(sf.id))) return true;
    return false;
  }

  // Detectează dacă e mobil
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Nu mai afișăm loading - afișăm conținutul instant

  if (isMobile) {
    // Mobile layout - simplified
    return (
      <div style={{
        backgroundColor: theme.surface,
        borderRadius: '0.5rem',
        border: `1px solid ${theme.border}`,
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        {/* Mobile Header */}
        <div style={{
          backgroundColor: theme.background,
          borderBottom: `1px solid ${theme.border}`,
          padding: '1rem',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: theme.text, margin: 0 }}>
            📝 Categorii Forum
          </h3>
        </div>

        {/* Mobile Categories */}
        {categories.map((category) => (
          <div key={category.id}>
            {/* Category Card */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderBottom: `1px solid ${theme.border}`,
                padding: '1rem 0.75rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={() => handleToggleCollapse(category.id)}
              onTouchStart={(e) => e.currentTarget.style.backgroundColor = theme.surfaceHover}
              onTouchEnd={(e) => e.currentTarget.style.backgroundColor = theme.surface}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {collapsedCategories[category.id] ? (
                  <ChevronRight style={{ width: '0.875rem', height: '0.875rem', color: theme.textSecondary }} />
                ) : (
                  <ChevronDown style={{ width: '0.875rem', height: '0.875rem', color: theme.textSecondary }} />
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: theme.text, lineHeight: '1.2' }}>
                    {category.name}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.7rem',
                  color: theme.textSecondary,
                  backgroundColor: theme.background,
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem'
                }}>
                  <MessageSquare style={{ width: '0.625rem', height: '0.625rem' }} />
                  <span>{category.totalTopics ?? 0}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.7rem', color: theme.textSecondary, marginLeft: '1.5rem', lineHeight: '1.3' }}>
                {category.description}
              </div>
            </div>

            {/* Mobile Subcategories (which contain subforums) */}
            {!collapsedCategories[category.id] && (
              <div style={{ backgroundColor: theme.background }}>
                {category.subcategories?.map((subcategory) => (
                  <div key={subcategory.id}>
                    {/* Subcategory Header */}
                    <div
                      style={{
                        padding: '0.75rem 0.5rem 0.75rem 1rem',
                        borderBottom: `1px solid ${theme.border}`,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onClick={() => {
                        onSubcategoryClick(
                          subcategory.slug || subcategory.id,
                          category.slug,
                          subcategory.slug || undefined
                        );
                      }}
                      onTouchStart={(e) => e.currentTarget.style.backgroundColor = theme.surfaceHover}
                      onTouchEnd={(e) => e.currentTarget.style.backgroundColor = theme.background}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        {forumUser && (
                          <ReadStatusMarker
                            hasUnread={getEffectiveUnread(subcategory)}
                            style={{ marginRight: '0.25rem', alignSelf: 'center' }}
                          />
                        )}
                        {showIcons && subcategory.icon && (
                          <div style={{ fontSize: '1rem' }}>
                            {subcategory.icon}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', fontWeight: '500', color: theme.text, flex: 1, lineHeight: '1.2' }}>
                          {subcategory.name}
                        </div>
                        <div style={{
                          fontSize: '0.65rem',
                          color: theme.textSecondary,
                          backgroundColor: theme.surface,
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem'
                        }}>
                          {subcategory.topicCount || 0}
                        </div>
                      </div>
                      {subcategory.description && (
                        <div style={{ fontSize: '0.65rem', color: theme.textSecondary, marginLeft: '0.75rem', lineHeight: '1.2' }}>
                          {subcategory.description}
                        </div>
                      )}
                    </div>
                    {/* Subforums are NOT displayed on homepage - they appear in CategoryPage */}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

      </div>
    );
  }

  // Desktop layout - same as before but with theme support
  return (
    <div style={{
      backgroundColor: theme.surface,
      borderRadius: '0.5rem',
      border: `1px solid ${theme.border}`,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: theme.background,
        borderBottom: `1px solid ${theme.border}`,
        padding: '0.75rem 1rem',
        display: 'grid',
        gridTemplateColumns: '1fr 100px 100px 220px',
        gap: '0.75rem',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: theme.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '0.025em'
      }}>
        <div>Forum</div>
        <div style={{ textAlign: 'center' }}>Subiecte</div>
        <div style={{ textAlign: 'center' }}>Postări</div>
        <div style={{ textAlign: 'center' }}>Ultimul post</div>
      </div>

      {/* Categories */}
      {categories.map((category) => (
        <div key={category.id}>
          {/* Category Header */}
          <div
            style={{
              backgroundColor: theme.background,
              borderBottom: `1px solid ${theme.border}`,
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              display: 'grid',
              gridTemplateColumns: '1fr 100px 100px 220px',
              gap: '0.75rem',
              alignItems: 'center'
            }}
            onClick={() => handleToggleCollapse(category.id)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.surfaceHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.background}
          >
            {/* Category Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {collapsedCategories[category.id] ? (
                <ChevronRight style={{ width: '1rem', height: '1rem', color: theme.textSecondary }} />
              ) : (
                <ChevronDown style={{ width: '1rem', height: '1rem', color: theme.textSecondary }} />
              )}

              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: theme.text, marginBottom: '0.125rem' }}>
                  {category.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                  {category.description}
                </div>
              </div>
            </div>

            {/* Stats - GOALE pentru categorie principală (ca în screenshot) */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: '500', color: theme.text }}>
              {/* Gol */}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: '500', color: theme.text }}>
              {/* Gol */}
            </div>
            <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
              {/* Gol */}
            </div>
          </div>

          {/* Subcategories (which contain subforums) */}
          {!collapsedCategories[category.id] && (
            <div>
              {category.subcategories?.map((subcategory, index) => (
                <div key={subcategory.id}>
                  {/* Subcategory */}
                  <div
                    style={{
                      backgroundColor: theme.surface,
                      borderBottom: index === (category.subcategories?.length || 0) - 1 ? 'none' : `1px solid ${theme.border}`,
                      padding: '0.75rem 1rem',
                      paddingLeft: '1rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'grid',
                      gridTemplateColumns: '1fr 100px 100px 220px',
                      gap: '0.75rem',
                      alignItems: 'center'
                    }}
                    onClick={() => {
                      onSubcategoryClick(
                        subcategory.slug || subcategory.id,
                        category.slug,
                        subcategory.slug || undefined
                      );
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.surfaceHover}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.surface}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {forumUser && (
                        <ReadStatusMarker
                          hasUnread={getEffectiveUnread(subcategory)}
                          style={{ marginRight: '0.25rem' }}
                        />
                      )}
                      {showIcons && (
                        <div style={{ fontSize: '0.875rem' }}>
                          {subcategory.icon || '📝'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: theme.text, marginBottom: '0.125rem' }}>
                          {subcategory.name}
                        </div>
                        {subcategory.description && (
                          <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                            {subcategory.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.875rem', color: theme.text }}>
                      {subcategory.topicCount || 0}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.875rem', color: theme.text }}>
                      {subcategory.postCount || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: theme.textSecondary, textAlign: 'center' }}>
                      {(() => {
                        const effectiveLastPost = getLatestPost(subcategory.lastPost, subcategory.subforums);
                        return effectiveLastPost ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%', gap: '0.25rem' }}>

                            {/* 1. Link Topic Title */}
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', textAlign: 'right' }}>
                              {effectiveLastPost.topicTitle && (
                                <Link
                                  to={`/forum/${effectiveLastPost.subforumSlug || effectiveLastPost.subcategorySlug || ''}/${effectiveLastPost.topicSlug}${effectiveLastPost.postNumber ? `#post${effectiveLastPost.postNumber}` : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  style={{
                                    textDecoration: 'none',
                                    color: theme.text
                                  }}
                                  title={effectiveLastPost.topicTitle}
                                >
                                  {effectiveLastPost.topicTitle.length > 25
                                    ? effectiveLastPost.topicTitle.substring(0, 25) + '...'
                                    : effectiveLastPost.topicTitle}
                                </Link>
                              )}
                            </div>

                            {/* 2. Date and Time */}
                            <div style={{ color: '#ef4444', fontWeight: '600' }}>
                              {effectiveLastPost.date && <span>{effectiveLastPost.date} </span>}
                              <span style={{ color: theme.textSecondary, fontWeight: '400', marginLeft: '4px' }}>
                                {effectiveLastPost.timeOnly}
                              </span>
                            </div>

                            {/* 3. Author and Arrow */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                              <span>
                                de <span style={{ color: theme.primary, fontWeight: '600' }}>{effectiveLastPost.author}</span>
                              </span>
                              {/* Arrow Link */}
                              {effectiveLastPost.topicSlug && (
                                <Link
                                  to={`/forum/${effectiveLastPost.subforumSlug || effectiveLastPost.subcategorySlug || ''}/${effectiveLastPost.topicSlug}${effectiveLastPost.postNumber ? `#post${effectiveLastPost.postNumber}` : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  style={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginLeft: '2px',
                                    textDecoration: 'none'
                                  }}
                                  title="Mergi la ultima postare"
                                >
                                  <div style={{
                                    minWidth: '14px',
                                    width: '14px',
                                    height: '14px',
                                    backgroundColor: 'white',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <span style={{ fontSize: '10px', lineHeight: 1, color: '#374151', marginTop: '-1px' }}>▶</span>
                                  </div>
                                </Link>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: theme.textSecondary }}>-</span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      ))}
    </div>
  );
}
