import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { supabase } from '../../lib/supabase';
import { User, MessageSquare, Award } from 'lucide-react';

export default function ActiveMembers() {
  const { forumUser } = useAuth();
  const { theme } = useTheme();
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const loadActiveMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('forum_users')
          .select('id, username, avatar_url, post_count, topic_count, reputation_points, rank, last_seen_at, is_online')
          .order('post_count', { ascending: false })
          .limit(100);

        if (error) throw error;
        setMembers(data || []);
      } catch (error) {
        console.error('Error loading active members:', error);
      }
    };

    loadActiveMembers();
  }, []);

  const getRankDisplay = (rank: string) => {
    const rankMap: Record<string, { label: string; color: string }> = {
      'ou_de_peste': { label: '🥚 Ou de Pește', color: '#9ca3af' },
      'puiet': { label: '🐟 Puiet', color: '#60a5fa' },
      'pui_de_crap': { label: '🐠 Pui de Crap', color: '#34d399' },
      'crap_junior': { label: '🎣 Crap Junior', color: '#fbbf24' },
      'crap_senior': { label: '🏆 Crap Senior', color: '#fb923c' },
      'maestru_pescar': { label: '💎 Maestru Pescar', color: '#f472b6' },
      'legenda_apelor': { label: '👑 Legenda Apelor', color: '#a78bfa' }
    };
    return rankMap[rank] || { label: rank, color: theme.textSecondary };
  };

  return (
    <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: theme.text, marginBottom: '2rem' }}>
          👥 Membri Activi
        </h1>

        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: theme.surface, borderRadius: '0.5rem', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👤</div>
            <div style={{ color: theme.textSecondary }}>Nu există membri înregistrați</div>
          </div>
        ) : (
          <div style={{
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            border: `1px solid ${theme.border}`,
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              backgroundColor: theme.background,
              padding: '1rem 1.5rem',
              borderBottom: `1px solid ${theme.border}`,
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
              gap: '1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: theme.text
            }}>
              <div>Membru</div>
              <div style={{ textAlign: 'center' }}>Rang</div>
              <div style={{ textAlign: 'center' }}>Postări</div>
              <div style={{ textAlign: 'center' }}>Topicuri</div>
              <div style={{ textAlign: 'center' }}>Reputație</div>
            </div>

            {/* Members List */}
            <div>
              {members.map((member) => {
                const rankInfo = getRankDisplay(member.rank);
                return (
                  <Link
                    key={member.id}
                    to={`/forum/user/${member.id}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                      gap: '1rem',
                      padding: '1rem 1.5rem',
                      borderBottom: `1px solid ${theme.border}`,
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'background-color 0.2s',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        backgroundColor: theme.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: '600',
                        position: 'relative'
                      }}>
                        {member.username?.charAt(0).toUpperCase() || '?'}
                        {member.is_online && (
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '0.75rem',
                            height: '0.75rem',
                            backgroundColor: '#10b981',
                            borderRadius: '50%',
                            border: `2px solid ${theme.surface}`
                          }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: theme.text, marginBottom: '0.125rem' }}>
                          {member.username}
                        </div>
                        {member.last_seen_at && (
                          <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                            Ultima activitate: {new Date(member.last_seen_at).toLocaleDateString('ro-RO')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', color: rankInfo.color, fontWeight: '500' }}>
                      {rankInfo.label}
                    </div>
                    <div style={{ textAlign: 'center', color: theme.text }}>
                      {member.post_count || 0}
                    </div>
                    <div style={{ textAlign: 'center', color: theme.text }}>
                      {member.topic_count || 0}
                    </div>
                    <div style={{ textAlign: 'center', color: theme.primary, fontWeight: '600' }}>
                      {member.reputation_points || 0}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ForumLayout>
  );
}

