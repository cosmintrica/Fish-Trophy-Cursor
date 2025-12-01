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

export function useForumStats() {
  const [stats, setStats] = useState<ForumStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
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

        setStats(manualStats)
        return
      }

      setStats(data as ForumStats)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return {
    stats,
    loading,
    error,
    refetch: loadStats
  }
}

