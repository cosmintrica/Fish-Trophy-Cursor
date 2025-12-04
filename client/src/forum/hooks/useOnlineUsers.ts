/**
 * Online Users Hook
 * Loads real online users from database using React Query
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { queryKeys } from '../../lib/query-client'

export interface OnlineUser {
  id: string
  username: string
  rank: string
  avatar_url?: string
}

export function useOnlineUsers() {
  const { data: users = [], error, isLoading, refetch } = useQuery<OnlineUser[]>({
    queryKey: queryKeys.onlineUsers(),
    queryFn: async () => {
      // Folosește last_seen_at în loc de is_online (mai precis)
      // Utilizatorii activi în ultimele 5 minute
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      // Folosim RPC function sau query direct cu timestamp comparison
      // Supabase .gte() funcționează corect cu TIMESTAMP WITH TIME ZONE
      const { data, error: usersError } = await supabase
        .from('forum_users')
        .select('user_id, username, rank, avatar_url, last_seen_at')
        .gte('last_seen_at', fiveMinutesAgo)
        .order('last_seen_at', { ascending: false })
        .limit(50)

      if (usersError) {
        console.error('Error fetching online users:', usersError)
        throw new Error(usersError.message)
      }

      // Map user_id to id for compatibility
      return (data || []).map(u => ({
        id: u.user_id,
        username: u.username,
        rank: u.rank,
        avatar_url: u.avatar_url
      }))
    },
    staleTime: 15 * 1000, // 15 secunde - online users se schimbă mai des
    gcTime: 1 * 60 * 1000, // 1 minut - cache mai mic pentru actualizări mai rapide
    refetchOnWindowFocus: false, // Dezactivat pentru a evita refresh-uri când schimbi tab-ul
    refetchInterval: 15 * 1000, // Refetch automat la fiecare 15 secunde (mai rapid)
  })

  return {
    users,
    loading: isLoading && !users.length, // Loading doar dacă nu avem date
    error: error as Error | null,
    refetch: () => refetch()
  }
}
