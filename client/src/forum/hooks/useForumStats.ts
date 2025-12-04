/**
 * Forum Statistics Hook
 * Loads real forum statistics from database using React Query
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { queryKeys } from '../../lib/query-client'

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
  const { data: stats, error, isLoading, refetch } = useQuery<ForumStats>({
    queryKey: queryKeys.forumStats(),
    queryFn: async () => {
      // Use the RPC function from migration 12
      const { data, error: statsError } = await supabase.rpc('get_forum_stats')

      if (statsError) {
        // If RPC fails, calculate stats manually
        console.warn('get_forum_stats RPC failed, calculating manually:', statsError)
        
        // Get counts without RLS issues
        // Pentru utilizatori online, folosim last_seen_at (ultimele 5 minute)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const [usersResult, topicsResult, postsResult, onlineResult] = await Promise.all([
          supabase.from('forum_users').select('id', { count: 'exact', head: true }),
          supabase.from('forum_topics').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
          supabase.from('forum_posts').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
          supabase.from('forum_users').select('id', { count: 'exact', head: true }).gte('last_seen_at', fiveMinutesAgo)
        ])

        // Get newest user separately (might fail due to RLS, so we catch it)
        let newestUser = undefined
        try {
          const { data: newestData } = await supabase
            .from('forum_users')
            .select('user_id, username')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (newestData) {
            newestUser = { id: newestData.user_id, username: newestData.username }
          }
        } catch (err) {
          console.warn('Could not fetch newest user:', err)
        }

        const manualStats: ForumStats = {
          total_users: usersResult.count || 0,
          total_topics: topicsResult.count || 0,
          total_posts: postsResult.count || 0,
          online_users: onlineResult.count || 0,
          newest_user: newestUser,
          total_reputation_given: 0
        }

        return manualStats
      }

      return data as ForumStats
    },
    staleTime: 2 * 60 * 1000, // 2 minute - stats se schimbă mai des
    gcTime: 5 * 60 * 1000, // 5 minute
    refetchOnWindowFocus: false, // Dezactivat pentru performanță
  })

  return {
    stats: stats || null,
    loading: isLoading && !stats, // Loading doar dacă nu avem date
    error: error as Error | null,
    refetch: () => refetch()
  }
}
