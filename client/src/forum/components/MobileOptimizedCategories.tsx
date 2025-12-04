import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, Eye } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useTheme } from '../contexts/ThemeContext';
import type { ForumCategory } from '../types/forum';
import ReadStatusMarker from './ReadStatusMarker';
import { useMultipleSubcategoriesUnreadStatus } from '../hooks/useTopicReadStatus';
import { useAuth } from '../hooks/useAuth';
import { usePrefetch } from '../hooks/usePrefetch';

interface MobileOptimizedCategoriesProps {
  onSubcategoryClick: (subcategoryId: string) => void;
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

            {/* Mobile Subcategories */}
            {!collapsedCategories[category.id] && (
              <div style={{ backgroundColor: theme.background }}>
                {category.subcategories.map((subcategory) => (
                  <div
                    key={subcategory.id}
                    style={{
                      padding: '0.75rem 0.5rem 0.75rem 1rem',
                      borderBottom: `1px solid ${theme.border}`,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => onSubcategoryClick(subcategory.slug || subcategory.id)}
                    onTouchStart={(e) => e.currentTarget.style.backgroundColor = theme.surfaceHover}
                    onTouchEnd={(e) => e.currentTarget.style.backgroundColor = theme.background}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      {/* Read Status Marker - în stânga iconiței, 90-95% din înălțimea row-ului */}
                      {forumUser && (
                        <ReadStatusMarker 
                          hasUnread={hasUnreadSubcategory(subcategory.id)} 
                          style={{ marginRight: '0.25rem', alignSelf: 'center' }}
                        />
                      )}
                      {/* Icon subcategorie */}
                      <div style={{
                        fontSize: '1rem'
                      }}>
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
                        {subcategory.topicCount}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.65rem', color: theme.textSecondary, marginLeft: '0.75rem', lineHeight: '1.2' }}>
                      {subcategory.description}
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

          {/* Subcategories */}
          {!collapsedCategories[category.id] && (
            <div>
              {category.subcategories.map((subcategory, index) => (
                <div
                  key={subcategory.id}
                  style={{
                    backgroundColor: theme.surface,
                    borderBottom: index === category.subcategories.length - 1 ? 'none' : `1px solid ${theme.border}`,
                    padding: '0.75rem 1rem',
                    paddingLeft: '1rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 100px 220px',
                    gap: '0.75rem',
                    alignItems: 'center'
                  }}
                  onClick={() => onSubcategoryClick(subcategory.slug || subcategory.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                    // Prefetch subcategoria când utilizatorul trece cu mouse-ul
                    if (subcategory.id) {
                      prefetchSubcategory(subcategory.id);
                    }
                  }}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.surface}
                >
                  {/* Subcategory Name cu Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Read Status Marker - în stânga iconiței, 90-95% din înălțimea row-ului */}
                    {forumUser && (
                      <ReadStatusMarker 
                        hasUnread={hasUnreadSubcategory(subcategory.id)} 
                        style={{ marginRight: '0.25rem', alignSelf: 'center' }}
                      />
                    )}
                    {/* Icon subcategorie */}
                    <div style={{
                      fontSize: '1.5rem'
                    }}>
                      {subcategory.icon || '📝'}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: theme.text, marginBottom: '0.125rem' }}>
                        {subcategory.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                        {subcategory.description}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ textAlign: 'center', fontSize: '0.875rem', color: theme.text }}>
                    {subcategory.topicCount}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.875rem', color: theme.text }}>
                    {subcategory.postCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: theme.textSecondary, textAlign: 'center' }}>
                    {subcategory.lastPost ? (
                      <div>
                        {/* Primul rând: Data și ora centrate - întotdeauna afișate */}
                        <div style={{ textAlign: 'center', marginBottom: '0.125rem', fontSize: '0.75rem' }}>
                          {subcategory.lastPost.date ? (
                            <>
                              <span style={{ color: theme.textSecondary, marginRight: '0.25rem' }}>{subcategory.lastPost.date}</span>
                              <span style={{ color: theme.text, fontWeight: '600' }}>{subcategory.lastPost.timeOnly || '00:00'}</span>
                            </>
                          ) : (
                            subcategory.lastPost.timeOnly ? (
                              <span style={{ color: theme.text, fontWeight: '600' }}>{subcategory.lastPost.timeOnly}</span>
                            ) : (
                              <span style={{ color: theme.text, fontWeight: '600' }}>{subcategory.lastPost.time || '00:00'}</span>
                            )
                          )}
                        </div>
                        {/* Al doilea rând: postat de [user] > - centrate */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                          <span>postat de</span>
                          <span style={{ fontWeight: '500' }}>{subcategory.lastPost.author}</span>
                          {subcategory.lastPost.subcategorySlug && subcategory.lastPost.topicSlug && subcategory.lastPost.postNumber && (
                            <a
                              href={`/forum/${subcategory.lastPost.subcategorySlug}/${subcategory.lastPost.topicSlug}#post${subcategory.lastPost.postNumber}`}
                              onClick={(e) => {
                                e.preventDefault();
                                window.location.href = `/forum/${subcategory.lastPost.subcategorySlug}/${subcategory.lastPost.topicSlug}#post${subcategory.lastPost.postNumber}`;
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                color: theme.primary,
                                textDecoration: 'none',
                                marginLeft: '0.125rem',
                                transition: 'color 0.2s',
                                fontSize: '0.875rem'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = theme.secondary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = theme.primary;
                              }}
                              title="Permalink la ultima postare"
                            >
                              &gt;
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: theme.textSecondary }}>Fără postări</div>
                    )}
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
