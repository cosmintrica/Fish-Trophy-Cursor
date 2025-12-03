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

// Cache cu sessionStorage pentru online users
const ONLINE_USERS_CACHE_KEY = 'forum_online_users_cache';
const ONLINE_USERS_CACHE_DURATION = 30 * 1000; // 30 secunde (se schimbă mai des)

function getCachedOnlineUsers(): OnlineUser[] | null {
  try {
    const cached = sessionStorage.getItem(ONLINE_USERS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ONLINE_USERS_CACHE_DURATION) {
        return data;
      }
    }
  } catch (e) {
    // Ignoră erorile de parsing
  }
  return null;
}

function setCachedOnlineUsers(data: OnlineUser[]) {
  try {
    sessionStorage.setItem(ONLINE_USERS_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Ignoră erorile de storage
  }
}

export function useOnlineUsers() {
  // Încarcă instant din cache dacă există
  const [users, setUsers] = useState<OnlineUser[]>(() => getCachedOnlineUsers() || []);
  const [error, setError] = useState<Error | null>(null)

  const loadUsers = useCallback(async () => {
    setError(null)

    try {
      // Folosește last_seen_at în loc de is_online (mai precis)
      // Utilizatorii activi în ultimele 5 minute
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error: usersError } = await supabase
        .from('forum_users')
        .select('user_id, username, rank, avatar_url')
        .gte('last_seen_at', fiveMinutesAgo)
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
      setUsers(mappedUsers);
      setCachedOnlineUsers(mappedUsers);
    } catch (err) {
      setError(err as Error)
      // Dacă e eroare dar avem cache, păstrăm cache-ul
      const cached = getCachedOnlineUsers();
      if (cached) {
        setUsers(cached);
      }
    }
  }, [])

  useEffect(() => {
    // Încarcă instant din cache, apoi refresh în background
    const cached = getCachedOnlineUsers();
    if (cached) {
      setUsers(cached);
    }
    
    // Refresh every 30 seconds
    const interval = setInterval(loadUsers, 30000)
    
    // Load imediat dacă nu avem cache
    if (!cached) {
      loadUsers();
    }
    
    return () => clearInterval(interval)
  }, [loadUsers])

  return {
    users,
    loading: false, // Nu mai folosim loading
    error,
    refetch: loadUsers
  }
}

