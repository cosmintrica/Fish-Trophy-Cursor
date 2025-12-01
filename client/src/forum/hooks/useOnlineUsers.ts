/**
 * Online Users Hook
 * Loads real online users from database
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface OnlineUser {
  id: string
  username: string
  rank: string
  avatar_url?: string
}

export function useOnlineUsers() {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: usersError } = await supabase
        .from('forum_users')
        .select('user_id, username, rank, avatar_url')
        .eq('is_online', true)
        .order('last_seen_at', { ascending: false })
        .limit(50)

      if (usersError) {
        throw new Error(usersError.message)
      }

      // Map user_id to id for compatibility
      const mappedUsers = (data || []).map(u => ({
        id: u.user_id,
        username: u.username,
        rank: u.rank,
        avatar_url: u.avatar_url
      }));
      setUsers(mappedUsers)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
    
    // Refresh every 30 seconds
    const interval = setInterval(loadUsers, 30000)
    
    return () => clearInterval(interval)
  }, [loadUsers])

  return {
    users,
    loading,
    error,
    refetch: loadUsers
  }
}

