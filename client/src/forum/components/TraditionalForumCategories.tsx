import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, Users, Clock } from 'lucide-react';
import { forumStorage, ForumCategory } from '../services/forumService';
import { useTheme } from '../contexts/ThemeContext';

interface TraditionalForumCategoriesProps {
  onSubcategoryClick: (subcategoryId: string) => void;
}

export default function TraditionalForumCategories({ onSubcategoryClick }: TraditionalForumCategoriesProps) {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const loadCategories = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulăm loading
    const cats = forumStorage.getCategories();
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleToggleCollapse = (categoryId: string) => {
    forumStorage.toggleCategoryCollapse(categoryId);
    loadCategories(); // Reîncarcă pentru a reflecta starea
  };

  const formatTime = (timeStr: string) => {
    // Convertește timpul relativ în format mai frumos
    return timeStr;
  };

  if (loading) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '0.5rem', 
        border: '1px solid #e5e7eb', 
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎣</div>
        <div>Se încarcă categoriile...</div>
      </div>
    );
  }

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
        backgroundColor: '#f8fafc', 
        borderBottom: '1px solid #e5e7eb',
        padding: '0.75rem 1rem',
        display: 'grid',
        gridTemplateColumns: '1fr 80px 80px 200px',
        gap: '1rem',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#6b7280',
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
              backgroundColor: '#fafbfc',
              borderBottom: '1px solid #e5e7eb',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              display: 'grid',
              gridTemplateColumns: '1fr 80px 80px 200px',
              gap: '1rem',
              alignItems: 'center'
            }}
            onClick={() => handleToggleCollapse(category.id)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafbfc'}
          >
            {/* Category Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {category.isCollapsed ? (
                <ChevronRight style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />
              ) : (
                <ChevronDown style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />
              )}
              
              <div style={{ fontSize: '1.5rem' }}>{category.icon}</div>
              
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
                  {category.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {category.description}
                </div>
              </div>
            </div>

            {/* Total Topics */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              {category.totalTopics.toLocaleString('ro-RO')}
            </div>

            {/* Total Posts */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              {category.totalPosts.toLocaleString('ro-RO')}
            </div>

            {/* Last Post */}
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {category.lastPost ? (
                <div>
                  <div style={{ fontWeight: '500', color: '#374151', marginBottom: '0.125rem' }}>
                    {category.lastPost.topicTitle.length > 30 
                      ? category.lastPost.topicTitle.substring(0, 30) + '...' 
                      : category.lastPost.topicTitle}
                  </div>
                  <div>
                    de <span style={{ fontWeight: '500' }}>{category.lastPost.author}</span>
                  </div>
                  <div>{formatTime(category.lastPost.time)}</div>
                </div>
              ) : (
                <div style={{ color: '#9ca3af' }}>Fără postări</div>
              )}
            </div>
          </div>

          {/* Subcategories */}
          {!category.isCollapsed && (
            <div>
              {category.subcategories.map((subcategory, index) => (
                <div 
                  key={subcategory.id}
                  style={{
                    backgroundColor: 'white',
                    borderBottom: index === category.subcategories.length - 1 ? 'none' : '1px solid #f1f5f9',
                    padding: '0.75rem 1rem',
                    paddingLeft: '3rem', // Indent pentru sub-categorii
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 80px 200px',
                    gap: '1rem',
                    alignItems: 'center'
                  }}
                  onClick={() => onSubcategoryClick(subcategory.id)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  {/* Subcategory Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: '#3b82f6',
                      borderRadius: '50%'
                    }} />
                    
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', marginBottom: '0.125rem' }}>
                        {subcategory.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {subcategory.description}
                      </div>
                    </div>
                  </div>

                  {/* Topics */}
                  <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#374151' }}>
                    {subcategory.topicCount}
                  </div>

                  {/* Posts */}
                  <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#374151' }}>
                    {subcategory.postCount}
                  </div>

                  {/* Last Post */}
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {subcategory.lastPost ? (
                      <div>
                        <div style={{ fontWeight: '500', color: '#374151', marginBottom: '0.125rem' }}>
                          {subcategory.lastPost.topicTitle.length > 25 
                            ? subcategory.lastPost.topicTitle.substring(0, 25) + '...' 
                            : subcategory.lastPost.topicTitle}
                        </div>
                        <div>
                          de <span style={{ fontWeight: '500' }}>{subcategory.lastPost.author}</span>
                        </div>
                        <div>{formatTime(subcategory.lastPost.time)}</div>
                      </div>
                    ) : (
                      <div style={{ color: '#9ca3af' }}>Fără postări</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Separator între categorii principale */}
          <div style={{ height: '0.5rem', backgroundColor: '#f8fafc' }} />
        </div>
      ))}

      {/* Marea Neagră - Coming Soon */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        padding: '0.75rem 1rem',
        display: 'grid',
        gridTemplateColumns: '1fr 80px 80px 200px',
        gap: '1rem',
        alignItems: 'center',
        opacity: 0.6
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ChevronRight style={{ width: '1rem', height: '1rem', color: '#9ca3af' }} />
          <div style={{ fontSize: '1.25rem' }}>🌊</div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.125rem' }}>
              Marea Neagră
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Pescuit marin și de coastă - Coming Soon 🔒
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#9ca3af' }}>-</div>
        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#9ca3af' }}>-</div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
          În curând...
        </div>
      </div>
    </div>
  );
}
