import { MessageSquare, Users, Clock, Pin } from 'lucide-react';
import type { ForumCategory } from '../types/forum';

interface CategoryListProps {
  categories: ForumCategory[];
  loading?: boolean;
}

export default function CategoryList({ categories, loading }: CategoryListProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString('ro-RO');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'acum';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}z`;
  };

  // Nu mai afișăm loading - conținutul apare instant

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header categorie */}
          <div className="bg-primary-500 text-white px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="category-icon bg-white/20">
                <span className="text-2xl">{category.icon}</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{category.name}</h2>
                {category.description && (
                  <p className="text-blue-100 text-sm mt-1">{category.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Subcategorii */}
          <div className="divide-y divide-gray-200">
            {category.subcategories && category.subcategories.length > 0 ? (
              category.subcategories.map((subcategory) => (
                <div key={subcategory.id} className="hover:bg-gray-50 transition-colors">
                  <a href={`/forum/${category.slug || category.id}/${subcategory.slug || subcategory.id}`} className="block p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Icon subcategorie */}
                        <div className="category-icon bg-secondary-500 text-sm">
                          <span>{subcategory.icon || '📋'}</span>
                        </div>
                        
                        {/* Info subcategorie */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                            {subcategory.name}
                            {subcategory.moderator_only && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Pin size={12} className="mr-1" />
                                Moderatori
                              </span>
                            )}
                          </h3>
                          {subcategory.description && (
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                              {subcategory.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Statistici */}
                      <div className="flex items-center space-x-8 text-sm text-gray-500 ml-4">
                        <div className="flex items-center space-x-1">
                          <MessageSquare size={16} />
                          <span>{formatNumber(subcategory.stats?.topic_count || 0)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users size={16} />
                          <span>{formatNumber(subcategory.stats?.post_count || 0)}</span>
                        </div>
                        
                        {/* Ultima postare */}
                        {subcategory.stats?.last_post && (
                          <div className="text-right min-w-0">
                            <div className="text-xs text-gray-400">
                              {formatTimeAgo(subcategory.stats.last_post.created_at)}
                            </div>
                            <div className="text-xs text-gray-600 truncate max-w-32">
                              de {subcategory.stats.last_post.user_name}
                            </div>
              <span className="text-xs text-blue-600 hover:text-blue-700 truncate max-w-32 block cursor-pointer">
                {subcategory.stats.last_post.topic_title}
              </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Nu există subcategorii în această categorie.</p>
              </div>
            )}
          </div>

          {/* Footer cu statistici totale categorie */}
          {category.stats && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <MessageSquare size={14} className="mr-1" />
                    {formatNumber(category.stats.topic_count)} topicuri
                  </span>
                  <span className="flex items-center">
                    <Users size={14} className="mr-1" />
                    {formatNumber(category.stats.post_count)} postări
                  </span>
                </div>
                
                {category.stats.last_post && (
                  <div className="text-right">
                    <div className="text-xs">
                      Ultima postare {formatTimeAgo(category.stats.last_post.created_at)} 
                      de {category.stats.last_post.user_name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {categories.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <MessageSquare size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nu există categorii</h3>
          <p className="text-gray-500">
            Forum-ul este în curs de configurare. Categoriile vor fi disponibile în curând.
          </p>
        </div>
      )}
    </div>
  );
}
