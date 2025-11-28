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
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Get initial session with error handling
    supabase.auth.getSession()
      .then(({ data, error }: { data: { session: Session | null } | null; error: unknown }) => {
        const session = data?.session ?? null;
        if (error) {
          console.error('Error getting session:', error);
          // If 403 Forbidden, try to refresh the session
          if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
            // Try to refresh the session
            supabase.auth.refreshSession()
              .then(({ data: refreshData, error: refreshError }) => {
                if (refreshError || !refreshData.session) {
                  // If refresh fails, clear session
                  if (mounted) {
                    setSession(null);
                    setUser(null);
                    setLoading(false);
                  }
                } else {
                  if (mounted) {
                    setSession(refreshData.session);
                    setUser(refreshData.session.user);
                    setLoading(false);
                  }
                }
              })
              .catch(() => {
                // If refresh fails, clear session
                if (mounted) {
                  setSession(null);
                  setUser(null);
                  setLoading(false);
                }
              });
            return;
          }
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
    } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check if user needs to complete profile (has no username)
        if (session?.user) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (!error && profile && (!profile.username || profile.username.trim() === '')) {
              // Check if user is a Google OAuth user (has provider metadata)
              const providers = session.user.app_metadata?.providers || [];
              if (providers.includes('google')) {
                setNeedsProfileCompletion(true);
              }
            } else {
              setNeedsProfileCompletion(false);
            }
          } catch (err) {
            console.error('Error checking profile completion:', err);
            setNeedsProfileCompletion(false);
          }
        } else {
          setNeedsProfileCompletion(false);
        }
        
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error };
    }
    return { data, error: null };
  };

  const signUp = async (email: string, password: string, displayName?: string, countyId?: string, cityId?: string, username?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          county_id: countyId,
          city_id: cityId,
          username: username?.toLowerCase(),
        },
      },
    });
    if (error) throw error;

    // Create profile in profiles table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          display_name: displayName || '',
          username: username?.toLowerCase() || '',
          county_id: countyId || null,
          city_id: cityId || null,
          bio: 'Pescar pasionat din România!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't throw error here as user is already created
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/email-confirmation`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }
      
      // OAuth redirect will happen, so we don't need to return anything
      return data;
    } catch (err: any) {
      console.error('Error in signInWithGoogle:', err);
      throw err;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      return { error };
    }
    return { error: null };
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
    needsProfileCompletion,
    setNeedsProfileCompletion,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Note: useAuth is exported from hooks/useAuth.ts to avoid react-refresh warning
