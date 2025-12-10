import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, MessageSquare, Eye } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useTheme } from '../contexts/ThemeContext';
import type { ForumCategory } from '../types/forum';
import ReadStatusMarker from './ReadStatusMarker';
import { useMultipleSubcategoriesUnreadStatus } from '../hooks/useTopicReadStatus';
import { useAuth } from '../hooks/useAuth';
import { usePrefetch } from '../hooks/usePrefetch';

interface MobileOptimizedCategoriesProps {
  onSubcategoryClick: (subcategoryId: string, categorySlug?: string, subcategorySlug?: string) => void;
}

export default function MobileOptimizedCategories({ onSubcategoryClick }: MobileOptimizedCategoriesProps) {
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
  
  const { hasUnread: hasUnreadSubcategory } = useMultipleSubcategoriesUnreadStatus(allSubcategoryIds);
  
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
                            hasUnread={hasUnreadSubcategory(subcategory.id)} 
                            style={{ marginRight: '0.25rem', alignSelf: 'center' }}
                          />
                        )}
                        <div style={{ fontSize: '1rem' }}>
                          {subcategory.icon || '📝'}
                        </div>
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
                          hasUnread={hasUnreadSubcategory(subcategory.id)} 
                          style={{ marginRight: '0.25rem' }}
                        />
                      )}
                      <div style={{ fontSize: '0.875rem' }}>
                        {subcategory.icon || '📝'}
                      </div>
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
                      {subcategory.lastPost ? (
                        <div>
                          <div style={{ fontWeight: '500', color: theme.text, marginBottom: '0.125rem', fontSize: '0.75rem' }}>
                            {subcategory.lastPost.topicTitle && (
                              subcategory.lastPost.topicTitle.length > 30 
                                ? subcategory.lastPost.topicTitle.substring(0, 30) + '...' 
                                : subcategory.lastPost.topicTitle
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.125rem' }}>
                            de <span style={{ fontWeight: '500' }}>{subcategory.lastPost.author}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                            {subcategory.lastPost.date && (
                              <span>{subcategory.lastPost.date} </span>
                            )}
                            <span>{subcategory.lastPost.timeOnly}</span>
                            {subcategory.lastPost.topicSlug && (
                              <Link
                                to={`/forum/${subcategory.lastPost.subforumSlug || subcategory.lastPost.subcategorySlug || ''}/${subcategory.lastPost.topicSlug}${subcategory.lastPost.postNumber ? `#post${subcategory.lastPost.postNumber}` : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Navigate programmatically to ensure it works
                                  window.location.href = `/forum/${subcategory.lastPost.subforumSlug || subcategory.lastPost.subcategorySlug || ''}/${subcategory.lastPost.topicSlug}${subcategory.lastPost.postNumber ? `#post${subcategory.lastPost.postNumber}` : ''}`;
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  color: theme.primary,
                                  textDecoration: 'none',
                                  marginLeft: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                                title="Permalink la ultima postare"
                              >
                                &gt;
                              </Link>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: theme.textSecondary }}>Fără postări</span>
                      )}
                    </div>
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
