import { useState, useEffect } from 'react';
import { Eye, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';

interface ActiveViewersProps {
  topicId: string;
}

interface Viewer {
  id: string;
  name?: string;
  rank?: string;
  isAnonymous: boolean;
  joinedAt: number;
}

interface ViewerStats {
  totalViews: number;
  uniqueUsers: number;
  lastUpdate: number;
}

export default function ActiveViewers({ topicId }: ActiveViewersProps) {
  const { theme } = useTheme();
  const { forumUser } = useAuth();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [anonymousCount, setAnonymousCount] = useState(0);
  const [stats, setStats] = useState<ViewerStats>({
    totalViews: 0,
    uniqueUsers: 0,
    lastUpdate: Date.now()
  });

  useEffect(() => {
    const storageKey = `forum-viewers-${topicId}`;
    const statsKey = `forum-stats-${topicId}`;

    // Încarcă vizitatori existenți
    const loadViewers = () => {
      const stored = localStorage.getItem(storageKey);
      const storedStats = localStorage.getItem(statsKey);

      if (stored) {
        const viewerData: Viewer[] = JSON.parse(stored);
        // Filtrează vizitatorii care au plecat (mai mult de 5 minute)
        const now = Date.now();
        const activeViewers = viewerData.filter(viewer =>
          now - viewer.joinedAt < 5 * 60 * 1000
        );
        setViewers(activeViewers);
        setAnonymousCount(Math.max(0, viewerData.length - activeViewers.length));
      }

      if (storedStats) {
        const statsData: ViewerStats = JSON.parse(storedStats);
        setStats(statsData);
      }
    };

    // Adaugă utilizatorul curent dacă e logat
    const addCurrentUser = () => {
      if (forumUser) {
        const newViewer: Viewer = {
          id: `user-${forumUser.id}`,
          name: forumUser.username,
          rank: forumUser.rank,
          isAnonymous: false,
          joinedAt: Date.now()
        };

        setViewers(prev => {
          const filtered = prev.filter(v => v.id !== newViewer.id);
          const updated = [...filtered, newViewer];
          
          // Salvează în localStorage
          localStorage.setItem(storageKey, JSON.stringify(updated));
          return updated;
        });
      } else {
        // Pentru utilizatori anonimi, folosim un ID persistent per sesiune
        const sessionKey = `anon-session-${topicId}`;
        let sessionId = sessionStorage.getItem(sessionKey);
        
        if (!sessionId) {
          sessionId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem(sessionKey, sessionId);
        }

        const anonymousViewer: Viewer = {
          id: sessionId,
          isAnonymous: true,
          joinedAt: Date.now()
        };

        setViewers(prev => {
          const filtered = prev.filter(v => v.id !== sessionId);
          const updated = [...filtered, anonymousViewer];
          localStorage.setItem(storageKey, JSON.stringify(updated));
          return updated;
        });
      }
    };

    // Incrementează statisticile doar o dată per sesiune
    const incrementStats = () => {
      const sessionStatsKey = `stats-incremented-${topicId}`;
      const hasIncremented = sessionStorage.getItem(sessionStatsKey);
      
      if (!hasIncremented) {
        const newStats = {
          totalViews: stats.totalViews + 1,
          uniqueUsers: stats.uniqueUsers + (forumUser ? 1 : 0),
          lastUpdate: Date.now()
        };
        
        setStats(newStats);
        localStorage.setItem(statsKey, JSON.stringify(newStats));
        sessionStorage.setItem(sessionStatsKey, 'true');
      }
    };

    // Inițializare
    loadViewers();
    addCurrentUser();
    incrementStats();

    // Actualizare periodică
    const interval = setInterval(() => {
      loadViewers();
    }, 30000); // Update la 30 secunde

    // Cleanup la unmount
    return () => {
      clearInterval(interval);

      // Marchează utilizatorul ca plecat
      if (forumUser) {
        const storageKey = `forum-viewers-${topicId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const viewerData: Viewer[] = JSON.parse(stored);
          const updated = viewerData.filter(v => v.id !== `user-${forumUser.id}`);
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
      }
    };
  }, [topicId, forumUser]);

  const getSeniorityRank = (rank: string) => {
    const seniorityRanks = {
      'incepator': '🆕 Pescar Nou',
      'pescar': '🎣 Pescar Activ',
      'expert': '🐟 Pescar Experimentat',
      'maestru': '🏆 Pescar Veteran',
      'moderator': '🟣 Moderator',
      'administrator': '🔴 Administrator',
      'vip': '🟡 VIP Member'
    };
    return seniorityRanks[rank as keyof typeof seniorityRanks] || '🎣 Pescar';
  };

  const totalViewers = viewers.length + anonymousCount;

  return (
    <div
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '0.5rem',
        padding: '1rem 1.5rem',
        marginTop: '2rem',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: theme.text
      }}>
        <Eye style={{ width: '1rem', height: '1rem', color: theme.primary }} />
        <span>Vizualizează acest topic:</span>
        <span style={{
          backgroundColor: theme.background,
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          color: theme.primary,
          fontWeight: '600'
        }}>
          {totalViewers} {totalViewers === 1 ? 'utilizator' : 'utilizatori'}
        </span>
      </div>

      {/* Lista vizualizatori */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
        {/* Membri conectați */}
        {viewers.map((viewer) => (
          <div
            key={viewer.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              backgroundColor: theme.background,
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.surfaceHover;
              e.currentTarget.style.borderColor = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.background;
              e.currentTarget.style.borderColor = theme.border;
            }}
          >
            {/* Avatar mic */}
            <div
              style={{
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.625rem',
                fontWeight: '600'
              }}
            >
              {viewer.name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <div style={{ fontWeight: '500', color: theme.text }}>
                {viewer.name}
              </div>
              <div style={{ fontSize: '0.625rem', color: theme.textSecondary }}>
                {getSeniorityRank(viewer.rank || 'pescar')}
              </div>
            </div>
          </div>
        ))}

        {/* Vizitatori anonimi */}
        {anonymousCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              backgroundColor: theme.background,
              border: `1px dashed ${theme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: theme.textSecondary
            }}
          >
            <Users style={{ width: '1rem', height: '1rem' }} />
            <span>
              {anonymousCount} {anonymousCount === 1 ? 'vizitator anonim' : 'vizitatori anonimi'}
            </span>
          </div>
        )}
      </div>

      {/* Statistici suplimentare */}
      <div style={{
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: `1px solid ${theme.border}`,
        fontSize: '0.75rem',
        color: theme.textSecondary,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong>Total vizualizări:</strong> {stats.totalViews}
        </div>
        <div>
          <strong>Utilizatori unici:</strong> {stats.uniqueUsers}
        </div>
        <div>
          <strong>Ultima actualizare:</strong> acum {Math.floor((Date.now() - stats.lastUpdate) / 1000)}s
        </div>
      </div>
    </div>
  );
}
