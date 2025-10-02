import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Users, Clock, Pin, Lock, Plus } from 'lucide-react';
import { forumStorage, ForumTopic } from '../services/forumService';
import CreateTopicModal from '../components/CreateTopicModal';
import ActiveViewers from '../components/ActiveViewers';
import ForumLayout, { ForumUser } from '../components/ForumLayout';
import { useAuth } from '../hooks/useAuth';

interface Topic {
  id: string;
  title: string;
  author: string;
  authorRank: string;
  replies: number;
  views: number;
  lastPost: {
    author: string;
    time: string;
  };
  isPinned?: boolean;
  isLocked?: boolean;
}

export default function CategoryPage() {
  const { categoryId } = useParams();
  const { forumUser } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadTopics = async () => {
    setLoading(true);
    
    // Loading instant - fără delay artificial
    if (categoryId) {
      const categoryTopics = forumStorage.getTopicsByCategory(categoryId);
      setTopics(categoryTopics);
      
      // Set category name cu toate categoriile posibile
      const categoryNames: { [key: string]: string } = {
        // Categorii principale
        'pescuit-crap': 'Pescuit la Crap',
        'pescuit-pastrav': 'Pescuit la Păstrăv',
        'echipament': 'Echipament și Accesorii',
        'locatii': 'Locații de Pescuit',
        'comunitate': 'Comunitate și Evenimente',
        
        // Sub-categorii Crap
        'tehnici-crap': 'Tehnici și Tactici Crap',
        'momeli-crap': 'Momeli și Arome Crap',
        'echipament-crap': 'Echipament pentru Crap',
        
        // Sub-categorii Păstrăv
        'pastrav-munte': 'Păstrăv de Munte',
        'pastrav-iazuri': 'Iazuri de Păstrăv',
        
        // Sub-categorii Echipament
        'lansete-mulinete': 'Lansete și Mulinete',
        'accesorii': 'Accesorii și Gadget-uri',
        
        // Sub-categorii Locații
        'lacuri-balti': 'Lacuri și Bălți',
        'rauri': 'Râuri și Canale',
        
        // Sub-categorii Comunitate
        'discutii-generale': 'Discuții Generale',
        'concursuri': 'Concursuri și Evenimente'
      };
      
      // Dacă nu găsește categoria, încearcă să o găsească în categoriile disponibile
      let foundName = categoryNames[categoryId];
      if (!foundName) {
        const categories = forumStorage.getCategories();
        const category = categories.find(c => c.id === categoryId);
        if (category) {
          foundName = category.name;
        } else {
          // Caută în sub-categorii
          for (const cat of categories) {
            const subcat = cat.subcategories.find(sc => sc.id === categoryId);
            if (subcat) {
              foundName = subcat.name;
              break;
            }
          }
        }
      }
      
      setCategoryName(foundName || `Categorie ${categoryId}`);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadTopics();
  }, [categoryId]);

  const handleTopicClick = (topicId: string) => {
    // Incrementăm views
    forumStorage.incrementTopicViews(topicId);
    // Navigăm la topic
    window.location.href = `/forum/topic/${topicId}`;
  };

  const handleTopicCreated = () => {
    loadTopics(); // Reîncarcă lista de topicuri
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)', paddingTop: '4rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎣</div>
            <div>Se încarcă topicurile...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ForumLayout user={forumUser ? { id: forumUser.id, username: forumUser.username, email: '', isAdmin: false } as ForumUser : null} onLogin={() => {}} onLogout={() => {}}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Breadcrumbs */}
        <nav style={{ marginBottom: '2rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <Link to="/forum" style={{ color: '#2563eb', textDecoration: 'none' }}>Forum</Link>
          <span style={{ margin: '0 0.5rem' }}>›</span>
          <span>{categoryName}</span>
        </nav>

        {/* Header categorie */}
        <div 
          style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            marginBottom: '2rem',
            overflow: 'hidden'
          }}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: 'white',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <Link 
              to="/forum"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '0.5rem',
                color: 'white',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
            >
              <ArrowLeft style={{ width: '1.25rem', height: '1.25rem' }} />
            </Link>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                {categoryName}
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                Discuții despre tehnici, momeli și echipament pentru pescuitul la crap
              </p>
            </div>
          </div>
        </div>

        {/* Lista topicuri */}
        <div 
          style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}
        >
          {/* Header tabel */}
          <div 
            style={{
              backgroundColor: '#f8fafc',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: '1rem',
              alignItems: 'center',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151'
            }}
          >
            <div>Topic</div>
            <div style={{ textAlign: 'center' }}>Răspunsuri</div>
            <div style={{ textAlign: 'center' }}>Vizualizări</div>
            <div style={{ textAlign: 'center' }}>Ultima postare</div>
          </div>

          {/* Header pentru topicuri */}
          <div style={{ 
            backgroundColor: '#f8fafc', 
            borderBottom: '1px solid #e5e7eb',
            padding: '0.75rem 1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 100px 100px 220px',
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
            {topics.map((topic) => (
              <div
                key={topic.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 100px 220px',
                  gap: '0.75rem',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => handleTopicClick(topic.id)}
              >
                {/* Topic info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }}>
                    {topic.isPinned && <Pin style={{ width: '1rem', height: '1rem', color: '#f59e0b' }} />}
                    {topic.isLocked && <Lock style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />}
                    <MessageSquare style={{ width: '1rem', height: '1rem', color: topic.isPinned ? '#f59e0b' : '#2563eb' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem', lineHeight: '1.3' }}>
                      {topic.title}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      de <span style={{ color: '#2563eb', fontWeight: '600' }}>{topic.author}</span>
                      <span className={`user-rank rank-${topic.authorRank} ml-2`}>{topic.authorRank}</span>
                    </div>
                  </div>
                </div>

                {/* Răspunsuri - perfect centrat */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: '#059669',
                  minHeight: '2rem'
                }}>
                  {topic.replies}
                </div>

                {/* Vizualizări - perfect centrat */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: '#6b7280',
                  minHeight: '2rem'
                }}>
                  {topic.views.toLocaleString('ro-RO')}
                </div>

                {/* Ultima postare - perfect centrat */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: '0.75rem', 
                  color: '#6b7280',
                  minHeight: '2rem'
                }}>
                  <div style={{ fontWeight: '500', marginBottom: '0.125rem' }}>{topic.lastPost.time}</div>
                  <div>
                    de <span style={{ color: '#2563eb', fontWeight: '600' }}>{topic.lastPost.author}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buton creare topic nou */}
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

        {/* Create Topic Modal */}
        {forumUser && (
          <CreateTopicModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            categoryId={categoryId || ''}
            categoryName={categoryName}
            user={{
              username: forumUser.username,
              rank: forumUser.rank
            }}
            onTopicCreated={handleTopicCreated}
          />
        )}

        {/* Active Viewers */}
        <ActiveViewers topicId={`category-${categoryId}`} />
      </div>
    </ForumLayout>
  );
}