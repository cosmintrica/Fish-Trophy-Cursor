import { useState, useEffect } from 'react';
import { Eye, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ActiveViewersProps {
  topicId: string;
}

interface Viewer {
  id: string;
  name?: string;
  rank?: string;
  isAnonymous: boolean;
}

export default function ActiveViewers({ topicId }: ActiveViewersProps) {
  const { theme } = useTheme();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [anonymousCount, setAnonymousCount] = useState(0);

  useEffect(() => {
    // Mock data pentru vizualizatori
    const mockViewers: Viewer[] = [
      { id: '1', name: 'PescarExpert', rank: 'expert', isAnonymous: false },
      { id: '2', name: 'CrapMaster', rank: 'maestru', isAnonymous: false },
      { id: '3', name: 'TroutHunter', rank: 'pescar', isAnonymous: false }
    ];

    setViewers(mockViewers);
    setAnonymousCount(Math.floor(Math.random() * 5) + 2); // 2-6 vizitatori anonimi

    // Simulăm actualizări în timp real
    const interval = setInterval(() => {
      setAnonymousCount(Math.floor(Math.random() * 8) + 1);
    }, 10000); // Update la 10 secunde

    return () => clearInterval(interval);
  }, [topicId]);

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
          <strong>Total vizualizări:</strong> {Math.floor(Math.random() * 500) + 100}
        </div>
        <div>
          <strong>Utilizatori unici:</strong> {viewers.length + Math.floor(Math.random() * 10) + 5}
        </div>
        <div>
          <strong>Ultima actualizare:</strong> acum {Math.floor(Math.random() * 30) + 1}s
        </div>
      </div>
    </div>
  );
}
