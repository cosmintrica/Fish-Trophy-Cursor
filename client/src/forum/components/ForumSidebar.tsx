import { Users, MessageSquare, TrendingUp, Clock } from 'lucide-react';

interface ForumSidebarProps {
  stats: {
    total_users: number;
    total_topics: number;
    total_posts: number;
    online_users: number;
    newest_user?: {
      id: string;
      username: string;
    };
  };
  onlineUsers: Array<{
    id: string;
    username: string;
    rank: string;
  }>;
  recentPosts: Array<{
    id: string;
    title: string;
    user_name: string;
    created_at: string;
    category_name: string;
  }>;
}

export default function ForumSidebar({ stats, onlineUsers, recentPosts }: ForumSidebarProps) {
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

  return (
    <aside className="w-80 space-y-6">
      {/* Statistici Forum */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp size={20} className="mr-2 text-primary-500" />
          Statistici Forum
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total membri:</span>
            <span className="font-semibold text-gray-900">{formatNumber(stats.total_users)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total topicuri:</span>
            <span className="font-semibold text-gray-900">{formatNumber(stats.total_topics)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total postări:</span>
            <span className="font-semibold text-gray-900">{formatNumber(stats.total_posts)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Utilizatori online:</span>
            <span className="font-semibold text-secondary-600">{stats.online_users}</span>
          </div>
          
          {stats.newest_user && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Cel mai nou membru: 
                <a 
                  href={`/forum/user/${stats.newest_user.username}`}
                  className="ml-1 text-primary-600 hover:text-primary-700 font-medium"
                >
                  {stats.newest_user.username}
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Utilizatori Online */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users size={20} className="mr-2 text-secondary-500" />
          Utilizatori Online ({onlineUsers.length})
        </h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {onlineUsers.map((user) => (
            <div key={user.id} className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <a 
                href={`/forum/user/${user.username}`}
                className="text-sm text-gray-700 hover:text-primary-600 flex-1"
              >
                {user.username}
              </a>
              <span className={`user-rank rank-${user.rank}`}>
                {user.rank}
              </span>
            </div>
          ))}
          
          {onlineUsers.length === 0 && (
            <p className="text-sm text-gray-500 italic">Nu sunt utilizatori online</p>
          )}
        </div>
      </div>

      {/* Postări Recente */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock size={20} className="mr-2 text-accent-500" />
          Postări Recente
        </h3>
        
        <div className="space-y-3">
          {recentPosts.map((post) => (
            <div key={post.id} className="border-l-2 border-gray-200 pl-3">
              <a 
                href={`/forum/topic/${post.id}`}
                // TODO: Actualizează când ai categorySlug/subcategorySlug disponibile
                className="text-sm font-medium text-gray-900 hover:text-primary-600 line-clamp-2"
              >
                {post.title}
              </a>
              <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                <span>de {post.user_name}</span>
                <span>{formatTimeAgo(post.created_at)}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                în {post.category_name}
              </div>
            </div>
          ))}
          
          {recentPosts.length === 0 && (
            <p className="text-sm text-gray-500 italic">Nu sunt postări recente</p>
          )}
        </div>
      </div>

      {/* Spațiu publicitar */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
        <div className="text-xs text-gray-400 mb-2">PUBLICITATE</div>
        <div className="bg-white border border-gray-200 rounded p-6 min-h-[200px] flex items-center justify-center">
          <div className="text-gray-400 text-sm">
            Banner 300x250
            <br />
            Magazin Echipament Pescuit
          </div>
        </div>
      </div>

      {/* Link către Fish Trophy */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg p-4 text-white">
        <h4 className="font-semibold mb-2">🏆 Fish Trophy</h4>
        <p className="text-sm text-white/90 mb-3">
          Înregistrează-ți capturile și găsește cele mai bune locuri de pescuit!
        </p>
        <a 
          href="https://fishtrophy.ro"
          className="inline-block bg-white/20 hover:bg-white/30 px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          Vizitează Fish Trophy
        </a>
      </div>
    </aside>
  );
}
