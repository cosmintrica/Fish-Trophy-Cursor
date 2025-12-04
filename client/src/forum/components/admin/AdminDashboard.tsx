/**
 * Admin Dashboard Component
 * Statistici live pentru Admin Panel Forum
 */

import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useForumStats } from '../../hooks/useForumStats';
import { useOnlineUsers } from '../../hooks/useOnlineUsers';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/query-client';
import { Users, MessageSquare, TrendingUp, Award, Clock, Activity, TrendingDown } from 'lucide-react';

interface DashboardStats {
  today_topics: number;
  today_posts: number;
  today_reputation_awarded: number; // Suma punctelor pozitive
  today_reputation_removed: number; // Suma punctelor negative (ca valoare pozitivă)
  total_reputation_awarded: number; // Total reputație acordată (all time)
  total_reputation_removed: number; // Total reputație retrasă (all time)
  new_users_today: number;
  posts_per_day: Array<{ date: string; count: number }>;
  new_members_per_week: Array<{ week: string; count: number }>;
}

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useForumStats();
  const { users: onlineUsers, loading: onlineUsersLoading } = useOnlineUsers();

  // Get today's statistics
  const { data: todayStats, isLoading: todayLoading } = useQuery<DashboardStats>({
    queryKey: queryKeys.adminDashboardStats(),
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Get today's topics
      const { count: todayTopics } = await supabase
        .from('forum_topics')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      // Get today's posts
      const { count: todayPosts } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      // Get today's reputation logs
      const { data: reputationLogsToday } = await supabase
        .from('forum_reputation_logs')
        .select('points')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      // Calculate sum of positive points (awarded) and negative points (removed) for today
      const todayReputationAwarded = reputationLogsToday
        ?.filter(log => log.points > 0)
        .reduce((sum, log) => sum + log.points, 0) || 0;
      
      const todayReputationRemoved = Math.abs(reputationLogsToday
        ?.filter(log => log.points < 0)
        .reduce((sum, log) => sum + log.points, 0) || 0);

      // Get total reputation awarded and removed (all time)
      const { data: allReputationLogs } = await supabase
        .from('forum_reputation_logs')
        .select('points');

      const totalReputationAwarded = allReputationLogs
        ?.filter(log => log.points > 0)
        .reduce((sum, log) => sum + log.points, 0) || 0;

      const totalReputationRemoved = Math.abs(allReputationLogs
        ?.filter(log => log.points < 0)
        .reduce((sum, log) => sum + log.points, 0) || 0);

      // Get new users today
      const { count: newUsersToday } = await supabase
        .from('forum_users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      // Get posts per day for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: postsData } = await supabase
        .from('forum_posts')
        .select('created_at')
        .eq('is_deleted', false)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Group posts by date
      const postsPerDay: { [key: string]: number } = {};
      postsData?.forEach(post => {
        const date = new Date(post.created_at).toISOString().split('T')[0];
        postsPerDay[date] = (postsPerDay[date] || 0) + 1;
      });

      // Ensure we have data for all 7 days (fill missing days with 0)
      const postsPerDayArray: Array<{ date: string; count: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        postsPerDayArray.push({
          date: dateKey,
          count: postsPerDay[dateKey] || 0
        });
      }

      // Get new members per week for last 4 weeks
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const { data: usersData } = await supabase
        .from('forum_users')
        .select('created_at')
        .gte('created_at', fourWeeksAgo.toISOString())
        .order('created_at', { ascending: true });

      // Group users by week
      const usersPerWeek: { [key: string]: number } = {};
      usersData?.forEach(user => {
        const date = new Date(user.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split('T')[0];
        usersPerWeek[weekKey] = (usersPerWeek[weekKey] || 0) + 1;
      });

      // Ensure we have data for all 4 weeks (fill missing weeks with 0)
      const usersPerWeekArray: Array<{ week: string; count: number }> = [];
      for (let i = 3; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7) - date.getDay()); // Start of week (Sunday)
        date.setHours(0, 0, 0, 0);
        const weekKey = date.toISOString().split('T')[0];
        usersPerWeekArray.push({
          week: weekKey,
          count: usersPerWeek[weekKey] || 0
        });
      }

      return {
        today_topics: todayTopics || 0,
        today_posts: todayPosts || 0,
        today_reputation_awarded: todayReputationAwarded,
        today_reputation_removed: todayReputationRemoved,
        total_reputation_awarded: totalReputationAwarded,
        total_reputation_removed: totalReputationRemoved,
        new_users_today: newUsersToday || 0,
        posts_per_day: postsPerDayArray,
        new_members_per_week: usersPerWeekArray
      };
    },
    staleTime: 1 * 60 * 1000, // 1 minut - se actualizează des
    gcTime: 5 * 60 * 1000,
  });

  const formatNumber = (num: number) => {
    return num.toLocaleString('ro-RO');
  };

  if (statsLoading || todayLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: theme.textSecondary }}>
        <div>Se încarcă statisticile...</div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: theme.textSecondary }}>
        <div>Eroare la încărcarea statisticilor. Te rugăm să reîncerci.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Stat Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', 
        gap: '1rem' 
      }}>
        {/* Total Utilizatori */}
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              minWidth: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: theme.textSecondary }}>
                <Users size={18} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: '500', whiteSpace: 'nowrap' }}>Total Utilizatori</span>
              </div>
              <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '700', color: theme.text }}>
                {formatNumber(stats?.total_users || 0)}
              </div>
              {stats?.online_users !== undefined && (
                <div style={{ fontSize: '0.8125rem', color: theme.textSecondary }}>
                  {stats.online_users} online
                </div>
              )}
            </div>

        {/* Total Topicuri */}
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minWidth: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: theme.textSecondary }}>
            <MessageSquare size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: '500', whiteSpace: 'nowrap' }}>Total Topicuri</span>
          </div>
          <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '700', color: theme.text }}>
            {formatNumber(stats?.total_topics || 0)}
          </div>
          {todayStats && (
            <div style={{ fontSize: '0.8125rem', color: theme.textSecondary }}>
              {todayStats.today_topics} astăzi
            </div>
          )}
        </div>

        {/* Total Postări */}
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minWidth: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: theme.textSecondary }}>
            <Activity size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: '500', whiteSpace: 'nowrap' }}>Total Postări</span>
          </div>
          <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '700', color: theme.text }}>
            {formatNumber(stats?.total_posts || 0)}
          </div>
          {todayStats && (
            <div style={{ fontSize: '0.8125rem', color: theme.textSecondary }}>
              {todayStats.today_posts} astăzi
            </div>
          )}
        </div>

        {/* Reputație Acordată */}
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minWidth: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: theme.textSecondary }}>
            <Award size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: '500', whiteSpace: 'nowrap' }}>Reputație Acordată</span>
          </div>
          <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '700', color: theme.text }}>
            {formatNumber(todayStats?.total_reputation_awarded || 0)}
          </div>
          {todayStats && (
            <div style={{ fontSize: '0.8125rem', color: theme.textSecondary }}>
              +{formatNumber(todayStats.today_reputation_awarded)} astăzi
            </div>
          )}
        </div>

        {/* Reputație Retrasă */}
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minWidth: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: theme.textSecondary }}>
            <TrendingDown size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: '500', whiteSpace: 'nowrap' }}>Reputație Retrasă</span>
          </div>
          <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '700', color: '#ef4444' }}>
            {formatNumber(todayStats?.total_reputation_removed || 0)}
          </div>
          {todayStats && todayStats.today_reputation_removed > 0 && (
            <div style={{ fontSize: '0.8125rem', color: '#ef4444' }}>
              -{formatNumber(todayStats.today_reputation_removed)} astăzi
            </div>
          )}
        </div>

        {/* Utilizatori Online */}
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minWidth: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: theme.textSecondary }}>
            <Clock size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: '500', whiteSpace: 'nowrap' }}>Utilizatori Online</span>
          </div>
          <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '700', color: theme.secondary }}>
            {onlineUsersLoading ? '...' : onlineUsers.length}
          </div>
        </div>

        {/* Membri Noi Astăzi */}
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minWidth: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: theme.textSecondary }}>
            <TrendingUp size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: '500', whiteSpace: 'nowrap' }}>Membri Noi Astăzi</span>
          </div>
          <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '700', color: theme.text }}>
            {todayStats?.new_users_today || 0}
          </div>
        </div>
      </div>

      {/* Grafice Activitate - Simple Bars */}
      {todayStats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', 
          gap: '1rem' 
        }}>
          {/* Grafic Postări/zi (ultimele 7 zile) */}
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <h3 style={{ 
              fontSize: 'clamp(0.875rem, 2vw, 1rem)', 
              fontWeight: '600', 
              color: theme.text, 
              marginBottom: '1rem' 
            }}>
              Postări pe zi (ultimele 7 zile)
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem', height: 'clamp(120px, 20vw, 150px)', paddingBottom: '0.5rem', width: '100%', justifyContent: 'space-between' }}>
              {todayStats.posts_per_day && todayStats.posts_per_day.length > 0 ? todayStats.posts_per_day.map((item, index) => {
                const maxCount = Math.max(...todayStats.posts_per_day.map(d => d.count), 1);
                const date = new Date(item.date);
                const dayLabel = date.toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric' });
                
                // Calculăm înălțimea în pixeli - max ~80% din înălțimea container-ului (120-150px)
                // Lăsăm spațiu pentru label-uri (count + date label)
                const maxBarHeight = 110; // Pixeli maxim pentru bara cea mai mare
                const heightPercentage = maxCount > 0 ? (item.count / maxCount) : 0;
                const barHeightPx = Math.max(4, heightPercentage * maxBarHeight); // Min 4px pentru vizibilitate
                
                return (
                  <div key={index} style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: '0.25rem',
                    justifyContent: 'flex-end',
                    height: '100%',
                    minWidth: 0
                  }}>
                    <div style={{
                      width: '100%',
                      height: `${barHeightPx}px`,
                      minHeight: item.count > 0 ? '8px' : '4px',
                      backgroundColor: theme.primary,
                      borderRadius: '0.25rem 0.25rem 0 0',
                      transition: 'height 0.3s ease',
                      flexShrink: 0
                    }} />
                    <div style={{
                      fontSize: '0.75rem',
                      color: theme.textSecondary,
                      textAlign: 'center',
                      lineHeight: '1',
                      flexShrink: 0
                    }}>
                      {item.count}
                    </div>
                    <div style={{
                      fontSize: '0.625rem',
                      color: theme.textSecondary,
                      textAlign: 'center',
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'center',
                      whiteSpace: 'nowrap',
                      lineHeight: '1',
                      flexShrink: 0,
                      height: '2rem'
                    }}>
                      {dayLabel}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ 
                  width: '100%', 
                  textAlign: 'center', 
                  color: theme.textSecondary, 
                  fontSize: '0.875rem',
                  padding: '2rem 1rem'
                }}>
                  Nu există date pentru ultimele 7 zile
                </div>
              )}
            </div>
          </div>

          {/* Grafic Membri Noi/săptămână (ultimele 4 săptămâni) */}
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <h3 style={{ 
              fontSize: 'clamp(0.875rem, 2vw, 1rem)', 
              fontWeight: '600', 
              color: theme.text, 
              marginBottom: '1rem' 
            }}>
              Membri noi pe săptămână (ultimele 4 săptămâni)
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem', height: 'clamp(120px, 20vw, 150px)', paddingBottom: '0.5rem', width: '100%', justifyContent: 'space-between' }}>
              {todayStats.new_members_per_week && todayStats.new_members_per_week.length > 0 ? todayStats.new_members_per_week.map((item, index) => {
                const maxCount = Math.max(...todayStats.new_members_per_week.map(w => w.count), 1);
                const date = new Date(item.week);
                const weekLabel = `Săpt. ${date.getDate()}/${date.getMonth() + 1}`;
                
                // Calculăm înălțimea în pixeli - max ~80% din înălțimea container-ului (120-150px)
                // Lăsăm spațiu pentru label-uri (count + date label)
                const maxBarHeight = 110; // Pixeli maxim pentru bara cea mai mare
                const heightPercentage = maxCount > 0 ? (item.count / maxCount) : 0;
                const barHeightPx = Math.max(4, heightPercentage * maxBarHeight); // Min 4px pentru vizibilitate
                
                return (
                  <div key={index} style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: '0.25rem',
                    justifyContent: 'flex-end',
                    height: '100%',
                    minWidth: 0
                  }}>
                    <div style={{
                      width: '100%',
                      height: `${barHeightPx}px`,
                      minHeight: item.count > 0 ? '8px' : '4px',
                      backgroundColor: theme.secondary,
                      borderRadius: '0.25rem 0.25rem 0 0',
                      transition: 'height 0.3s ease',
                      flexShrink: 0
                    }} />
                    <div style={{
                      fontSize: '0.75rem',
                      color: theme.textSecondary,
                      textAlign: 'center',
                      lineHeight: '1',
                      flexShrink: 0
                    }}>
                      {item.count}
                    </div>
                    <div style={{
                      fontSize: '0.625rem',
                      color: theme.textSecondary,
                      textAlign: 'center',
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'center',
                      whiteSpace: 'nowrap',
                      lineHeight: '1',
                      flexShrink: 0,
                      height: '2rem'
                    }}>
                      {weekLabel}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ 
                  width: '100%', 
                  textAlign: 'center', 
                  color: theme.textSecondary, 
                  fontSize: '0.875rem',
                  padding: '2rem 1rem'
                }}>
                  Nu există date pentru ultimele 4 săptămâni
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

