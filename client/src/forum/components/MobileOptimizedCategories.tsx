import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, Eye } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useTheme } from '../contexts/ThemeContext';
import type { ForumCategory } from '../types/forum';

interface MobileOptimizedCategoriesProps {
  onSubcategoryClick: (subcategoryId: string) => void;
}

export default function MobileOptimizedCategories({ onSubcategoryClick }: MobileOptimizedCategoriesProps) {
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useTheme();

  // Try Supabase first
  const { categories: supabaseCategories, loading: supabaseLoading, error } = useCategories();

  // Local state for collapse
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const categories = supabaseCategories || [];
  const loading = supabaseLoading && categories.length === 0;

  const handleToggleCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: theme.surface,
        borderRadius: '0.5rem',
        border: `1px solid ${theme.border}`,
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎣</div>
        <div style={{ color: theme.text }}>Se încarcă categoriile...</div>
      </div>
    );
  }

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

                <div style={{ fontSize: '1rem' }}>{category.icon}</div>

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
                      padding: '0.75rem 0.5rem 0.75rem 2rem',
                      borderBottom: `1px solid ${theme.border}`,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => onSubcategoryClick(subcategory.slug || subcategory.id)}
                    onTouchStart={(e) => e.currentTarget.style.backgroundColor = theme.surfaceHover}
                    onTouchEnd={(e) => e.currentTarget.style.backgroundColor = theme.background}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <div style={{
                        width: '0.25rem',
                        height: '0.25rem',
                        backgroundColor: theme.primary,
                        borderRadius: '50%'
                      }} />

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

              <div style={{ fontSize: '1.5rem' }}>{category.icon}</div>

              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: theme.text, marginBottom: '0.125rem' }}>
                  {category.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                  {category.description}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: '500', color: theme.text }}>
              {(category.totalTopics ?? 0).toLocaleString('ro-RO')}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: '500', color: theme.text }}>
              {(category.totalPosts ?? 0).toLocaleString('ro-RO')}
            </div>
            <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
              {category.lastPost ? (
                <div>
                  <div style={{ fontWeight: '500', color: theme.text, marginBottom: '0.125rem' }}>
                    {category.lastPost.topicTitle.length > 30
                      ? category.lastPost.topicTitle.substring(0, 30) + '...'
                      : category.lastPost.topicTitle}
                  </div>
                  <div>de <span style={{ fontWeight: '500' }}>{category.lastPost.author}</span></div>
                  <div>{category.lastPost.time}</div>
                </div>
              ) : (
                <div style={{ color: theme.textSecondary }}>Fără postări</div>
              )}
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
                    paddingLeft: '3rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 100px 220px',
                    gap: '0.75rem',
                    alignItems: 'center'
                  }}
                  onClick={() => onSubcategoryClick(subcategory.slug || subcategory.id)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.surface}
                >
                  {/* Subcategory Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: theme.primary,
                      borderRadius: '50%'
                    }} />

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
                  <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                    {subcategory.lastPost ? (
                      <div>
                        <div style={{ fontWeight: '500', color: theme.text, marginBottom: '0.125rem' }}>
                          {subcategory.lastPost.topicTitle.length > 25
                            ? subcategory.lastPost.topicTitle.substring(0, 25) + '...'
                            : subcategory.lastPost.topicTitle}
                        </div>
                        <div>de <span style={{ fontWeight: '500' }}>{subcategory.lastPost.author}</span></div>
                        <div>{subcategory.lastPost.time}</div>
                      </div>
                    ) : (
                      <div style={{ color: theme.textSecondary }}>Fără postări</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Separator */}
          <div style={{ height: '0.5rem', backgroundColor: theme.background }} />
        </div>
      ))}

    </div>
  );
}
