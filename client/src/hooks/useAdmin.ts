import { useAuth } from './useAuth';
import { useMemo } from 'react';

export const useAdmin = () => {
  const { user, loading } = useAuth();

  const isAdmin = useMemo(() => {
    if (!user || loading) return false;

    // Check environment variable first (for development/testing)
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    if (adminEmail && user.email === adminEmail) {
      return true;
    }

    // Check user metadata for admin role
    if (user.user_metadata?.role === 'admin') {
      return true;
    }

    // Check app_metadata for admin role (set by Supabase)
    if (user.app_metadata?.role === 'admin') {
      return true;
    }

    return false;
  }, [user, loading]);

  return {
    isAdmin,
    loading,
    user
  };
};
