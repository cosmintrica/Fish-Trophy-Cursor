import { useAuth } from './useAuth';
import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
        } else {
          setAdminRole(data?.role || null);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        setAdminRole(null);
      } finally {
        setLoadingRole(false);
      }
    };

    checkAdminRole();
  }, [user, loading]);

  const isAdmin = useMemo(() => {
    if (!user || loading || loadingRole) return false;
    return adminRole === 'admin';
  }, [user, loading, loadingRole, adminRole]);

  return {
    isAdmin,
    loading: loading || loadingRole,
    user
  };
};
