import { useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { AuthContext } from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session with error handling
    supabase.auth.getSession()
      .then(({ data, error }: { data: { session: Session | null } | null; error: unknown }) => {
        const session = data?.session ?? null;
        if (error) {
          console.error('Error getting session:', error);
        }
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        console.error('Error in getSession:', error);
        if (mounted) {
          setLoading(false);
        }
      });

    // Set loading to false after a short timeout to prevent white screen
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 3000); // 3 second timeout

    // Listen for auth changes with error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout); // Cleanup timeout
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, displayName?: string, countyId?: string, cityId?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          county_id: countyId,
          city_id: cityId,
        },
      },
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/email-confirmation`,
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Record<string, unknown>) => {
    const { error } = await supabase.auth.updateUser({
      data: updates,
    });
    if (error) throw error;

    // Also update the profiles table if user is authenticated
    if (user?.id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: updates.display_name,
          county_id: updates.county_id,
          city_id: updates.city_id,
          bio: updates.bio,
          phone: updates.phone,
          website: updates.website,
          updated_at: new Date().toISOString(),
        });
      
      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Note: useAuth is exported from hooks/useAuth.ts to avoid react-refresh warning
