/**
 * Forum Statistics Hook
 * Loads real forum statistics from database
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface ForumStats {
  total_users: number
  total_topics: number
  total_posts: number
  online_users: number
  newest_user?: {
    id: string
    username: string
  }
  total_reputation_given: number
}

// Cache cu sessionStorage pentru forum stats
const STATS_CACHE_KEY = 'forum_stats_cache';
const STATS_CACHE_DURATION = 2 * 60 * 1000; // 2 minute

function getCachedStats(): ForumStats | null {
  try {
    const cached = sessionStorage.getItem(STATS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < STATS_CACHE_DURATION) {
        return data;
      }
    }
  } catch (e) {
    // Ignoră erorile de parsing
  }
  return null;
}

function setCachedStats(data: ForumStats) {
  try {
    sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Ignoră erorile de storage
  }
}

export function useForumStats() {
  // Încarcă instant din cache dacă există
  const [stats, setStats] = useState<ForumStats | null>(() => getCachedStats());
  const [error, setError] = useState<Error | null>(null)

  const loadStats = useCallback(async () => {
    setError(null)

    try {
      // Use the RPC function from migration 12
      const { data, error: statsError } = await supabase.rpc('get_forum_stats')

      if (statsError) {
        // If RPC fails, calculate stats manually
        console.warn('get_forum_stats RPC failed, calculating manually:', statsError)
        
        // Get counts without RLS issues
        const [usersResult, topicsResult, postsResult, onlineResult] = await Promise.all([
          supabase.from('forum_users').select('id', { count: 'exact', head: true }),
          supabase.from('forum_topics').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
          supabase.from('forum_posts').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
          supabase.from('forum_users').select('id', { count: 'exact', head: true }).eq('is_online', true)
        ])

        // Get newest user separately (might fail due to RLS, so we catch it)
        let newestUser = undefined;
        try {
          const { data: newestData } = await supabase
            .from('forum_users')
            .select('user_id, username')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (newestData) {
            newestUser = { id: newestData.user_id, username: newestData.username };
          }
        } catch (err) {
          console.warn('Could not fetch newest user:', err);
        }

        const manualStats: ForumStats = {
          total_users: usersResult.count || 0,
          total_topics: topicsResult.count || 0,
          total_posts: postsResult.count || 0,
          online_users: onlineResult.count || 0,
          newest_user: newestUser,
          total_reputation_given: 0
        }

        setStats(manualStats);
        setCachedStats(manualStats);
        return
      }

      const statsData = data as ForumStats;
      setStats(statsData);
      setCachedStats(statsData);
    } catch (err) {
      setError(err as Error)
      // Dacă e eroare dar avem cache, păstrăm cache-ul
      const cached = getCachedStats();
      if (cached) {
        setStats(cached);
      }
    }
  }, [])

  useEffect(() => {
    // Încarcă doar dacă nu avem cache valid
    const cached = getCachedStats();
    if (!cached) {
      loadStats();
    }
  }, [loadStats])

  return {
    stats,
    loading: false, // Nu mai folosim loading
    error,
    refetch: loadStats
  }
}

