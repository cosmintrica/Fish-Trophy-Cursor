import { useAuth } from './useAuth';
import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Cache pentru admin status - previne flicker când tab-ul se schimbă
let adminCache: { [userId: string]: { role: string | null; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minute

export const useAdmin = () => {
  const { user, loading } = useAuth();
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(false);

  // Fetch admin role from profiles table (sursa de adevăr)
  useEffect(() => {
    if (!user || loading) {
      setAdminRole(null);
      return;
    }

    // Check cache first
    const cached = adminCache[user.id];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setAdminRole(cached.role);
      return;
    }

    const checkAdminRole = async () => {
      setLoadingRole(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking admin role:', error);
          setAdminRole(null);
          adminCache[user.id] = { role: null, timestamp: Date.now() };
        } else {
          const role = data?.role || null;
          setAdminRole(role);
          // Update cache
          adminCache[user.id] = { role, timestamp: Date.now() };
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        setAdminRole(null);
        adminCache[user.id] = { role: null, timestamp: Date.now() };
      } finally {
        setLoadingRole(false);
      }
    };

    checkAdminRole();
  }, [user?.id, loading]); // Only depend on user.id, not entire user object

  const isAdmin = useMemo(() => {
    if (!user || loading || loadingRole) {
      // Use cache if available during loading
      const cached = adminCache[user?.id || ''];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.role === 'admin';
      }
      return false;
    }
    return adminRole === 'admin';
  }, [user, loading, loadingRole, adminRole]);

  return {
    isAdmin,
    loading: loading || loadingRole,
    user
  };
};
