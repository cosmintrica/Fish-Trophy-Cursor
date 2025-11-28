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
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check if user needs to complete profile (has no username) - async, non-blocking
        // This is important because:
        // 1. Username is required for public profiles (/profile/:username)
        // 2. Users can login with username (not just email)
        // 3. Google OAuth users need a password to login without Google
        if (session?.user) {
          // Don't block loading, check in background after a short delay
          setTimeout(() => {
            if (!mounted) return;
            
            (async () => {
              try {
                // Check if user is a Google OAuth user (has provider metadata)
                const providers = session.user.app_metadata?.providers || [];
                const isGoogleOAuth = providers.includes('google');
                
                if (isGoogleOAuth) {
                  // For Google OAuth users, ALWAYS require profile completion (username + password)
                  // We can't directly check if password is set, so we'll always show the modal
                  // The modal will handle setting both username and password
                  const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .maybeSingle();
                  
                  if (!mounted) return; // Component unmounted, don't update state
                  
                  // Check if profile completion flag exists in user metadata
                  // If user has completed profile before, we can skip (but we'll still check)
                  const hasCompletedProfile = session.user.user_metadata?.profile_completed === true;
                  
                  // Always show modal for Google OAuth users to ensure password is set
                  // unless they've explicitly completed it before
                  if (!hasCompletedProfile) {
                    setNeedsProfileCompletion(true);
                  } else {
                    // Even if marked as completed, check if username exists
                    if (!error && profile && (!profile.username || profile.username.trim() === '')) {
                      setNeedsProfileCompletion(true);
                    } else {
                      setNeedsProfileCompletion(false);
                    }
                  }
                } else {
                  // For non-OAuth users, only check username
                  const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .maybeSingle();
                  
                  if (!mounted) return;
                  
                  if (!error && profile && (!profile.username || profile.username.trim() === '')) {
                    setNeedsProfileCompletion(true);
                  } else {
                    setNeedsProfileCompletion(false);
                  }
                }
              } catch (err) {
                console.error('Error checking profile completion:', err);
                if (mounted) {
                  setNeedsProfileCompletion(false);
                }
              }
            })();
          }, 500); // Small delay to not block initial render
        } else {
          setNeedsProfileCompletion(false);
        }
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
    // Prepare metadata - only include non-empty values
    const metadata: Record<string, string> = {};
    if (displayName) metadata.display_name = displayName;
    if (username) metadata.username = username.toLowerCase().trim();
    // Don't include county_id and city_id in metadata - they're not used by trigger
    // They can be updated later in the profile if needed
    
    console.log('Signing up user with metadata:', { email, hasDisplayName: !!displayName, hasUsername: !!username });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    
    if (error) {
      console.error('Signup error:', error);
      throw error;
    }

    // Profile is automatically created by database trigger (handle_new_user)
    // The trigger reads username, display_name, etc. from raw_user_meta_data
    // Additional fields (county_id, city_id) can be updated later if needed
    // We don't update here to avoid conflicts and API key issues
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
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
